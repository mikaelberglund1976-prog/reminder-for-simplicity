// 2026-10-04 — the one list of what Free and Pro include. Used by the plans
// page in the app (/upgrade) and the public pages (/ and /features) so they
// can't drift apart again (before this, /features still said 7-day trial,
// shopping list = Pro and calendar sync = Pro). Must match lib/entitlements.ts.
//
// Decisions: release 2026-09-28; 2026-10-04 Mikael: calendar sync stays Free
// for now.

import { TRIAL_DAYS } from "@/lib/entitlements";

export const PRO_PRICE = { month: 49, year: 399, currency: "SEK" } as const;
export const PRO_PRICE_TEXT = `SEK ${PRO_PRICE.month}/month or SEK ${PRO_PRICE.year}/year`;
export const TRIAL_TEXT = `${TRIAL_DAYS} days free`;

// 2026-10-04: `key` points at messages.plans.rows[key] (label + detail in the
// family's language); `label`/`detail` here are the English originals.
export type PlanRow = { key: string; icon: string; label: string; detail: string; free: boolean | string; pro: boolean | string };

export const PLAN_ROWS: PlanRow[] = [
  { key: "reminders", icon: "🔔", label: "Reminders", detail: "Bills, subscriptions, birthdays, insurance — email before it's due.", free: true, pro: true },
  { key: "family", icon: "👪", label: "Shared family", detail: "Invite the other adults. Choose what's private and what's shared.", free: true, pro: true },
  { key: "shopping", icon: "🛒", label: "Shared shopping list", detail: "Everyone adds, ticks off in the shop. Share a link with anyone.", free: "oneList", pro: "unlimited" },
  { key: "calendar", icon: "📅", label: "Calendar + sync to your phone", detail: "Everything with a date on one calendar, also in Google, Outlook or Apple Calendar.", free: true, pro: true },
  { key: "children", icon: "🧒", label: "Child accounts", detail: "Each child gets their own login and their own week.", free: false, pro: true },
  { key: "chores", icon: "🧹", label: "Chores", detail: "Recurring chores per child, ticked off by them, approved by you.", free: false, pro: true },
  { key: "school", icon: "📚", label: "Homework & tests", detail: "Per child, on Home and in the calendar. Import from SchoolSoft.", free: false, pro: true },
  { key: "activities", icon: "🎯", label: "Activities", detail: "Football on Tuesdays, music on Thursdays — per child.", free: false, pro: true },
  { key: "wishlists", icon: "🎁", label: "Wishlists", detail: "Kids add what they want; adults reserve without spoiling the surprise.", free: false, pro: true },
  { key: "noAds", icon: "✨", label: "No ads", detail: "Free shows one small sponsored card to adults. Children never see ads.", free: false, pro: true },
];
