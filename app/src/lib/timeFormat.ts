// 2026-10-07: client-safe helpers for the optional time of day on
// activities / reminders / school items (storage: lib/reminderTimes.ts).

export type ItemTime = { startTime?: string | null; endTime?: string | null };

/** "17:30" or "17:30–19:00"; "" when all day. */
export function formatTimeRange(t: ItemTime | null | undefined): string {
  if (!t?.startTime) return "";
  return t.endTime ? `${t.startTime}–${t.endTime}` : t.startTime;
}

/** Sort key: timed items first in clock order, all-day items last. */
export function timeSortKey(t: ItemTime | null | undefined): string {
  return t?.startTime ?? "99:99";
}
