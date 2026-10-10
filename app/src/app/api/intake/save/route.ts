import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFamilyAccess } from "@/lib/entitlements";
import { INTAKE_KINDS, type IntakeKind } from "@/lib/intake";
import { normalizeTime, setTime } from "@/lib/reminderTimes";
import { guessSubject } from "@/lib/schoolFeeds";

// 2026-10-10: save the suggestions a parent ticked in the review screen.
// POST { items: [{ title, date, startTime?, endTime?, kind, subject?, note?, childId? }] } → { saved }
// Tests/homework/school events → School · activities → Activities · the rest → a shared reminder.
const ADULT = ["OWNER", "PARENT", "ADULT"];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const uid = session?.user?.id;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const m = await prisma.householdMember.findFirst({
    where: { userId: uid },
    include: { household: { include: { familyTrial: true, members: { select: { userId: true } } } } },
  });
  if (!m || !ADULT.includes(m.role)) return NextResponse.json({ error: "Only adults can scan documents" }, { status: 403 });
  if (!hasFamilyAccess(m.household)) return NextResponse.json({ error: "Scanning is part of Pro", upgrade: true }, { status: 403 });

  const body = await req.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items.slice(0, 25) : null;
  if (!items?.length) return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
  const memberIds = new Set(m.household.members.map((x) => x.userId));

  let saved = 0;
  for (const it of items) {
    const title = typeof it?.title === "string" ? it.title.trim().slice(0, 120) : "";
    const date = typeof it?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(it.date) ? it.date : null;
    const kind: IntakeKind = (INTAKE_KINDS as string[]).includes(it?.kind) ? it.kind : "REMINDER";
    if (!title || !date || Number.isNaN(Date.parse(date))) continue;
    const childId = typeof it?.childId === "string" && memberIds.has(it.childId) ? it.childId : null;
    const note = typeof it?.note === "string" && it.note.trim() ? it.note.trim().slice(0, 1000) : null;
    const startTime = normalizeTime(it?.startTime);
    let endTime = startTime ? normalizeTime(it?.endTime) : null;
    if (startTime && endTime && endTime <= startTime) endTime = null;
    const day = new Date(date + "T10:00:00.000Z");
    const base = { name: title, userId: uid, householdId: m.householdId, recurrence: "ONCE" as const, date: day, visibility: "HOUSEHOLD" as const, note };

    const created = kind === "ACTIVITY"
      ? await prisma.reminder.create({ data: { ...base, category: "TRAINING", assignedTo: childId ?? uid, requiresApproval: false, reminderDaysBefore: 0 }, select: { id: true } })
      : kind === "REMINDER"
        ? await prisma.reminder.create({ data: { ...base, category: "OTHER", assignedTo: childId, reminderDaysBefore: 1 }, select: { id: true } })
        : await prisma.reminder.create({
            data: {
              ...base, category: "SCHOOL", assignedTo: childId ?? uid, requiresApproval: false, reminderDaysBefore: 1, showInCalendar: true,
              schoolKind: kind === "TEST" ? "TEST" : kind === "HOMEWORK" ? "HOMEWORK" : "OTHER",
              subject: guessSubject(typeof it?.subject === "string" ? it.subject : null, title),
            },
            select: { id: true },
          });
    if (startTime) await setTime(created.id, { startTime, endTime });
    saved++;
  }
  return NextResponse.json({ saved });
}
