import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findReminderFor } from "@/lib/reminderAccess";
import { getBirthdayRows, upsertBirthdayRow, deleteBirthdayRow } from "@/lib/birthdays";
import { nextBirthdayDate } from "@/lib/birthdayLabel";
import { parseBirthdayBody, audienceFields } from "../_shared";

// 2026-10-10: PATCH / DELETE one birthday (PRODUCT_SPEC 4b.33). Same edit
// rights as any shared reminder (lib/reminderAccess.ts): the creator, or an
// adult in the family. Editing an old BIRTHDAY reminder from the plain form
// turns it into a real birthday (adds the meta row).
export const dynamic = "force-dynamic";

async function editable(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized", status: 401 } as const;
  const found = await findReminderFor(session.user.id, id);
  if (!found || !found.canEdit || found.reminder.category !== "BIRTHDAY") return { error: "Not found", status: 404 } as const;
  return { reminder: found.reminder } as const;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const e = await editable(params.id);
  if ("error" in e) return NextResponse.json({ error: e.error }, { status: e.status });
  const row = (await getBirthdayRows([params.id])).get(params.id);
  const body = await req.json().catch(() => null);
  // The person a family birthday belongs to never changes; keep its name.
  const parsed = parseBirthdayBody({ ...(body ?? {}), personId: row?.personId ?? null, name: row?.personId ? e.reminder.name : body?.name });
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.input;
  const members = e.reminder.householdId
    ? await prisma.householdMember.findMany({ where: { householdId: e.reminder.householdId }, select: { userId: true, role: true } })
    : null;
  if (input.forPerson && !members?.some((m) => m.userId === input.forPerson)) input.forPerson = null;

  await prisma.reminder.update({
    where: { id: params.id },
    data: {
      name: input.name || e.reminder.name,
      recurrence: "YEARLY",
      date: nextBirthdayDate(input.month, input.day),
      reminderDaysBefore: input.daysBefore,
      ...audienceFields(input.forPerson, members),
      // A new date must be able to remind again this year.
      lastSentAt: null,
    },
  });
  await upsertBirthdayRow({
    reminderId: params.id,
    householdId: e.reminder.householdId,
    personId: row?.personId ?? null,
    birthMonth: input.month,
    birthDay: input.day,
    birthYear: input.year,
    kind: input.kind,
    forPerson: input.forPerson,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const e = await editable(params.id);
  if ("error" in e) return NextResponse.json({ error: e.error }, { status: e.status });
  await prisma.reminder.update({ where: { id: params.id }, data: { isActive: false } });
  await deleteBirthdayRow(params.id);
  return NextResponse.json({ ok: true });
}
