// 2026-09-28 — the one place that decides what a household gets.
//
// FREE  : reminders, household sharing, ONE shared shopping list.
// TRIAL : everything, 14 days, once per household (started by an adult).
// PRO   : everything. Either the manual is_pro flag ("Pro forever", legacy /
//         friends & family) or proUntil in the future (granted by the admin
//         for N days today; set by Stripe once payments are added).
//
// Every API route that gates a family feature calls hasFamilyAccess(); the
// UI gets the same answer from describeAccess() via /api/family/trial and
// /api/household so the two can never disagree.

export const TRIAL_DAYS = 14;
export const FREE_SHOPPING_LISTS = 1;

type HouseholdLike = {
  is_pro?: boolean | null;
  proUntil?: Date | string | null;
  adFreeUntil?: Date | string | null;
  familyTrial?: { expiresAt: Date | string } | null;
};

export function hasPro(h: HouseholdLike | null | undefined, now = new Date()): boolean {
  if (!h) return false;
  if (h.is_pro) return true;
  return !!h.proUntil && new Date(h.proUntil) > now;
}

export function trialActive(h: HouseholdLike | null | undefined, now = new Date()): boolean {
  return !!h?.familyTrial && new Date(h.familyTrial.expiresAt) > now;
}

// Pro or an active trial — i.e. the full family feature set.
export function hasFamilyAccess(h: HouseholdLike | null | undefined, now = new Date()): boolean {
  return hasPro(h, now) || trialActive(h, now);
}

// Ads (2026-09-28): only adults in FREE households see sponsor slots.
// Children never do — targeted/profiled ads to minors are not allowed (DSA)
// and marketing aimed at children is restricted in Sweden.
export function adFree(h: HouseholdLike | null | undefined, now = new Date()): boolean {
  if (hasFamilyAccess(h, now)) return true;
  return !!h?.adFreeUntil && new Date(h.adFreeUntil) > now;
}

export function showsAds(h: HouseholdLike | null | undefined, isChild: boolean, now = new Date()): boolean {
  if (isChild) return false;
  return !adFree(h, now);
}

export type AccessPlan = "FREE" | "TRIAL" | "PRO";

export function describeAccess(h: (HouseholdLike & { proRequestedAt?: Date | string | null }) | null | undefined, now = new Date()) {
  const pro = hasPro(h, now);
  const trial = !pro && trialActive(h, now);
  const plan: AccessPlan = pro ? "PRO" : trial ? "TRIAL" : "FREE";
  const daysUntil = (d: Date | string | null | undefined) =>
    d ? Math.max(0, Math.ceil((new Date(d).getTime() - now.getTime()) / 86400000)) : null;
  return {
    plan,
    proForever: !!h?.is_pro,
    proUntil: h?.proUntil ? new Date(h.proUntil).toISOString() : null,
    proDaysLeft: !h?.is_pro ? daysUntil(h?.proUntil) : null,
    trialDaysLeft: trial ? daysUntil(h?.familyTrial?.expiresAt) : null,
    trialUsed: !!h?.familyTrial,
    canStartTrial: !pro && !h?.familyTrial,
    proRequested: !!h?.proRequestedAt && !pro,
    adFree: adFree(h, now),
  };
}
