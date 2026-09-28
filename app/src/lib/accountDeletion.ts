// 2026-09-27: soft delete with a 60-day restore window.
//
// Mikael's rules:
//  - Deleting your account goes to the family admin for approval. If you ARE
//    the family admin (or alone), you just confirm ("Are you sure?").
//  - Once deleted the person is hidden from the family, but the account is
//    kept for 60 days so it can be restored if someone gets in touch.
//  - After 60 days it's removed for real (lib/cron.ts → purgeExpiredAccounts).
import { prisma } from "@/lib/prisma";
import { sendAccountDeletedEmail, sendDeletionRequestEmail } from "@/lib/email";

export const RESTORE_WINDOW_DAYS = 60;
const APP_URL = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const ADULT_ROLES = ["OWNER", "PARENT", "ADULT", "MEMBER"];

export function purgeDateFor(deletedAt: Date) {
  return new Date(deletedAt.getTime() + RESTORE_WINDOW_DAYS * 86400000);
}

export type DeletionPlan =
  | { mode: "confirm"; promoteUserId?: string; promoteName?: string | null }
  | { mode: "request"; approvers: { id: string; name: string | null; email: string }[] }
  | { mode: "blocked"; reason: string };

// Works out what happens when `userId` asks to delete their account.
export async function planDeletion(userId: string): Promise<DeletionPlan> {
  const membership = await prisma.householdMember.findFirst({ where: { userId } });
  if (!membership) return { mode: "confirm" };

  const members = await prisma.householdMember.findMany({
    where: { householdId: membership.householdId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  });
  const others = members.filter((m) => m.userId !== userId);
  if (others.length === 0) return { mode: "confirm" };

  // Family admin = OWNER (fallback: PARENT, for older households without one).
  let approvers = members.filter((m) => m.role === "OWNER");
  if (approvers.length === 0) approvers = members.filter((m) => m.role === "PARENT");
  const isAdmin = approvers.some((m) => m.userId === userId);

  if (!isAdmin) {
    const list = approvers.filter((m) => m.userId !== userId);
    if (list.length === 0) return { mode: "confirm" };
    return { mode: "request", approvers: list.map((m) => m.user) };
  }

  // The admin is leaving: someone else must take over the family.
  const otherAdmins = approvers.filter((m) => m.userId !== userId);
  if (otherAdmins.length > 0) return { mode: "confirm" };
  const nextAdult = others.find((m) => ADULT_ROLES.includes(m.role));
  if (nextAdult) return { mode: "confirm", promoteUserId: nextAdult.userId, promoteName: nextAdult.user.name };
  return {
    mode: "blocked",
    reason: "You're the only adult in the family. Delete the child accounts first (Family → the child → Delete), or invite another adult to take over as family admin.",
  };
}

export async function requestDeletion(userId: string, approvers: { id: string; name: string | null; email: string }[]) {
  const user = await prisma.user.update({ where: { id: userId }, data: { deletionRequestedAt: new Date() } });
  for (const a of approvers) {
    await sendDeletionRequestEmail({
      to: a.email, adminName: a.name, memberName: user.name, familyUrl: `${APP_URL}/profile`,
    }).catch((e) => console.error("Deletion request email failed:", e));
  }
}

// Soft-deletes the account. Removing the HouseholdMember row is what hides
// the person from every family view (lists, pickers, calendar owners…)
// without having to filter each query; where they were is remembered on the
// User row so restoreAccount() can put them back.
export async function softDeleteAccount(userId: string, byUserId: string, promoteUserId?: string) {
  const membership = await prisma.householdMember.findFirst({ where: { userId } });
  const now = new Date();

  const user = await prisma.$transaction(async (tx) => {
    if (membership && promoteUserId) {
      await tx.householdMember.updateMany({
        where: { householdId: membership.householdId, userId: promoteUserId },
        data: { role: "OWNER" },
      });
    }
    // 2026-09-28 (Mikael): everything the person was responsible for stays
    // with the family, but they're taken off it straight away — it shows as
    // "Unassigned" so someone else can pick it up. Restoring the account does
    // NOT put them back as the owner of those things.
    await tx.reminder.updateMany({ where: { assignedTo: userId }, data: { assignedTo: null } });
    await tx.reminder.updateMany({ where: { fallbackTo: userId }, data: { fallbackTo: null } });
    await tx.reminder.updateMany({ where: { handoverTo: userId }, data: { handoverTo: null, handoverState: "NONE", handoverInitiatedAt: null } });
    // Gifts they had reserved for someone go back to "wanted".
    await tx.wishlistItem.updateMany({ where: { reservedBy: userId, status: "RESERVED" }, data: { reservedBy: null, reservedAt: null, status: "WANTED" } });
    await tx.householdMember.deleteMany({ where: { userId } });
    return tx.user.update({
      where: { id: userId },
      data: {
        deletedAt: now,
        deletedById: byUserId,
        deletionRequestedAt: null,
        deletedFromHouseholdId: membership?.householdId ?? null,
        deletedRole: membership?.role ?? null,
      },
    });
  });

  await sendAccountDeletedEmail({ to: user.email, name: user.name, purgeDate: purgeDateFor(now) })
    .catch((e) => console.error("Account deleted email failed:", e));
  return user;
}

export async function restoreAccount(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.deletedAt) throw new Error("Account is not deleted");

  await prisma.$transaction(async (tx) => {
    const alreadyMember = await tx.householdMember.findFirst({ where: { userId } });
    if (!alreadyMember) {
      const household = user.deletedFromHouseholdId
        ? await tx.household.findUnique({ where: { id: user.deletedFromHouseholdId } })
        : null;
      if (household) {
        let role = user.deletedRole ?? "MEMBER";
        if (role === "OWNER") {
          const hasOwner = await tx.householdMember.count({ where: { householdId: household.id, role: "OWNER" } });
          if (hasOwner) role = "PARENT";
        }
        await tx.householdMember.create({ data: { householdId: household.id, userId, role } });
      } else if (!user.isChildProfile) {
        const h = await tx.household.create({ data: { name: user.name ?? "My household" } });
        await tx.householdMember.create({ data: { householdId: h.id, userId, role: "OWNER" } });
      }
    }
    await tx.user.update({
      where: { id: userId },
      data: { deletedAt: null, deletedById: null, deletedFromHouseholdId: null, deletedRole: null, deletionRequestedAt: null },
    });
  });
}

