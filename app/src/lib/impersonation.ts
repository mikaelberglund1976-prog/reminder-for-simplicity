// 2026-10-03 (Mikael: "som admin skulle gärna kunna göra impersonate … snabbt
// gå in på ett av mina barn för att se hur det ser ut"). The admin can view
// the app as someone in their own family, without that person's password.
//
// How: the JWT keeps the admin in realId/realEmail/realName and swaps
// id/email/name to the person viewed. Every API route already reads
// session.user.id, so the whole app simply *is* that person — including
// writes (ticking a chore ticks it as them). The admin's own admin pages
// stop working meanwhile (session.user.email isn't the admin's), which is
// intended. Ends with "Back to me" or by itself after 2 hours.
//
// Guard rails: started only through NextAuth's `update()` (signed cookie,
// server-side callback), only when the REAL identity is ADMIN_EMAIL, only
// for a member of the admin's own household, never another admin, never a
// deleted account. Every start/stop is logged.
import type { JWT } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "mikaelberglund1976@gmail.com").toLowerCase();
export const IMPERSONATION_MAX_MS = 2 * 60 * 60 * 1000;

export async function startImpersonation(token: JWT, targetId: string): Promise<JWT> {
  const realEmail = ((token.realEmail as string | undefined) ?? token.email ?? "").toLowerCase();
  const realId = (token.realId as string | undefined) ?? (token.id as string | undefined);
  if (!realId || realEmail !== ADMIN_EMAIL) {
    console.warn("[impersonation] refused: not admin", { realId });
    return token;
  }
  if (targetId === realId) return endImpersonation(token);

  const adminMembership = await prisma.householdMember.findFirst({ where: { userId: realId } });
  const target = await prisma.user.findFirst({
    where: { id: targetId, deletedAt: null },
    select: { id: true, email: true, name: true, householdMembers: { select: { householdId: true } } },
  });
  if (!adminMembership || !target || target.email.toLowerCase() === ADMIN_EMAIL
      || !target.householdMembers.some((m) => m.householdId === adminMembership.householdId)) {
    console.warn("[impersonation] refused: target not in admin's family", { realId, targetId });
    return token;
  }

  if (!token.realId) {
    token.realId = realId;
    token.realEmail = token.email;
    token.realName = token.name ?? null;
  }
  token.id = target.id;
  token.email = target.email;
  token.name = target.name;
  token.picture = null;
  token.impAt = Date.now();
  token.checkedAt = Date.now();
  console.info("[impersonation] start", { admin: realId, as: target.id });
  return token;
}

export function endImpersonation(token: JWT): JWT {
  if (!token.realId) return token;
  console.info("[impersonation] stop", { admin: token.realId, was: token.id });
  token.id = token.realId;
  token.email = token.realEmail as string;
  token.name = (token.realName as string | null) ?? null;
  delete token.realId;
  delete token.realEmail;
  delete token.realName;
  delete token.impAt;
  return token;
}
