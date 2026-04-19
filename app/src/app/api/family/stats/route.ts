import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Returns done-counts over time per child for the parent overview.
// Counts ChoreCompletion rows whose status is DONE or APPROVED.
// Time windows are based on completion.createdAt:
//  - last7d: trailing 7 days from now
//  - thisMonth: from the 1st of the current month (UTC)
//  - lastMonth: previous calendar month (UTC)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.householdMember.findFirst({
      where: { userId: session.user.id },
      include: {
        household: {
          include: {
            familyTrial: true,
            members: {
              where: { role: "CHILD" },
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ stats: [], access: "NO_HOUSEHOLD" });
    }

    const isPro = membership.household.is_pro;
    const trial = membership.household.familyTrial;
    const trialActive = trial ? trial.expiresAt > new Date() : false;
    if (!isPro && !trialActive) {
      return NextResponse.json({ stats: [], access: "LOCKED" });
    }

    const now = new Date();

    // Trailing 7 days
    const last7Start = new Date(now);
    last7Start.setUTCDate(last7Start.getUTCDate() - 7);

    // This month (UTC)
    const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
    // Last month (UTC) — start of the previous month
    const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0));
    const lastMonthEnd = thisMonthStart; // exclusive

    const children = membership.household.members;
    const childIds = children.map((c) => c.userId);

    // Fetch all qualifying completions for the household's children in one query,
    // then bucket per child + window in memory.
    const since = lastMonthStart < last7Start ? lastMonthStart : last7Start;
    const completions = await prisma.choreCompletion.findMany({
      where: {
        childId: { in: childIds },
        status: { in: ["DONE", "APPROVED"] },
        createdAt: { gte: since },
        reminder: {
          householdId: membership.householdId,
          category: "CHORE",
        },
      },
      select: { childId: true, createdAt: true },
    });

    const stats = children.map((child) => {
      const mine = completions.filter((cp) => cp.childId === child.userId);
      const last7 = mine.filter((cp) => cp.createdAt >= last7Start).length;
      const thisMonth = mine.filter((cp) => cp.createdAt >= thisMonthStart).length;
      const lastMonth = mine.filter(
        (cp) => cp.createdAt >= lastMonthStart && cp.createdAt < lastMonthEnd
      ).length;

      return {
        childId: child.userId,
        childName: child.user.name ?? child.user.email.split("@")[0],
        last7Days: last7,
        thisMonth,
        lastMonth,
      };
    });

    return NextResponse.json({
      stats,
      windows: {
        last7Start: last7Start.toISOString(),
        thisMonthStart: thisMonthStart.toISOString(),
        lastMonthStart: lastMonthStart.toISOString(),
        lastMonthEnd: lastMonthEnd.toISOString(),
      },
      access: isPro ? "PRO" : "TRIAL",
    });
  } catch (err) {
    console.error("Family stats GET error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}
