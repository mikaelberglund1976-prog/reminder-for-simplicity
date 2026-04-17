// @ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADULT_ROLES = ["OWNER", "PARENT", "ADULT"];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// GET /api/family/chores
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.householdMember.findFirst({
    where: { userId: session.user.id },
    include: {
      household: {
        include: {
          familyTrial: true,
          members: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
      },
    },
  });

  if (!membership) return NextResponse.json({ chores: [], access: "NO_HOUSEHOLD" });

  const { household } = membership;
  const isPro = household.is_pro;
  const trial = household.familyTrial;
  const now = new Date();
  const trialActive = trial ? trial.expiresAt > now : false;

  if (!isPro && !trialActive) {
    return NextResponse.json({ chores: [], access: "LOCKED" });
  }

  const weekStart = getWeekStart(now);
  const isChild = membership.role === "CHILD";
  const whereFilter: Record<string, unknown> = {
    householdId: membership.householdId,
    category: "CHORE",
    isActive: true,
  };
  if (isChild) {
    whereFilter.assignedTo = session.user.id;
  }

  const chores = await prisma.reminder.findMany({
    where: whereFilter,
    include: {
      completions: { where: { weekStart } },
      assignedUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ chores, weekStart, access: isPro ? "PRO" : "TRIAL" });
}

// POST /api/family/chores
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.householdMember.findFirst({
    where: { userId: session.user.id },
    include: { household: { include: { familyTrial: true } } },
  });

  if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });
  if (!ADULT_ROLES.includes(membership.role)) return NextResponse.json({ error: "Adults only" }, { status: 403 });

  const isPro = membership.household.is_pro;
  const trial = membership.household.familyTrial;
  const now = new Date();
  const trialActive = trial ? trial.expiresAt > now : false;
  if (!isPro && !trialActive) return NextResponse.json({ error: "Trial or Pro required" }, { status: 403 });

  const { name, assignedTo, recurrence, recurrenceDays, startDate, requiresApproval, note } = await req.json();

  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (!assignedTo) return NextResponse.json({ error: "assignedTo required" }, { status: 400 });

  if (!isPro && trial?.childId && assignedTo !== trial.childId) {
    return NextResponse.json({ error: "Trial only supports 1 child" }, { status: 403 });
  }

  const chore = await prisma.reminder.create({
    data: {
      name: name.trim(),
      category: "CHORE",
      userId: session.user.id,
      householdId: membership.householdId,
      assignedTo,
      recurrence: recurrence ?? "WEEKLY",
      choreRecurrenceDays: recurrenceDays ?? null,
      date: startDate ? new Date(startDate) : new Date(),
      visibility: "HOUSEHOLD",
      requiresApproval: !!requiresApproval,
      note: note ?? null,
    },
    include: { assignedUser: { select: { id: true, name: true } } },
  });

  return NextResponse.json(chore, { status: 201 });
}
