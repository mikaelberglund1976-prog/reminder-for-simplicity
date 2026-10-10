// 2026-10-10: birthdays (PRODUCT_SPEC 4b.33). Mikael: "Födelsedagar har vi
// inte med" — the plain reminder form had a BIRTHDAY category, but it knew
// nothing about who it was for or how old they turn.
//
// A birthday is stored as an ordinary Reminder (category BIRTHDAY, recurrence
// YEARLY, visibility HOUSEHOLD) so the calendar, the ICS feed, Home and the
// daily email cron all pick it up with no special casing. This side table
// adds what a reminder can't hold:
//   personId   — the family member it belongs to (null = a relative/friend)
//   birthMonth / birthDay — the real date (the reminder's `date` is rolled
//                forward every year by the cron, and 29 Feb becomes 28 Feb)
//   birthYear  — optional; gives "turns 13". Never required (GDPR: less
//                sensitive without it, especially for children).
//   kind       — FAMILY / RELATIVE / FRIEND / PET / OTHER (Mikael: "kan ju
//                vara kompisar, husdjur"); forPerson = who it's for (null = whole family).
// Created on first use (CREATE TABLE IF NOT EXISTS) — no manual migration.
import { prisma } from "@/lib/prisma";
import { BIRTHDAY_KINDS, type BirthdayKind, type BirthdayMeta } from "@/lib/birthdayLabel";

export type BirthdayRow = {
  reminderId: string;
  householdId: string | null;
  personId: string | null;
  birthMonth: number;
  birthDay: number;
  birthYear: number | null;
  kind: BirthdayKind;
  forPerson: string | null;
};

let ensured: Promise<void> | null = null;
export function ensureBirthdaysTable(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "birthdays" ("reminderId" TEXT NOT NULL, "householdId" TEXT, "personId" TEXT, "birthMonth" INTEGER NOT NULL, "birthDay" INTEGER NOT NULL, "birthYear" INTEGER, "kind" TEXT NOT NULL DEFAULT 'OTHER', "forPerson" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "birthdays_pkey" PRIMARY KEY ("reminderId"))`
      );
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "birthdays_household" ON "birthdays" ("householdId")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "birthdays_person" ON "birthdays" ("personId")`);
    })().catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}

export async function getBirthdayRows(reminderIds: string[]): Promise<Map<string, BirthdayRow>> {
  const out = new Map<string, BirthdayRow>();
  if (reminderIds.length === 0) return out;
  await ensureBirthdaysTable();
  const rows = await prisma.$queryRawUnsafe<BirthdayRow[]>(
    `SELECT "reminderId", "householdId", "personId", "birthMonth", "birthDay", "birthYear", "kind", "forPerson" FROM "birthdays" WHERE "reminderId" = ANY($1::text[])`,
    reminderIds
  );
  for (const r of rows) out.set(r.reminderId, { ...r, birthMonth: Number(r.birthMonth), birthDay: Number(r.birthDay), birthYear: r.birthYear == null ? null : Number(r.birthYear), kind: (BIRTHDAY_KINDS as readonly string[]).includes(r.kind) ? r.kind : (r.personId ? "FAMILY" : "OTHER") });
  return out;
}

/** Adds `birthday: { personId, birthYear } | null` to every item (only BIRTHDAY reminders can have one). */
export async function withBirthdays<T extends { id: string; category: string }>(items: T[]): Promise<(T & { birthday: BirthdayMeta | null })[]> {
  const ids = items.filter((i) => i.category === "BIRTHDAY").map((i) => i.id);
  let rows = new Map<string, BirthdayRow>();
  try { rows = await getBirthdayRows(ids); } catch (err) { console.error("Birthday meta lookup failed:", err); }
  return items.map((i) => {
    const r = rows.get(i.id);
    return { ...i, birthday: r ? { personId: r.personId, birthYear: r.birthYear, kind: r.kind } : null };
  });
}

export async function upsertBirthdayRow(row: BirthdayRow) {
  await ensureBirthdaysTable();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "birthdays" ("reminderId", "householdId", "personId", "birthMonth", "birthDay", "birthYear", "kind", "forPerson") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT ("reminderId") DO UPDATE SET "householdId" = EXCLUDED."householdId", "personId" = EXCLUDED."personId", "birthMonth" = EXCLUDED."birthMonth", "birthDay" = EXCLUDED."birthDay", "birthYear" = EXCLUDED."birthYear", "kind" = EXCLUDED."kind", "forPerson" = EXCLUDED."forPerson"`,
    row.reminderId, row.householdId, row.personId, row.birthMonth, row.birthDay, row.birthYear, row.kind, row.forPerson
  );
}

export async function deleteBirthdayRow(reminderId: string) {
  await ensureBirthdaysTable();
  await prisma.$executeRawUnsafe(`DELETE FROM "birthdays" WHERE "reminderId" = $1`, reminderId);
}

/** Birthday of a family member already saved? (one per person) */
export async function birthdayForPerson(householdId: string, personId: string): Promise<string | null> {
  await ensureBirthdaysTable();
  const rows = await prisma.$queryRawUnsafe<{ reminderId: string }[]>(
    `SELECT b."reminderId" FROM "birthdays" b JOIN "reminders" r ON r."id" = b."reminderId" WHERE b."householdId" = $1 AND b."personId" = $2 AND r."isActive" = true LIMIT 1`,
    householdId, personId
  );
  return rows[0]?.reminderId ?? null;
}

/** Relatives (accepted wishlist guests with an account) of a child — they get the birthday reminder too. */
export async function wishlistGuestsOf(householdId: string, childId: string): Promise<{ userId: string; email: string; name: string | null }[]> {
  try {
    const { ensureGuestTable } = await import("@/lib/wishlistGuests");
    await ensureGuestTable();
    return await prisma.$queryRawUnsafe<{ userId: string; email: string; name: string | null }[]>(
      `SELECT u."id" AS "userId", u."email", u."name" FROM "wishlist_guests" g JOIN "users" u ON u."id" = g."userId"
       WHERE g."householdId" = $1 AND g."childId" = $2 AND g."userId" IS NOT NULL AND u."deletedAt" IS NULL`,
      householdId, childId
    );
  } catch (err) {
    console.error("Wishlist guests lookup failed:", err);
    return [];
  }
}
