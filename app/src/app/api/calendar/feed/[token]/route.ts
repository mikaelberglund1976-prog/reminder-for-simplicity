import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOccurrencesInRange, type RecurringItem } from "@/lib/recurrence";
import { buildIcsFeed, type IcsEvent } from "@/lib/ics";

// GET /api/calendar/feed/[token].ics — public, no login. The token itself is
// the auth (same trust model as List.shareToken / Household.shoppingListShareToken):
// anyone with the link can read a read-only feed of everything visible to
// that user. Meant to be pasted into Google Calendar / Outlook / Apple
// Calendar's "subscribe from URL" feature — see PRODUCT_SPEC.md 4b.19.
//
// Deliberately reuses the exact same visibility rule as GET /api/reminders
// (household-shared HOUSEHOLD/PARENTS reminders, own PRIVATE ones) but does
// NOT exclude CHORE/TRAINING like that route does — chores and trainings
// are always created with visibility=HOUSEHOLD, so they're already covered
// by the same rule and show up in the feed automatically. No separate query
// needed for them.
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const rawToken = params.token.replace(/\.ics$/i, "");

  try {
    const user = await prisma.user.findUnique({ where: { calendarFeedToken: rawToken } });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const membership = await prisma.householdMember.findFirst({ where: { userId: user.id } });

    let reminders;
    if (membership) {
      const isAdultRole = ["OWNER", "PARENT", "ADULT"].includes(membership.role);
      const visibleLevels = isAdultRole ? ["HOUSEHOLD", "PARENTS"] : ["HOUSEHOLD"];
      reminders = await prisma.reminder.findMany({
        where: {
          isActive: true,
          OR: [
            { userId: user.id },
            {
              householdId: membership.householdId,
              visibility: { in: visibleLevels as ("HOUSEHOLD" | "PARENTS")[] },
              userId: { not: user.id },
            },
          ],
        },
        include: { assignedUser: { select: { name: true } } },
      });
    } else {
      reminders = await prisma.reminder.findMany({
        where: { userId: user.id, isActive: true },
        include: { assignedUser: { select: { name: true } } },
      });
    }

    // Feed window: a few months back (recently-passed events some calendar
    // apps still show for a beat) through a year ahead. Matches the
    // in-app calendar's own occurrence-expansion approach (lib/recurrence.ts).
    const from = new Date();
    from.setDate(from.getDate() - 90);
    const to = new Date();
    to.setDate(to.getDate() + 400);

    const CATEGORY_LABELS: Record<string, string> = {
      SUBSCRIPTION: "Subscription", BIRTHDAY: "Birthday", INSURANCE: "Insurance",
      CONTRACT: "Contract", HEALTH: "Health", BILL: "Bill", CHORE: "Chore",
      TRAINING: "Training", SCHOOL: "School", OTHER: "Reminder",
    };

    const events: IcsEvent[] = [];
    for (const r of reminders) {
      const occs = getOccurrencesInRange(r as unknown as RecurringItem, from, to);
      const categoryLabel = CATEGORY_LABELS[r.category] ?? r.category;
      const who = ["CHORE", "TRAINING", "SCHOOL"].includes(r.category) && r.assignedUser?.name ? ` (${r.assignedUser.name})` : "";
      const descriptionParts = [categoryLabel + who, r.note].filter(Boolean);
      for (const occ of occs) {
        events.push({
          uid: `${r.id}-${occ.getFullYear()}${occ.getMonth() + 1}${occ.getDate()}`,
          title: r.name,
          date: occ,
          description: descriptionParts.join(" — ") || undefined,
        });
      }
    }

    const ics = buildIcsFeed("Reminder for Simplicity", events);
    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="reminder-for-simplicity.ics"',
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("Calendar feed error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
