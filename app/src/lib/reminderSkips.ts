// 2026-10-17: remove ONE day from a recurring series (Mikael: "om man vill ta
// bort en mitt i en serie går det inte … man kanske inte kan en specifik dag
// och man vill inte behöva hantera hela serien").
//
// Storage — a self-creating side table (same pattern as reminder_times,
// OPERATIONS.md §5a), so a deploy needs no manual database step:
//   reminder_skips — one row per skipped day: ("reminderId", "day" YYYY-MM-DD).
// `day` is the occurrence's calendar day as the family sees it (the same
// `dateKey` the calendar grid uses). lib/recurrence.ts drops those days from
// every expansion, so the calendar, Home, the Tomorrow card, the ICS feed and
// the reminder e-mails all agree. Undo = delete the row.
import { prisma } from "@/lib/prisma";

let ensured: Promise<void> | null = null;
export function ensureReminderSkipsTable(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "reminder_skips" ("reminderId" TEXT NOT NULL, "day" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "reminder_skips_pkey" PRIMARY KEY ("reminderId", "day"))`
      );
    })().catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}

/** "2026-10-22" → itself; anything else → null. */
export function normalizeDay(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T12:00:00Z");
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : s;
}

export async function getSkips(ids: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (ids.length === 0) return map;
  try {
    await ensureReminderSkipsTable();
    const rows = await prisma.$queryRawUnsafe<{ reminderId: string; day: string }[]>(
      `SELECT "reminderId", "day" FROM "reminder_skips" WHERE "reminderId" = ANY($1::text[]) ORDER BY "day"`,
      ids
    );
    for (const r of rows) {
      const list = map.get(r.reminderId) ?? [];
      list.push(r.day);
      map.set(r.reminderId, list);
    }
  } catch (err) {
    // A failed lookup must never break a list — just show every day.
    console.error("reminder_skips read failed:", err);
  }
  return map;
}

/**
 * Applies `skipDate` / `unskipDate` (YYYY-MM-DD) from a PATCH body.
 * Returns true if the body asked for either, false if it didn't mention them.
 * Throws on an invalid date so the route can answer 400.
 */
export async function applySkipFromBody(reminderId: string, body: unknown): Promise<boolean> {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (!("skipDate" in b) && !("unskipDate" in b)) return false;
  await ensureReminderSkipsTable();
  if ("skipDate" in b) {
    const day = normalizeDay(b.skipDate);
    if (!day) throw new Error("Invalid date");
    await prisma.$executeRawUnsafe(
      `INSERT INTO "reminder_skips" ("reminderId", "day") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      reminderId, day
    );
  }
  if ("unskipDate" in b) {
    const day = normalizeDay(b.unskipDate);
    if (!day) throw new Error("Invalid date");
    await prisma.$executeRawUnsafe(`DELETE FROM "reminder_skips" WHERE "reminderId" = $1 AND "day" = $2`, reminderId, day);
  }
  return true;
}
