// 2026-09-29: one place for "this person joins a family through an invite".
// Used by the email invite link (/api/household/join), automatic join on
// sign-in (lib/auth.ts, email/password and Google) and sign-up
// (/api/auth/register).
//
// Why: a child can end up with their own account before a parent adds them
// (signed up themselves, or tapped "Continue with Google"). A parent adding
// that email as a child now sends an invite instead of failing with "email
// already used"; accepting it moves the account into the family AS A CHILD
// (isChildProfile), so they only see their own things.
import { prisma } from "@/lib/prisma";

type InviteRow = { id: string; householdId: string; role: string | null };

/** A valid (unused, unexpired) invite for this email, newest first. */
export async function findPendingInvite(email: string) {
  return prisma.householdInvite.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" }, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Moves the user into the invite's household with the invite's role and
 * marks the invite used. Someone a family invited doesn't also need admin
 * approval — the inviting parent vouches for them.
 */
export async function joinHouseholdWithInvite(userId: string, invite: InviteRow) {
  const role = (invite.role ?? "MEMBER") as "OWNER" | "PARENT" | "ADULT" | "CHILD" | "MEMBER";

  const old = await prisma.householdMember.findMany({ where: { userId } });
  await prisma.householdMember.deleteMany({ where: { userId } });

  await prisma.householdMember.create({
    data: { householdId: invite.householdId, userId, role },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      approved: true,
      approvedAt: new Date(),
      ...(role === "CHILD" ? { isChildProfile: true } : {}),
    },
  });

  await prisma.householdInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });

  // Tidy up: a household the person was alone in (e.g. the one created
  // automatically at their first Google sign-in) is left empty — remove it,
  // but only if nothing else points at it.
  for (const m of old) {
    if (m.householdId === invite.householdId) continue;
    const left = await prisma.householdMember.count({ where: { householdId: m.householdId } });
    if (left > 0) continue;
    const [reminders, shopping, wishes] = await Promise.all([
      prisma.reminder.count({ where: { householdId: m.householdId } }),
      prisma.shoppingListItem.count({ where: { householdId: m.householdId } }),
      prisma.wishlistItem.count({ where: { householdId: m.householdId } }),
    ]);
    if (reminders + shopping + wishes > 0) continue;
    await prisma.household.delete({ where: { id: m.householdId } }).catch(() => {});
  }
}

/** For sign-in/sign-up: join a pending invite if there is one. Never throws. */
export async function autoJoinPendingInvite(userId: string, email: string) {
  try {
    const invite = await findPendingInvite(email);
    if (invite) await joinHouseholdWithInvite(userId, invite);
    return !!invite;
  } catch (err) {
    console.error("Auto-join invite error:", err);
    return false;
  }
}
