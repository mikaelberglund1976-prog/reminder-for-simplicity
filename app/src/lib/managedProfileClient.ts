// Client-safe twin of lib/managedProfile.ts (no Node crypto import).
export const MANAGED_EMAIL_DOMAIN = "no-login.invalid";
export function isManagedEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${MANAGED_EMAIL_DOMAIN}`);
}
