// 2026-10-25 (masterbrief §22, Etapp 0 G5): roles in one place.
//
//   OWNER     family admin (Owner/Admin in the brief)
//   PARENT    parent / guardian — full family access
//   ADULT     "Annan vuxen" — full family access, exactly as before. Every
//             existing adult keeps this; nothing about it changes.
//   CAREGIVER NEW: "Barnvakt / släkt" — limited adult (grandparent, babysitter,
//             bonus parent who shouldn't see everything). Sees the family's
//             shared calendar, school, activities and lists and can tick things
//             off, but does NOT see "parents only" reminders or amounts, and
//             can't manage the family, calendar links, child profiles or plans.
//             Only someone explicitly invited as CAREGIVER gets it.
//   CHILD     child account
//   MEMBER    legacy, treated like ADULT where it was before
//
// A CAREGIVER is deliberately NOT in any of the existing "adult" lists
// (["OWNER","PARENT","ADULT"]) — that is what keeps it limited without
// touching each route — and it is not CHILD either, so child-only screens and
// rules don't apply to it.
import { prisma } from "@/lib/prisma";

export const FULL_ADULT_ROLES = ["OWNER", "PARENT", "ADULT"] as const;
export const isCaregiver = (role: string | null | undefined) => role === "CAREGIVER";

let ensured: Promise<void> | null = null;
/**
 * Adds CAREGIVER to the database's HouseholdRole enum the first time it's
 * needed (an enum value is additive: no existing row changes). Must run before
 * a CAREGIVER is written.
 */
export function ensureCaregiverRole(): Promise<void> {
  if (!ensured) {
    ensured = prisma
      .$executeRawUnsafe(`ALTER TYPE "HouseholdRole" ADD VALUE IF NOT EXISTS 'CAREGIVER'`)
      .then(() => undefined)
      .catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}
