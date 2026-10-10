// 2026-10-10 (Mikael: "Här skulle man själv kunna förändra färgerna som pro
// medlem. Barn ett blå, barn 2 gul, prov röd osv."): the family's own colours
// for each kind of thing (reminder, chore, activity, homework, test) and for
// each person (avatar + calendar). Shared by the whole household, edited by
// an adult in a Pro/trial family under Settings → Colours. Client-safe — the
// storage is in lib/familyColorsStore.ts, the API in /api/household/colors.
//
// Only overrides are stored: an empty object = the app's built-in colours,
// exactly as before, so nothing changes for families who never touch this.

export const COLOR_KINDS = ["reminder", "chore", "training", "homework", "test"] as const;
export type ColorKind = (typeof COLOR_KINDS)[number];

/** The built-in colours (same values the calendar has always used). */
export const DEFAULT_KIND_COLORS: Record<ColorKind, string> = {
  reminder: "#5A6080",
  chore: "#0E9F8E",
  training: "#D85A30",
  homework: "#3730A3",
  test: "#B4235A",
};

/** Built-in person palette — a person without a chosen colour gets a stable one from here. */
export const PERSON_PALETTE = ["#C24F26", "#C4367A", "#1E7D52", "#D85A30", "#6A44CC", "#0E9F8E", "#B45309", "#3730A3"];

/** Swatches offered in the picker. All readable with white text on top (calendar chips). */
export const SWATCHES = [
  "#2563EB", // blå
  "#0EA5E9", // himmelsblå
  "#3730A3", // indigo
  "#7C3AED", // lila
  "#C4367A", // rosa
  "#DC2626", // röd
  "#B4235A", // vinröd
  "#EA580C", // orange
  "#CA8A04", // gul (mörk nog för vit text)
  "#65A30D", // lime
  "#16A34A", // grön
  "#0E9F8E", // turkos
  "#5A6080", // grå
  "#78350F", // brun
];

export type CalendarColorBy = "kind" | "person";

export type FamilyColors = {
  kinds: Partial<Record<ColorKind, string>>;
  members: Record<string, string>;
  /** What the calendar chips are coloured by. */
  calendarBy: CalendarColorBy;
};

export const EMPTY_FAMILY_COLORS: FamilyColors = { kinds: {}, members: {}, calendarBy: "kind" };

const HEX = /^#[0-9a-fA-F]{6}$/;
export function isHex(v: unknown): v is string { return typeof v === "string" && HEX.test(v); }

/** Anything (stored JSON, request body) → complete, valid colours. */
export function normalizeFamilyColors(raw: unknown): FamilyColors {
  const out: FamilyColors = { kinds: {}, members: {}, calendarBy: "kind" };
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;
  const k = r.kinds as Record<string, unknown> | undefined;
  if (k && typeof k === "object") for (const key of COLOR_KINDS) if (isHex(k[key])) out.kinds[key] = (k[key] as string).toUpperCase();
  const m = r.members as Record<string, unknown> | undefined;
  if (m && typeof m === "object") {
    for (const [id, c] of Object.entries(m).slice(0, 30)) if (typeof id === "string" && id.length <= 64 && isHex(c)) out.members[id] = c.toUpperCase();
  }
  if (r.calendarBy === "person") out.calendarBy = "person";
  return out;
}

export function kindColor(c: FamilyColors | null | undefined, kind: ColorKind): string {
  return c?.kinds[kind] ?? DEFAULT_KIND_COLORS[kind];
}

export function defaultPersonColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PERSON_PALETTE[h % PERSON_PALETTE.length];
}

export function personColor(c: FamilyColors | null | undefined, id: string): string {
  return c?.members[id] ?? defaultPersonColor(id);
}
