// 2026-10-04: "Today / Tomorrow / On Friday / In 3 weeks" in the family's language.
import type { Messages } from "./messages";
import { DATE_LOCALES, type Locale } from "./config";

export function daysUntil(dateStr: string | Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function relativeDay(m: Messages, locale: Locale, dateStr: string | Date): string {
  const r = m.reminders.relative;
  const days = daysUntil(dateStr);
  if (days === 0) return r.today;
  if (days === 1) return r.tomorrow;
  if (days <= 6) return r.onWeekday(new Date(dateStr).toLocaleDateString(DATE_LOCALES[locale], { weekday: "long" }));
  if (days <= 13) return r.inDays(days);
  if (days <= 59) return r.inWeeks(Math.ceil(days / 7));
  return r.inMonths(Math.ceil(days / 30));
}
