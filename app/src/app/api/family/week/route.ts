// @ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPro } from "@/lib/entitlements";

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// GET /api/family/week
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.householdMember.findFirst({
    where: { userId: session.user.id },
    include: {
      household: {
        include: {
          familyTrial: true,
          // 2026-09-28 (test round, row 43): chores can be given to anyone
          // in the family, not only children — so the week view covers
          // every member (children always, adults when they have chores).
          members: {
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { joinedAt: "asc" },
          },
        },
      },
    },
  });

  if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });

  const isPro = hasPro(membership.household);
  const trial = membership.household.familyTrial;
  const trialActive = trial ? trial.expiresAt > new Date() : false;
  if (!isPro && !trialActive) return NextResponse.json({ summary: [], access: "LOCKED" });

  const weekStart = getWeekStart(new Date());
  const children = membership.household.members;

  const all = await Promise.all(children.map(async (child) => {
    const chores = await prisma.reminder.findMany({
      where: {
        householdId: membership.householdId,
        category: "CHORE",
        isActive: true,
        assignedTo: child.userId,
      },
      include: {
        completions: { where: { childId: child.userId, weekStart } },
      },
    });

    const total = chores.length;
    const done = chores.filter(c => c.completions.some(cp => cp.status === "APPROVED" || cp.status === "DONE")).length;
    const pending = chores.filter(c => c.completions.some(cp => cp.status === "PENDING_APPROVAL")).length;
    const missed = chores.filter(c => c.completions.length === 0).length;

    return {
      role: child.role,
      childId: child.userId,
      childName: child.user.name ?? child.user.email.split("@")[0],
      total,
      done,
      pending,
      missed,
      chores: chores.map(c => ({
        id: c.id,
        name: c.name,
        requiresApproval: c.requiresApproval,
        completion: c.completions[0] ?? null,
      })),
    };
  }));

  // Children first (the common case), then adults who have chores.
  const summary = [
    ...all.filter((m) => m.role === "CHILD"),
    ...all.filter((m) => m.role !== "CHILD" && m.total > 0),
  ];

  return NextResponse.json({ summary, weekStart, access: isPro ? "PRO" : "TRIAL" });
}
