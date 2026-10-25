import { NextResponse } from "next/server";
import { trackServer } from "@/lib/analyticsStore";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markActivityImport } from "@/lib/activityFeeds";
import { findReminderFor } from "@/lib/reminderAccess";
import { getTimes, timesFromBody, setTime } from "@/lib/reminderTimes";
import { getSkips, applySkipFromBody } from "@/lib/reminderSkips";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.enum(["SUBSCRIPTION", "BIRTHDAY", "INSURANCE", "CONTRACT", "HEALTH", "BILL", "OTHER"]).optional(),
  date: z.string().datetime().optional(),
  recurrence: z.enum(["ONCE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).optional(),
  amount: z.number().positive().optional().nullable(),
  currency: z.string().max(3).optional(),
  note: z.string().max(500).optional().nullable(),
  reminderDaysBefore: z.number().int().min(0).max(30).optional(),
  visibility: z.enum(["PRIVATE", "HOUSEHOLD", "PARENTS"]).optional(),
});

// GET /api/reminders/[id] – Hämta en specifik reminder
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }

  const found = await findReminderFor(session.user.id, params.id);
  if (!found) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  const t = (await getTimes([found.reminder.id])).get(found.reminder.id);
  const skipDates = (await getSkips([found.reminder.id])).get(found.reminder.id) ?? [];
  return NextResponse.json({ ...found.reminder, startTime: t?.startTime ?? null, endTime: t?.endTime ?? null, skipDates, canEdit: found.canEdit });
}

// DELETE /api/reminders/[id] – Ta bort en reminder (soft delete)
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }

  const found = await findReminderFor(session.user.id, params.id);

  if (!found || !found.canEdit) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  await prisma.reminder.update({
    where: { id: params.id },
    data: { isActive: false },
  });
  // 2026-10-09: a removed calendar-imported activity stays removed on the next sync.
  await markActivityImport(params.id, "hidden");

  return NextResponse.json({ success: true });
}

// PATCH /api/reminders/[id] – Uppdatera en reminder
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }

  const found = await findReminderFor(session.user.id, params.id);

  // 2026-10-25 (Etapp 0 G6): PATCH { done: true | false } — tick a one-off
  // reminder off as done (or undo). Allowed for whoever may edit it AND for the
  // person it's assigned to (they're the one who does it).
  const peek = await req.clone().json().catch(() => null);
  if (found && typeof peek?.done === "boolean") {
    const r = found.reminder;
    if (!found.canEdit && r.assignedTo !== session.user.id) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    if (r.recurrence !== "ONCE" || ["CHORE", "TRAINING", "SCHOOL", "BIRTHDAY"].includes(r.category as string)) {
      return NextResponse.json({ error: "Only one-off reminders can be ticked off" }, { status: 400 });
    }
    const completedAt = peek.done ? new Date() : null;
    await prisma.reminder.update({ where: { id: r.id }, data: { completedAt } });
    const m = r.householdId ? await prisma.householdMember.findFirst({ where: { userId: session.user.id, householdId: r.householdId }, select: { role: true } }) : null;
    await trackServer("reminder_done", { undo: !peek.done }, { householdId: r.householdId, userId: session.user.id, isChild: m?.role === "CHILD" });
    return NextResponse.json({ id: r.id, completedAt });
  }

  if (!found || !found.canEdit) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  try {
    const body = await req.json();
    // 2026-10-17: `skipDate` / `unskipDate` removes or restores ONE day of a
    // recurring series without touching the rest (lib/reminderSkips.ts).
    try {
      if (await applySkipFromBody(params.id, body)) {
        const skipDates = (await getSkips([params.id])).get(params.id) ?? [];
        return NextResponse.json({ success: true, skipDates });
      }
    } catch {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    const data = updateSchema.parse(body); // zod strips startTime/endTime
    const time = timesFromBody(body);

    // Hantera visibility och householdId
    // Pro-kravet borttaget 2026-08-02 (se PRODUCT_SPEC.md §7.2, samma
    // ändring som POST /api/reminders) — dela en reminder inom hushållet är
    // nu gratis för alla.
    let householdId: string | null | undefined = undefined; // undefined = behåll befintligt
    if (data.visibility !== undefined) {
      if (data.visibility === "PRIVATE") {
        householdId = null;
      } else {
        const membership = await prisma.householdMember.findFirst({
          where: { userId: session.user.id },
        });
        householdId = membership ? membership.householdId : null;
      }
    }

    const updated = await prisma.reminder.update({
      where: { id: params.id },
      data: {
        ...data,
        ...(data.date ? { date: new Date(data.date) } : {}),
        ...(householdId !== undefined ? { householdId } : {}),
      },
    });

    if (time) await setTime(params.id, time);
    const t = (await getTimes([params.id])).get(params.id);
    return NextResponse.json({ ...updated, startTime: t?.startTime ?? null, endTime: t?.endTime ?? null });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Update reminder error:", error);
    return NextResponse.json({ error: "Något gick fel." }, { status: 500 });
  }
}
