// 2026-10-09: child profiles without their own login ("managed" profiles).
// Persona review: a 7-year-old has no email, but the family still wants
// their chores, school and activities in the app. The decision "no PIN-only
// login for children" stands — a managed child does not log in at all; the
// parents see and tick things for them. The User row still needs a unique
// email, so it gets a placeholder on the reserved `.invalid` TLD (RFC 2606),
// which can never receive mail. lib/email.ts skips every send to it.
// A parent can later give the child a real email (PATCH child-profiles/[id]),
// which turns it into a normal child account with a setup link.
import { randomBytes } from "crypto";

export const MANAGED_EMAIL_DOMAIN = "no-login.invalid";

export function newManagedEmail(): string {
  return `child-${randomBytes(9).toString("hex")}@${MANAGED_EMAIL_DOMAIN}`;
}

export function isManagedEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${MANAGED_EMAIL_DOMAIN}`);
}
