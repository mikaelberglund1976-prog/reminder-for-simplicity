// 2026-10-10: birthdays (PRODUCT_SPEC 4b.33). Pure helpers, safe on client
// and server. A birthday is a BIRTHDAY reminder (YEARLY) plus a small meta row
// (lib/birthdays.ts) that says who it is for and, optionally, the birth year —
// that's what turns "Elsa" into "🎂 Elsa turns 13".

// 2026-10-10 (Mikael: "födelsedagar kan ju vara kompisar, husdjur"):
// FAMILY = a member of the household (personId set), the rest are people
// (and animals) outside it. Each one is for the whole family or one member (forPerson).
export const BIRTHDAY_KINDS = ["FAMILY", "RELATIVE", "FRIEND", "PET", "OTHER"] as const;
export type BirthdayKind = (typeof BIRTHDAY_KINDS)[number];
export const KIND_EMOJI: Record<BirthdayKind, string> = { FAMILY: "🎂", RELATIVE: "🎂", FRIEND: "🎈", PET: "🐾", OTHER: "🎂" };

export type BirthdayMeta = { personId: string | null; birthYear: number | null; kind?: BirthdayKind | null };

type Labels = { turns: (name: string, age: number, emoji?: string) => string; birthdayOf: (name: string, emoji?: string) => string };

/** Age reached on `occurrence`, or null without a (plausible) birth year. */
export function ageOn(birthYear: number | null | undefined, occurrence: Date): number | null {
  if (!birthYear) return null;
  const age = occurrence.getFullYear() - birthYear;
  return age > 0 && age < 130 ? age : null;
}

export function birthdayTitle(name: string, birthYear: number | null | undefined, occurrence: Date, l: Labels, kind?: BirthdayKind | null): string {
  const age = ageOn(birthYear, occurrence);
  const emoji = KIND_EMOJI[kind ?? "OTHER"] ?? "🎂";
  return age ? l.turns(name, age, emoji) : l.birthdayOf(name, emoji);
}

/**
 * The name to show for a reminder on one occurrence. Birthdays added on the
 * Birthdays page get "🎂 Elsa turns 13"; every other reminder (incl. old
 * BIRTHDAY reminders made in the plain reminder form) keeps its own name.
 */
export function reminderDisplayName(
  r: { name: string; category: string; birthday?: BirthdayMeta | null },
  occurrence: Date,
  l: Labels,
): string {
  if (r.category !== "BIRTHDAY" || !r.birthday) return r.name;
  return birthdayTitle(r.name, r.birthday.birthYear, occurrence, l, r.birthday.kind);
}

export function daysInMonth(month: number): number {
  // Leap year on purpose: 29 February is a valid birthday.
  return new Date(Date.UTC(2024, month, 0)).getUTCDate();
}

export function validMonthDay(month: unknown, day: unknown): month is number {
  return Number.isInteger(month) && Number.isInteger(day)
    && (month as number) >= 1 && (month as number) <= 12
    && (day as number) >= 1 && (day as number) <= daysInMonth(month as number);
}

/**
 * Next birthday on or after `from` (UTC day), stored as UTC midnight like the
 * rest of the reminders. 29 Feb falls on 28 Feb in other years.
 */
export function nextBirthdayDate(month: number, day: number, from: Date = new Date()): Date {
  const today = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  for (let y = from.getUTCFullYear(); y <= from.getUTCFullYear() + 1; y++) {
    const last = new Date(Date.UTC(y, month, 0)).getUTCDate();
    const d = Date.UTC(y, month - 1, Math.min(day, last));
    if (d >= today) return new Date(d);
  }
  return new Date(Date.UTC(from.getUTCFullYear() + 1, month - 1, day));
}
