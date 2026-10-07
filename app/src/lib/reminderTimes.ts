// 2026-10-07: time of day for activities, reminders and school items
// (Mikael: "går att lägga datum men inte vilken tid").
//
// Storage — a self-creating side table (same pattern as media_images and
// school_feeds, OPERATIONS.md §5a), so a deploy needs no manual database
// step and the `reminders` table / Prisma schema stays untouched:
//   reminder_times — one row per reminder that has a time. No row = all day.
//     startTime "HH:MM" (wall-clock time in the family's time zone),
//     endTime   "HH:MM" or NULL (used by activities: "17:30–19:00").
// Plain wall-clock strings on purpose: a weekly activity at 17:30 stays 17:30
// across daylight-saving changes, and `reminders.date` keeps its existing
// day-only meaning everywhere else (recurrence, cron e-mails, calendar grid).
import { prisma } from "@/lib/prisma";
import type { ItemTime } from "@/lib/timeFormat";

export type StoredTime = { startTime: string | null; endTime: string | null };

let ensured: Promise<void> | null = null;
export function ensureReminderTimesTable(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "reminder_times" ("reminderId" TEXT NOT NULL, "startTime" TEXT NOT NULL, "endTime" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "reminder_times_pkey" PRIMARY KEY ("reminderId"))`
      );
    })().catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}

/** "9:05" / "09:05" → "09:05"; anything else (incl. "", null) → null. */
export function normalizeTime(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/**
 * Reads startTime/endTime from a request body. undefined = the body doesn't
 * mention times (leave unchanged); otherwise the normalized pair, where
 * startTime null means "all day". An end time not after the start is dropped.
 */
export function timesFromBody(body: unknown): StoredTime | undefined {
  if (!body || typeof body !== "object") return undefined;
  const b = body as Record<string, unknown>;
  if (!("startTime" in b) && !("endTime" in b)) return undefined;
  const startTime = normalizeTime(b.startTime);
  let endTime = startTime ? normalizeTime(b.endTime) : null;
  if (startTime && endTime && endTime <= startTime) endTime = null;
  return { startTime, endTime };
}

export async function getTimes(ids: string[]): Promise<Map<string, StoredTime>> {
  const map = new Map<string, StoredTime>();
  if (ids.length === 0) return map;
  try {
    await ensureReminderTimesTable();
    const rows = await prisma.$queryRawUnsafe<{ reminderId: string; startTime: string; endTime: string | null }[]>(
      `SELECT "reminderId", "startTime", "endTime" FROM "reminder_times" WHERE "reminderId" = ANY($1::text[])`,
      ids
    );
    for (const r of rows) map.set(r.reminderId, { startTime: r.startTime, endTime: r.endTime });
  } catch (err) {
    // A missing time must never break a list — fall back to "all day".
    console.error("reminder_times read failed:", err);
  }
  return map;
}

/** Adds startTime/endTime (null = all day) to each item. */
export async function withTimes<T extends { id: string }>(items: T[]): Promise<(T & StoredTime)[]> {
  const map = await getTimes(items.map((i) => i.id));
  return items.map((i) => ({ ...i, startTime: map.get(i.id)?.startTime ?? null, endTime: map.get(i.id)?.endTime ?? null }));
}

export async function setTime(reminderId: string, time: ItemTime): Promise<void> {
  await ensureReminderTimesTable();
  if (!time.startTime) {
    await prisma.$executeRawUnsafe(`DELETE FROM "reminder_times" WHERE "reminderId" = $1`, reminderId);
    return;
  }
  await prisma.$executeRawUnsafe(
    `INSERT INTO "reminder_times" ("reminderId", "startTime", "endTime", "updatedAt") VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT ("reminderId") DO UPDATE SET "startTime" = EXCLUDED."startTime", "endTime" = EXCLUDED."endTime", "updatedAt" = CURRENT_TIMESTAMP`,
    reminderId, time.startTime, time.endTime ?? null
  );
}
