// Expands a reminder/chore's single stored `date` + `recurrence` into every
// occurrence that falls inside a given date range. Built for the calendar
// view (dashboard/calendar) — nowhere else in the app needs multiple
// occurrences at once; everywhere else only cares about the *next*
// occurrence, which is just the stored `date` itself once it's in the future.
//
// Recurrence rules (mirrors the `Recurrence` enum in schema.prisma):
//   ONCE    - a single occurrence, exactly on `date`.
//   DAILY   - every day from `date` onward.
//   WEEKLY  - every 7 days from `date` onward (same weekday).
//   MONTHLY - same day-of-month as `date`, every month onward. If a month is
//             shorter than that day-of-month (e.g. 31 in April), clamps to
//             the last day of that month instead of skipping it.
//   YEARLY  - same month + day as `date`, every year onward. Feb 29 clamps
//             to Feb 28 on non-leap years.
//
// `choreRecurrenceDays` (chores only) overrides DAILY/WEEKLY entirely with an
// explicit set of weekdays (e.g. "1,2,3,4,5" = Mon-Fri), using JS
// `Date#getDay()` numbering (0 = Sunday ... 6 = Saturday) — same convention
// the chore creation form already uses.

export type RecurrenceRule = "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface RecurringItem {
  date: string; // ISO date string the item starts on
  recurrence: RecurrenceRule;
  choreRecurrenceDays?: string | null;
}

function atMidnight(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function dateKeyLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Every occurrence of `item` that falls within [rangeStart, rangeEnd], inclusive (both normalised to midnight). */
export function getOccurrencesInRange(item: RecurringItem, rangeStart: Date, rangeEnd: Date): Date[] {
  const start = atMidnight(new Date(item.date));
  const from = atMidnight(rangeStart);
  const to = atMidnight(rangeEnd);
  if (Number.isNaN(start.getTime()) || to < start) return [];

  const occurrences: Date[] = [];

  const explicitDays = item.choreRecurrenceDays
    ? item.choreRecurrenceDays.split(",").map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n))
    : null;

  if (explicitDays && explicitDays.length > 0) {
    const cursor = new Date(Math.max(start.getTime(), from.getTime()));
    while (cursor <= to) {
      if (explicitDays.includes(cursor.getDay())) occurrences.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return occurrences;
  }

  switch (item.recurrence) {
    case "ONCE": {
      if (start >= from && start <= to) occurrences.push(start);
      break;
    }
    case "DAILY": {
      const cursor = new Date(Math.max(start.getTime(), from.getTime()));
      while (cursor <= to) {
        occurrences.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      break;
    }
    case "WEEKLY": {
      const cursor = new Date(start);
      if (cursor < from) {
        const diffDays = Math.ceil((from.getTime() - cursor.getTime()) / 86400000);
        const weeks = Math.ceil(diffDays / 7);
        cursor.setDate(cursor.getDate() + weeks * 7);
      }
      while (cursor <= to) {
        occurrences.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 7);
      }
      break;
    }
    case "MONTHLY": {
      const day = start.getDate();
      const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
      while (cursor <= to) {
        const clampedDay = Math.min(day, daysInMonth(cursor.getFullYear(), cursor.getMonth()));
        const occ = new Date(cursor.getFullYear(), cursor.getMonth(), clampedDay);
        if (occ >= start && occ >= from && occ <= to) occurrences.push(occ);
        cursor.setMonth(cursor.getMonth() + 1);
      }
      break;
    }
    case "YEARLY": {
      const month = start.getMonth();
      const day = start.getDate();
      for (let year = from.getFullYear(); year <= to.getFullYear(); year++) {
        const clampedDay = Math.min(day, daysInMonth(year, month));
        const occ = new Date(year, month, clampedDay);
        if (occ >= start && occ >= from && occ <= to) occurrences.push(occ);
      }
      break;
    }
  }

  return occurrences;
}

/** `YYYY-MM-DD` key in local time — safe to use as a map key / cell lookup, avoids UTC-shift bugs from `toISOString()`. */
export const dateKey = dateKeyLocal;
