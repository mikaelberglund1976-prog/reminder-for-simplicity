// 2026-10-10: shared bits for /api/family/birthdays (PRODUCT_SPEC 4b.33).
import { validMonthDay, BIRTHDAY_KINDS, type BirthdayKind } from "@/lib/birthdayLabel";

export const ADULT = ["OWNER", "PARENT", "ADULT"];
export const REMIND_OPTIONS = [0, 1, 3, 7, 14];

export type BirthdayInput = { name: string; month: number; day: number; year: number | null; personId: string | null; daysBefore: number; kind: BirthdayKind; forPerson: string | null };

/** Validates a POST/PATCH body. Returns an error key from messages.birthdays or the clean input. */
export function parseBirthdayBody(body: unknown): { error: "invalidDate" | "nameRequired" } | { input: BirthdayInput } {
  const b = (body ?? {}) as Record<string, unknown>;
  const month = Number(b.month), day = Number(b.day);
  if (!validMonthDay(month, day)) return { error: "invalidDate" };
  const thisYear = new Date().getUTCFullYear();
  let year: number | null = null;
  if (b.year !== null && b.year !== undefined && b.year !== "") {
    const y = Number(b.year);
    if (!Number.isInteger(y) || y < 1900 || y > thisYear) return { error: "invalidDate" };
    year = y;
  }
  const name = typeof b.name === "string" ? b.name.trim().slice(0, 80) : "";
  const personId = typeof b.personId === "string" && b.personId ? b.personId : null;
  if (!name && !personId) return { error: "nameRequired" };
  const d = Number(b.daysBefore);
  const daysBefore = REMIND_OPTIONS.includes(d) ? d : 7;
  // A family member's birthday is always FAMILY; otherwise the picked kind.
  const k = typeof b.kind === "string" ? b.kind : "";
  const kind: BirthdayKind = personId ? "FAMILY"
    : (BIRTHDAY_KINDS as readonly string[]).includes(k) && k !== "FAMILY" ? (k as BirthdayKind) : "OTHER";
  // 2026-10-10 (Mikael: "varje födelsedag kan vara intressant för alla eller bara en person"):
  // null = the whole family, otherwise one member.
  const forPerson = typeof b.forPerson === "string" && b.forPerson ? b.forPerson : null;
  return { input: { name, month, day, year, personId, daysBefore, kind, forPerson } };
}

/**
 * Who sees a birthday, expressed with the reminder's own fields so every
 * existing list (Home, calendar, ICS, /api/reminders) follows it:
 *   whole family  → HOUSEHOLD
 *   one child     → PARENTS + assignedTo child (the child and the adults)
 *   one adult     → PRIVATE + assignedTo adult (the adult, plus whoever added it)
 *   no family     → PRIVATE
 */
export function audienceFields(forPerson: string | null, members: { userId: string; role: string }[] | null) {
  if (!members) return { visibility: "PRIVATE" as const, assignedTo: null };
  const p = forPerson ? members.find((m) => m.userId === forPerson) : null;
  if (!p) return { visibility: "HOUSEHOLD" as const, assignedTo: null };
  return p.role === "CHILD"
    ? { visibility: "PARENTS" as const, assignedTo: p.userId }
    : { visibility: "PRIVATE" as const, assignedTo: p.userId };
}

export function firstName(u: { name: string | null; email: string }): string {
  return u.name?.trim().split(" ")[0] || u.email.split("@")[0];
}
