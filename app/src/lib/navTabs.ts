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

export const NAV_APPS = ["calendar", "shopping-list", "wishlist", "chores", "training", "school"] as const;
export type NavApp = (typeof NAV_APPS)[number];

export const DEFAULT_NAV_APPS: NavApp[] = ["calendar", "shopping-list", "school"];
export const MIN_NAV_APPS = 3;
export const MAX_NAV_APPS = 4;

function isNavApp(k: string): k is NavApp {
  return (NAV_APPS as readonly string[]).includes(k);
}

export function parseNavTabs(saved: string | null | undefined): NavApp[] {
  if (!saved) return [...DEFAULT_NAV_APPS];
  let keys: string[];
  if (saved.startsWith("v2:")) {
    keys = saved.slice(3).split(",");
  } else {
    // legacy: Calendar was always there, first; "reminders" is now the fixed Home tab
    keys = ["calendar", ...saved.split(",").filter((k) => k !== "reminders")];
  }
  const out: NavApp[] = [];
  for (const k of keys) if (isNavApp(k) && !out.includes(k)) out.push(k);
  for (const d of DEFAULT_NAV_APPS) if (out.length < MIN_NAV_APPS && !out.includes(d)) out.push(d);
  return out.slice(0, MAX_NAV_APPS);
}

export function serializeNavTabs(keys: readonly string[]): string {
  return "v2:" + keys.filter(isNavApp).join(",");
}
