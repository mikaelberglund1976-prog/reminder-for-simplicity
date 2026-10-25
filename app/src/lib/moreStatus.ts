"use client";

// 2026-10-24 (new More sheet): the short live status under each row in More
// ("3 today · 7 this week", "8 items left", "Tyra in 8 days" …).
//
// Rules from the brief:
// - Only existing data: every number comes from the same GET endpoints the
//   pages themselves use. No endpoint exists only for More.
// - Never in the way: More renders at once with the plain rows; statuses fill
//   in when they arrive. Each source fails on its own — a failed fetch just
//   means that row shows its name only (no placeholder, no error).
// - Cheap to reopen: results are kept for 60 s in memory, so opening More
//   twice in a row shows the statuses immediately.
import { getOccurrencesInRange, dateKey, type RecurringItem } from "@/lib/recurrence";
import { shortTitle } from "@/lib/displayTitle";

export type MoreStatusKey =
  | "calendar" | "reminders" | "school" | "activities" | "chores"
  | "shopping" | "birthdays" | "wishlist" | "trips";

/** What a row shows: a short line of text, and — only where a number needs acting on — a badge. */
export type MoreStatus = { text?: string; badge?: number; badgeLabel?: string };
export type MoreStatuses = Partial<Record<MoreStatusKey, MoreStatus>>;

type Texts = {
  calendar: (today: number, week: number) => string;
  active: (n: number) => string;
  overdue: (n: number) => string;
  choresLeft: (n: number) => string;
  itemsLeft: (n: number) => string;
  wishes: (n: number) => string;
  today: string;
  tomorrow: string;
  bday: (name: string, days: number) => string;
  tripNow: (name: string) => string;
  tripIn: (name: string, days: number) => string;
};
type Fmt = {
  texts: Texts;
  /** "fre", "Fri" */
  weekday: (d: Date) => string;
  /** "dec", "Dec" */
  month: (d: Date) => string;
  schoolKind: (k: string) => string;
};

type Item = RecurringItem & {
  id: string; name: string; startTime?: string | null; endTime?: string | null; note?: string | null;
  schoolKind?: string | null; subject?: string | null; completedAt?: string | null; showInCalendar?: boolean;
  completions?: unknown[]; assignedUser?: { id: string; name: string | null; email?: string } | null;
};

const TTL_MS = 60_000;
let cache: { at: number; isChild: boolean; data: MoreStatuses } | null = null;

