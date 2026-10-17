// Bottom nav choice per person (User.bottomNavTabs).
// 2026-10-03 (Mikael): Home is now the fixed, leftmost tab; Calendar became
// one of the apps you can pick. Before this, Calendar was fixed first and
// "reminders" (= Home) was a pickable app.
//
// Stored format:
//   "v2:calendar,shopping-list,school"  — new format, exactly what's shown after Home
//   "reminders,shopping-list,school"    — legacy (before 2026-10-03): Calendar was
//                                          implicit first, "reminders" was Home
// No backfill needed — legacy values are converted on read.

// 2026-10-18 (Navigation 2.0): Home | 3 picks | More. Reminders, Birthdays and
// Trips can be picked too. Exactly 3 are shown; a person who had picked 4
// before keeps their first 3 in the bar (the 4th is always under More) — the
// saved value itself is never rewritten until they change it.
export const NAV_APPS = ["calendar", "shopping-list", "wishlist", "chores", "training", "school", "reminders", "birthdays", "trips"] as const;
export type NavApp = (typeof NAV_APPS)[number];

export const DEFAULT_NAV_APPS: NavApp[] = ["calendar", "shopping-list", "school"];
// 2026-10-04 (Mikael): a child who hasn't picked anything gets
// Home, Calendar, School, Activities. Chores live on the child's Home.
export const DEFAULT_CHILD_NAV_APPS: NavApp[] = ["calendar", "school", "training"];
export const CHILD_NAV_APPS: NavApp[] = ["calendar", "shopping-list", "wishlist", "training", "school", "birthdays", "trips"];
export const MIN_NAV_APPS = 3;
export const MAX_NAV_APPS = 3;

function isNavApp(k: string): k is NavApp {
  return (NAV_APPS as readonly string[]).includes(k);
}

export function parseNavTabs(saved: string | null | undefined, isChild = false): NavApp[] {
  const defaults = isChild ? DEFAULT_CHILD_NAV_APPS : DEFAULT_NAV_APPS;
  // Children's nav ignored their saved choice before 2026-10-04, so only a
  // choice saved in the new format counts as theirs.
  if (!saved || (isChild && !saved.startsWith("v2:"))) return [...defaults];
  let keys: string[];
  if (saved.startsWith("v2:")) {
    keys = saved.slice(3).split(",");
  } else {
    // legacy: Calendar was always there, first; "reminders" is now the fixed Home tab
    keys = ["calendar", ...saved.split(",").filter((k) => k !== "reminders")];
  }
  const out: NavApp[] = [];
  for (const k of keys) if (isNavApp(k) && !out.includes(k) && (!isChild || CHILD_NAV_APPS.includes(k))) out.push(k);
  for (const d of defaults) if (out.length < MIN_NAV_APPS && !out.includes(d)) out.push(d);
  return out.slice(0, MAX_NAV_APPS);
}

export function serializeNavTabs(keys: readonly string[]): string {
  return "v2:" + keys.filter(isNavApp).join(",");
}
