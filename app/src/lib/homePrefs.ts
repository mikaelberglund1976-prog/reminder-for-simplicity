// 2026-10-09 (Mikael: "Under settings skulle man vilja kunna styra vad man ska
// se på startsidan"): what the adult Home shows, chosen per person under
// Settings → Home. Client-safe (no server imports) — storage is in
// lib/homePrefsStore.ts, the API in /api/profile/home-prefs.

export const HOME_SECTIONS = ["family", "today", "quick", "comingUp", "perChild", "stats", "chores", "reminders"] as const;
export type HomeSection = (typeof HOME_SECTIONS)[number];

export const PER_CHILD_KINDS = ["tests", "homework", "activities", "schoolOther"] as const;
export type PerChildKind = (typeof PER_CHILD_KINDS)[number];

export type HomePrefs = {
  sections: Record<HomeSection, boolean>;
  perChild: Record<PerChildKind, boolean>;
  /** Items per child in "Next up per child". */
  perChildCount: number;
  /** Children left out of "Next up per child". */
  hiddenChildren: string[];
};

export const PER_CHILD_COUNTS = [2, 3, 5] as const;

export const DEFAULT_HOME_PREFS: HomePrefs = {
  sections: { family: true, today: true, quick: true, comingUp: true, perChild: true, stats: true, chores: true, reminders: true },
  perChild: { tests: true, homework: true, activities: true, schoolOther: false },
  perChildCount: 3,
  hiddenChildren: [],
};

/** Anything (stored JSON, request body) → complete, valid prefs. */
export function normalizeHomePrefs(raw: unknown): HomePrefs {
  const out: HomePrefs = JSON.parse(JSON.stringify(DEFAULT_HOME_PREFS));
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;
  const sec = r.sections as Record<string, unknown> | undefined;
  if (sec && typeof sec === "object") for (const k of HOME_SECTIONS) if (typeof sec[k] === "boolean") out.sections[k] = sec[k] as boolean;
  const pc = r.perChild as Record<string, unknown> | undefined;
  if (pc && typeof pc === "object") for (const k of PER_CHILD_KINDS) if (typeof pc[k] === "boolean") out.perChild[k] = pc[k] as boolean;
  if (typeof r.perChildCount === "number" && (PER_CHILD_COUNTS as readonly number[]).includes(r.perChildCount)) out.perChildCount = r.perChildCount;
  if (Array.isArray(r.hiddenChildren)) out.hiddenChildren = r.hiddenChildren.filter((v): v is string => typeof v === "string").slice(0, 20);
  return out;
}
