import { prisma } from "@/lib/prisma";

// 2026-10-04 (phone test, item 1): cards under "Coming up" on Home did
// nothing when tapped. Home lists everything shared in the family, but
// /api/reminders/[id] only let the *creator* open a reminder — anyone else got
// a 404 and the detail page silently bounced back to Home. Reading now follows
// the same rules as the list (GET /api/reminders); editing/deleting is allowed
// for the creator and for adults in the same family on anything not private.

const ADULT_ROLES = ["OWNER", "PARENT", "ADULT"];
const HIDDEN_CATEGORIES = ["CHORE", "TRAINING", "SCHOOL"];

export async function findReminderFor(userId: string, id: string) {
  const reminder = await prisma.reminder.findFirst({ where: { id, isActive: true } });
  if (!reminder) return null;
  if (reminder.userId === userId) return { reminder, canEdit: true };

  // 2026-10-04: chores and activities (deleted through DELETE
  // /api/reminders/[id]) — any adult in the family may remove them, not only
  // the one who created them. Otherwise an item created by someone who later
  // left, or assigned to a child who was removed, could never be deleted.
  if (HIDDEN_CATEGORIES.includes(reminder.category as string)) {
    if (!reminder.householdId) return null;
    const m = await prisma.householdMember.findFirst({ where: { userId, householdId: reminder.householdId } });
    if (!m) return null;
    const adult = ADULT_ROLES.includes(m.role as string);
    if (adult) return { reminder, canEdit: true };
    return reminder.assignedTo === userId ? { reminder, canEdit: false } : null;
  }
  if (!reminder.householdId) return null;

  const membership = await prisma.householdMember.findFirst({
    where: { userId, householdId: reminder.householdId },
  });
  if (!membership) return null;
  const isAdult = ADULT_ROLES.includes(membership.role as string);

  const canRead =
    reminder.assignedTo === userId ||
    reminder.visibility === "HOUSEHOLD" ||
    (reminder.visibility === "PARENTS" && isAdult);
  if (!canRead) return null;

  return { reminder, canEdit: isAdult && reminder.visibility !== "PRIVATE" };
}