// Permanently removes accounts whose restore window has passed. Before the
// delete cascades, anything the person created that the rest of the family
// still uses (shared lists, shopping items, wishes they added for someone
// else, shared reminders/chores) is handed over to a remaining family member
// so the family doesn't lose it.
export async function purgeAccount(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  if (user.deletedFromHouseholdId) {
    const heir = await prisma.householdMember.findFirst({
      where: { householdId: user.deletedFromHouseholdId, role: { in: ["OWNER", "PARENT", "ADULT", "MEMBER"] } },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });
    if (heir) {
      const hid = user.deletedFromHouseholdId;
      await prisma.$transaction([
        prisma.list.updateMany({ where: { householdId: hid, createdBy: userId, NOT: { ownerId: userId } }, data: { createdBy: heir.userId } }),
        prisma.shoppingListItem.updateMany({ where: { householdId: hid, addedBy: userId }, data: { addedBy: heir.userId } }),
        prisma.wishlistItem.updateMany({ where: { householdId: hid, addedBy: userId, NOT: { childId: userId } }, data: { addedBy: heir.userId } }),
        prisma.reminder.updateMany({
          where: { householdId: hid, userId, visibility: { not: "PRIVATE" }, NOT: { assignedTo: userId } },
          data: { userId: heir.userId },
        }),
      ]);
    }
  }
  await prisma.user.delete({ where: { id: userId } });
}

export async function purgeExpiredAccounts() {
  const cutoff = new Date(Date.now() - RESTORE_WINDOW_DAYS * 86400000);
  const expired = await prisma.user.findMany({ where: { deletedAt: { lt: cutoff } }, select: { id: true, email: true } });
  const purged: string[] = [];
  for (const u of expired) {
    try { await purgeAccount(u.id); purged.push(u.email); }
    catch (e) { console.error(`Purge failed for ${u.id}:`, e); }
  }
  return purged;
}
