// 2026-10-04: dates and numbers in the family's language. Use these instead of
// hard-coding "en-GB" / "sv" in toLocaleDateString, so a new language just works.
import { DATE_LOCALES, type Locale } from "./config";

type DateInput = Date | string | number;

export function formatDate(locale: Locale, d: DateInput, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(DATE_LOCALES[locale], opts);
}

export function formatTime(locale: Locale, d: DateInput, opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" }): string {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(DATE_LOCALES[locale], opts);
}

export function formatNumber(locale: Locale, n: number, opts?: Intl.NumberFormatOptions): string {
  return n.toLocaleString(DATE_LOCALES[locale], opts);
}

/** Weekday name for 0 = Sunday … 6 = Saturday, in the given language. */
export function weekdayName(locale: Locale, day: number, style: "short" | "long" | "narrow" = "short"): string {
  // 2026-01-04 was a Sunday.
  const d = new Date(2026, 0, 4 + day);
  const s = d.toLocaleDateString(DATE_LOCALES[locale], { weekday: style });
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/\.$/, "");
}
