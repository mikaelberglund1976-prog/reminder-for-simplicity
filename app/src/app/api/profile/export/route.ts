import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadImage } from "@/lib/media";

// GET /api/profile/export — download everything tied to the current account
// as JSON. Covers the GDPR data-portability right flagged as a gap in
// COMPETITOR_ANALYSIS_BEST4FAMILY.md §5 ("Konkreta åtgärder" #4) — a first
// version doesn't need to be more than a complete, readable JSON dump of the
// user's own data. Deliberately excludes other household members' personal
// data (only their id/name/role, same as what's already visible in the
// Family UI) — this is an export of *your* data, not everyone's.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userId = session.user.id;

    const [user, reminders, shoppingItemsAdded, wishlistOwned, wishlistAdded, membership] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, name: true, phone: true,
          preferredCurrency: true, timezone: true, isChildProfile: true,
          createdAt: true, updatedAt: true,
        },
      }),
      prisma.reminder.findMany({ where: { userId } }),
      prisma.shoppingListItem.findMany({ where: { addedBy: userId } }),
      prisma.wishlistItem.findMany({ where: { childId: userId } }),
      prisma.wishlistItem.findMany({ where: { addedBy: userId, childId: { not: userId } } }),
      prisma.householdMember.findFirst({
        where: { userId },
        include: { household: { select: { id: true, name: true } } },
      }),
    ]);

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // 2026-09-29 (GDPR review): the export now also covers what others
    // created FOR you (homework/tests, chores, activities assigned to you),
    // your chore ticks, ideas & votes, and your profile picture.
    const [assignedToYou, choreCompletions, suggestions, votes, avatar] = await Promise.all([
      prisma.reminder.findMany({
        where: { assignedTo: userId, NOT: { userId } },
        select: { id: true, name: true, category: true, date: true, recurrence: true, choreRecurrenceDays: true, schoolKind: true, subject: true, note: true, completedAt: true, createdAt: true },
      }),
      prisma.choreCompletion.findMany({ where: { childId: userId }, select: { reminderId: true, weekStart: true, status: true, createdAt: true } }),
      prisma.suggestion.findMany({ where: { userId }, select: { id: true, title: true, description: true, category: true, status: true, createdAt: true } }),
      prisma.suggestionVote.findMany({ where: { userId }, select: { suggestionId: true, createdAt: true } }),
      loadImage("avatar", userId).catch(() => null),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      account: user,
      household: membership
        ? { id: membership.household.id, name: membership.household.name, yourRole: membership.role, joinedAt: membership.joinedAt }
        : null,
      reminders,
      shoppingListItemsYouAdded: shoppingItemsAdded,
      wishlistItemsYouOwn: wishlistOwned,
      wishlistItemsYouAddedForOthers: wishlistAdded,
      itemsAssignedToYouByOthers: assignedToYou,
      choresYouTickedOff: choreCompletions,
      ideasYouPosted: suggestions,
      ideasYouVotedFor: votes,
      profilePicture: avatar ? `data:${avatar.mime};base64,${Buffer.from(avatar.data).toString("base64")}` : null,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="reminder-for-simplicity-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    console.error("Data export error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