/** Statuses from the last 60 s, if any — shown straight away when More opens. */
export function cachedMoreStatuses(isChild: boolean): MoreStatuses | null {
  if (cache && cache.isChild === isChild && Date.now() - cache.at < TTL_MS) return cache.data;
  return null;
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

function midnight(d: Date) { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; }
function addDays(d: Date, n: number) { const c = new Date(d); c.setDate(c.getDate() + n); return c; }
function daysFromToday(d: Date) { return Math.round((midnight(d).getTime() - midnight(new Date()).getTime()) / 86_400_000); }
function nowHm() { const n = new Date(); return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`; }

/** "i dag" / "i morgon" / "fre" — plus the time when there is one. */
function when(d: Date, time: string | null | undefined, f: Fmt) {
  const days = daysFromToday(d);
  const day = days === 0 ? (time ? "" : f.texts.today) : days === 1 ? f.texts.tomorrow : f.weekday(d);
  return [day, time ?? ""].filter(Boolean).join(" ");
}

function locationOf(note: string | null | undefined): string | null {
  // Imported club events keep their place as "📍 Sundbyberg" in the note (lib/activityFeeds.ts).
  const m = note ? /📍\s*([^\n]+)/.exec(note) : null;
  return m ? m[1].trim().slice(0, 40) : null;
}

/** Loads every status in parallel. Missing or failed sources are simply left out. */
export async function loadMoreStatuses(isChild: boolean, f: Fmt, onPartial?: (s: MoreStatuses) => void): Promise<MoreStatuses> {
  const t = f.texts;
  const out: MoreStatuses = {};
  const today = midnight(new Date());
  const todayKey = dateKey(today);
  // Monday–Sunday, the same week the chores and the calendar use.
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  const sunday = addDays(monday, 6);

  const [reminders, chores, trainings, school, birthdays, trips, shopLists, wishLists] = await Promise.all([
    getJson<Item[]>("/api/reminders"),
    isChild ? Promise.resolve(null) : getJson<{ chores: Item[] }>("/api/family/chores?category=CHORE"),
    getJson<{ chores: Item[] }>("/api/family/chores?category=TRAINING"),
    getJson<{ chores: Item[] }>("/api/family/chores?category=SCHOOL"),
    getJson<{ birthdays: { name: string; nextDate: string }[] }>("/api/family/birthdays"),
    getJson<{ trips: { name: string; destination: string | null; startYmd: string; endYmd: string; daysTo: number }[] }>("/api/trips"),
    getJson<{ lists: { id: string }[] }>("/api/family/lists?kind=SHOPPING"),
    getJson<{ lists: { id: string }[] }>("/api/family/lists?kind=WISHLIST"),
  ]);

  const rem = Array.isArray(reminders) ? reminders : null;
  const choreList = chores?.chores ?? null;
  const trainList = trainings?.chores ?? null;
  const schoolList = (school?.chores ?? null)?.filter((s) => s.showInCalendar !== false) ?? null;

  // Calendar: what the calendar itself shows today and this week.
  const calSources = [rem, choreList, trainList, schoolList].filter((x): x is Item[] => !!x);
  if (calSources.length > 0) {
    let todayN = 0;
    let weekN = 0;
    for (const list of calSources) {
      for (const it of list) {
        for (const occ of getOccurrencesInRange(it, monday, sunday)) {
          weekN++;
          if (dateKey(occ) === todayKey) todayN++;
        }
      }
    }
    const text = t.calendar(todayN, weekN);
    if (text) out.calendar = { text };
  }

  // Reminders: the same "active" and "overdue" as the Reminders page; only overdue earns a badge.
  if (rem && !isChild && rem.length > 0) {
    // Same rule as the Reminders page (getDaysUntil(r.date) < 0).
    const overdue = rem.filter((r) => midnight(new Date(r.date)) < today).length;
    out.reminders = { text: t.active(rem.length), ...(overdue > 0 ? { badge: overdue, badgeLabel: t.overdue(overdue) } : {}) };
  }

  // School: the next test or homework not yet ticked off, two weeks ahead.
  if (schoolList) {
    const horizon = addDays(today, 14);
    const next = schoolList
      .filter((s) => !s.completedAt && (s.schoolKind === "TEST" || s.schoolKind === "HOMEWORK"))
      .map((s) => ({ s, d: midnight(new Date(s.date)) }))
      .filter(({ d }) => d >= today && d <= horizon)
      .sort((a, b) => a.d.getTime() - b.d.getTime() || (a.s.schoolKind === "TEST" ? -1 : 1))[0];
    if (next) {
      const kids = new Set(schoolList.map((s) => s.assignedUser?.id).filter(Boolean));
      const who = !isChild && kids.size > 1 ? next.s.assignedUser?.name?.split(" ")[0] : null;
      const what = `${f.schoolKind(next.s.schoolKind ?? "OTHER")} ${next.s.subject || shortTitle(next.s.name)}`;
      out.school = { text: `${who ? who + ": " : ""}${what} · ${when(next.d, next.s.startTime, f)}` };
    }
  }

  // Activities: the next one that hasn't finished yet, two weeks ahead.
  if (trainList) {
    const horizon = addDays(today, 14);
    const hm = nowHm();
    let best: { it: Item; d: Date } | null = null;
    for (const it of trainList) {
      for (const d of getOccurrencesInRange(it, today, horizon)) {
        if (dateKey(d) === todayKey && it.startTime && (it.endTime ?? it.startTime) < hm) continue; // already over today
        const key = `${dateKey(d)} ${it.startTime ?? "99:99"}`;
        const bestKey = best ? `${dateKey(best.d)} ${best.it.startTime ?? "99:99"}` : null;
        if (!bestKey || key < bestKey) best = { it, d };
        break; // first remaining occurrence of this activity is enough
      }
    }
    if (best) {
      const place = locationOf(best.it.note);
      out.activities = { text: [`${shortTitle(best.it.name)} ${when(best.d, best.it.startTime, f)}`.trim(), place].filter(Boolean).join(" · ") };
    }
  }

  // Chores: the ones not done yet this week (same count as the Chores page).
  if (choreList && choreList.length > 0) {
    const left = choreList.filter((c) => !c.completions || c.completions.length === 0).length;
    if (left > 0) out.chores = { text: t.choresLeft(left) };
  }

  // Birthdays: the next one, when it's within two months.
  const nextBday = birthdays?.birthdays?.[0];
  if (nextBday) {
    const days = daysFromToday(new Date(nextBday.nextDate));
    if (days >= 0 && days <= 60) out.birthdays = { text: t.bday(nextBday.name, days) };
  }

  // Trips: the one going on now, or the next one.
  const todayYmd = todayKey;
  const trip = (trips?.trips ?? []).filter((x) => x.endYmd >= todayYmd).sort((a, b) => a.startYmd.localeCompare(b.startYmd))[0];
  if (trip) {
    const name = trip.destination || trip.name;
    out.trips = {
      text: trip.startYmd <= todayYmd ? t.tripNow(name)
        : trip.daysTo <= 30 ? t.tripIn(name, trip.daysTo)
        : `${name} · ${f.month(new Date(trip.startYmd + "T12:00:00"))}`,
    };
  }

  onPartial?.({ ...out });

  // Shopping list: items not yet bought on the list the shopping page opens (the first one).
  const shopId = shopLists?.lists?.[0]?.id;
  // Wishlists: wishes on every list this person can see (at most 8 lists).
  const wishIds = (wishLists?.lists ?? []).slice(0, 8).map((l) => l.id);
  const [shopItems, ...wishItems] = await Promise.all([
    shopId ? getJson<{ items: { isPurchased: boolean }[] }>(`/api/family/shopping-list?listId=${shopId}`) : Promise.resolve(null),
    ...wishIds.map((id) => getJson<{ items?: unknown[] }>(`/api/family/wishlist?listId=${id}`)),
  ]);
  const left = shopItems?.items?.filter((i) => !i.isPurchased).length ?? 0;
  if (left > 0) out.shopping = { text: t.itemsLeft(left) };
  const wishes = wishItems.reduce((n, w) => n + (Array.isArray(w?.items) ? w!.items!.length : 0), 0);
  if (wishes > 0) out.wishlist = { text: t.wishes(wishes) };

  cache = { at: Date.now(), isChild, data: out };
  return out;
}
