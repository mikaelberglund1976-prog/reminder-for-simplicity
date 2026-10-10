import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBirthdayRows, upsertBirthdayRow, birthdayForPerson } from "@/lib/birthdays";
import { nextBirthdayDate } from "@/lib/birthdayLabel";
import { ADULT, parseBirthdayBody, firstName, audienceFields } from "./_shared";

// 2026-10-10: birthdays (PRODUCT_SPEC 4b.33) — free for everyone.
// GET  → { canEdit, hasHousehold, members, birthdays }
// POST { name?, month, day, year?, personId?, daysBefore?, kind?, forPerson? } → creates one
// A birthday = a BIRTHDAY/YEARLY reminder shared with the family + a row in
// "birthdays" (lib/birthdays.ts). Adults add anyone; children add their own
// friends, pets and relatives (not family members) and can change what they added.
// forPerson = who it's for (null = the whole family), see audienceFields().
export const dynamic = "force-dynamic";

async function me() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const membership = await prisma.householdMember.findFirst({
    where: { userId: session.user.id },
    include: { household: { include: { members: { include: { user: { select: { id: true, name: true, email: true, deletedAt: true } } } } } } },
  });
  return { userId: session.user.id, membership };
}

export async function GET() {
  const who = await me();
  if (!who) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId, membership } = who;
  const isAdult = !membership || ADULT.includes(membership.role);

  const reminders = await prisma.reminder.findMany({
    where: {
      isActive: true,
      category: "BIRTHDAY",
      OR: membership
        ? [
            { userId },
            { householdId: membership.householdId, assignedTo: userId },
            { householdId: membership.householdId, visibility: { in: (isAdult ? ["HOUSEHOLD", "PARENTS"] : ["HOUSEHOLD"]) as ("HOUSEHOLD" | "PARENTS")[] }, userId: { not: userId } },
          ]
        : [{ userId }],
    },
    select: { id: true, name: true, date: true, reminderDaysBefore: true, userId: true, visibility: true },
  });
  const rows = await getBirthdayRows(reminders.map((r) => r.id));

  const members = (membership?.household.members ?? [])
    .filter((m) => !m.user.deletedAt)
    .map((m) => ({ userId: m.userId, role: m.role, name: firstName(m.user) }));

  const birthdays = reminders.map((r) => {
    const row = rows.get(r.id);
    const d = new Date(r.date);
    const month = row?.birthMonth ?? d.getUTCMonth() + 1;
    const day = row?.birthDay ?? d.getUTCDate();
    return {
      id: r.id,
      name: r.name,
      month, day,
      birthYear: row?.birthYear ?? null,
      personId: row?.personId ?? null,
      kind: row?.kind ?? "OTHER",
      forPerson: row?.forPerson ?? null,
      daysBefore: r.reminderDaysBefore,
      nextDate: nextBirthdayDate(month, day).toISOString(),
      // A BIRTHDAY reminder made in the plain reminder form before this page existed.
      legacy: !row,
      canEdit: r.userId === userId || (isAdult && !!membership && r.visibility !== "PRIVATE"),
    };
  }).sort((a, b) => a.nextDate.localeCompare(b.nextDate) || a.name.localeCompare(b.name));

  return NextResponse.json({ canEdit: isAdult, me: userId, hasHousehold: !!membership, members, birthdays });
}

export async function POST(req: Request) {
  const who = await me();
  if (!who) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId, membership } = who;
  const isAdult = !membership || ADULT.includes(membership.role);

  const parsed = parseBirthdayBody(await req.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.input;
  if (!isAdult && input.personId) return NextResponse.json({ error: "Only adults can add family birthdays" }, { status: 403 });
  if (input.forPerson && !membership?.household.members.some((m) => m.userId === input.forPerson)) input.forPerson = null;

  let name = input.name;
  if (input.personId) {
    const person = membership?.household.members.find((m) => m.userId === input.personId && !m.user.deletedAt);
    if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (await birthdayForPerson(membership!.householdId, input.personId)) {
      return NextResponse.json({ error: "exists" }, { status: 409 });
    }
    name = firstName(person.user);
  }

  const reminder = await prisma.reminder.create({
    data: {
      userId,
      householdId: membership?.householdId ?? null,
      name,
      category: "BIRTHDAY",
      recurrence: "YEARLY",
      date: nextBirthdayDate(input.month, input.day),
      reminderDaysBefore: input.daysBefore,
      ...audienceFields(input.forPerson, membership?.household.members ?? null),
    },
  });
  await upsertBirthdayRow({
    reminderId: reminder.id,
    householdId: membership?.householdId ?? null,
    personId: input.personId,
    birthMonth: input.month,
    birthDay: input.day,
    birthYear: input.year,
    kind: input.kind,
    forPerson: input.forPerson,
  });
  return NextResponse.json({ ok: true, id: reminder.id }, { status: 201 });
}
