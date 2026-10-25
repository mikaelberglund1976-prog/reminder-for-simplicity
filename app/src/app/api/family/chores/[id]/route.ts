import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTimes, setTime, timesFromBody } from "@/lib/reminderTimes";
import { activityImportInfo, markActivityImport, setActivityPerson } from "@/lib/activityFeeds";
import { getSkips, applySkipFromBody } from "@/lib/reminderSkips";

// 2026-10-07 (Mikael: "när man går in på alla aktiviteter kunna uppdatera
// dem"): edit an existing activity (TRAINING) or chore (CHORE). Before this
// the only way to change one was to delete it and create it again.
//
// Who may edit: any non-child member of the household (same rule as
// creating/removing). A child may edit their own activity (assigned to them)
// but not move it to someone else, and can't edit chores (that would let a
// child switch off "needs approval").

const EDITABLE = ["CHORE", "TRAINING"];
const RECURRENCES = ["ONCE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;

async function load(id: string, userId: string) {
  const item = await prisma.reminder.findFirst({ where: { id, isActive: true } });
  if (!item || !EDITABLE.includes(item.category as string) || !item.householdId) return { error: 404 as const };
  const membership = await prisma.householdMember.findFirst({ where: { userId, householdId: item.householdId } });
  if (!membership) return { error: 404 as const };
  const isChild = membership.role === "CHILD";
  if (isChild && (item.category !== "TRAINING" || item.assignedTo !== userId)) return { error: 403 as const };
  // 2026-10-25 (G5): a caregiver (limited adult) doesn't change the family's
  // chores or activities (ticking a chore off is a separate route).
  if (membership.role === "CAREGIVER" && item.userId !== userId) return { error: 403 as const };
  return { item, isChild };
}

// GET /api/family/chores/[id] — the item with its time, for the edit form.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const res = await load(params.id, session.user.id);
  if ("error" in res) return NextResponse.json({ error: res.error === 403 ? "Not allowed" : "Not found" }, { status: res.error });
  const t = (await getTimes([res.item.id])).get(res.item.id);
  const skipDates = (await getSkips([res.item.id])).get(res.item.id) ?? [];
  // 2026-10-25 (Etapp 0 G2): which calendar link an imported activity came from.
  const source = res.item.category === "TRAINING" ? (await activityImportInfo([res.item.id])).get(res.item.id) ?? null : null;
  return NextResponse.json({ ...res.item, startTime: t?.startTime ?? null, endTime: t?.endTime ?? null, skipDates, canChangePerson: !res.isChild, source });
}

// PATCH /api/family/chores/[id]
// Body (all optional): name, assignedTo, recurrence, recurrenceDays,
// startDate (ISO), requiresApproval (chores), note, startTime, endTime
// ("HH:MM" or null = all day; activities only).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const res = await load(params.id, session.user.id);
    if ("error" in res) return NextResponse.json({ error: res.error === 403 ? "Not allowed" : "Not found" }, { status: res.error });
    const { item, isChild } = res;

    const body = await req.json().catch(() => ({}));
    // 2026-10-17: remove/restore ONE day of a recurring activity or chore.
    try {
      if (await applySkipFromBody(item.id, body)) {
        const skipDates = (await getSkips([item.id])).get(item.id) ?? [];
        return NextResponse.json({ success: true, skipDates });
      }
    } catch {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    const data: {
      name?: string; assignedTo?: string; recurrence?: (typeof RECURRENCES)[number];
      choreRecurrenceDays?: string | null; date?: Date; requiresApproval?: boolean; note?: string | null;
    } = {};

    if (typeof body?.name === "string") {
      if (!body.name.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
      data.name = body.name.trim().slice(0, 200);
    }
    if (typeof body?.assignedTo === "string" && body.assignedTo !== item.assignedTo) {
      if (isChild) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
      const target = await prisma.householdMember.findFirst({ where: { householdId: item.householdId!, userId: body.assignedTo } });
      if (!target) return NextResponse.json({ error: "Pick someone in your family" }, { status: 400 });
      data.assignedTo = body.assignedTo;
    }
    if (RECURRENCES.includes(body?.recurrence)) data.recurrence = body.recurrence;
    if (body?.recurrenceDays !== undefined) {
      if (body.recurrenceDays === null || body.recurrenceDays === "") data.choreRecurrenceDays = null;
      else if (typeof body.recurrenceDays === "string" && /^[0-6](,[0-6])*$/.test(body.recurrenceDays)) data.choreRecurrenceDays = body.recurrenceDays;
      else return NextResponse.json({ error: "Pick at least one day" }, { status: 400 });
    }
    if (typeof body?.startDate === "string") {
      const d = new Date(body.startDate);
      if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
      data.date = d;
    }
    if (item.category === "CHORE" && typeof body?.requiresApproval === "boolean") data.requiresApproval = body.requiresApproval;
    if (body?.note !== undefined) data.note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 1000) : null;

    const time = item.category === "TRAINING" ? timesFromBody(body) : undefined;
    if (Object.keys(data).length === 0 && !time) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    // 2026-10-25 (Etapp 0 G1): the edit form sends every field on save. Work
    // out what really changed, so that moving an imported activity to another
    // person doesn't stop its calendar link from updating it. Unchanged fields
    // aren't written at all.
    let contentChanged = false;
    let timeToWrite = time;
    if (item.category === "TRAINING") {
      const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
      if (data.name !== undefined && data.name === item.name) delete data.name;
      if (data.note !== undefined && (data.note ?? null) === (item.note ?? null)) delete data.note;
      if (data.recurrence !== undefined && data.recurrence === item.recurrence) delete data.recurrence;
      if (data.choreRecurrenceDays !== undefined && (data.choreRecurrenceDays ?? null) === (item.choreRecurrenceDays ?? null)) delete data.choreRecurrenceDays;
      if (data.date !== undefined && ymd(data.date) === ymd(item.date)) delete data.date;
      if (time) {
        const cur = (await getTimes([item.id])).get(item.id);
        if ((cur?.startTime ?? null) === (time.startTime ?? null) && (cur?.endTime ?? null) === (time.endTime ?? null)) timeToWrite = undefined;
      }
      contentChanged = Object.keys(data).some((k) => k !== "assignedTo") || !!timeToWrite;
    }

    const updated = Object.keys(data).length > 0
      ? await prisma.reminder.update({ where: { id: item.id }, data })
      : item;
    if (item.category === "TRAINING") {
      if (timeToWrite) await setTime(item.id, timeToWrite);
      // 2026-10-09: an activity from a calendar link that's changed here is no
      // longer overwritten by the next sync. 2026-10-25: only a real content
      // change counts — a new person is remembered and the sync keeps going.
      if (contentChanged) await markActivityImport(item.id, "edited");
      if (data.assignedTo) await setActivityPerson(item.id, data.assignedTo);
    } else if (time) await setTime(item.id, time);
    const t = (await getTimes([item.id])).get(item.id);
    return NextResponse.json({ ...updated, startTime: t?.startTime ?? null, endTime: t?.endTime ?? null });
  } catch (err) {
    console.error("Chore PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
