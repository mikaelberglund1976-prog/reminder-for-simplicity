// @ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADULT_ROLES = ["OWNER", "PARENT", "ADULT"];

// GET /api/family/trial
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

  if (!membership) return NextResponse.json({ status: "NO_HOUSEHOLD" });

  const { household } = membership;
  const isPro = household.is_pro;
  const trial = household.familyTrial;

  const now = new Date();
  const trialActive = trial ? trial.expiresAt > now : false;
  const trialExpired = trial ? trial.expiresAt <= now : false;
  const daysLeft = trial ? Math.max(0, Math.ceil((trial.expiresAt.getTime() - now.getTime()) / 86400000)) : 0;

  const childMembers = household.members.filter(m => m.role === "CHILD");
  const isAdult = ADULT_ROLES.includes(membership.role);

  return NextResponse.json({
    status: isPro ? "PRO" : trialActive ? "TRIAL" : trialExpired ? "TRIAL_EXPIRED" : "NO_TRIAL",
    isPro,
    trialActive,
    trialExpired: !trialActive && trialExpired,
    daysLeft,
    trialChildId: trial?.childId ?? null,
    isAdult,
    householdId: membership.householdId,
    childMembers: childMembers.map(m => ({
      id: m.userId,
      name: m.user.name ?? m.user.email.split("@")[0],
      memberId: m.id,
    })),
    householdMembers: household.members.map(m => ({
      id: m.userId,
      name: m.user.name ?? m.user.email.split("@")[0],
      role: m.role,
      memberId: m.id,
    })),
  });
}

// POST /api/family/trial
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.householdMember.findFirst({
    where: { userId: session.user.id },
    include: { household: { include: { familyTrial: true } } },
  });

  if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });
  if (!ADULT_ROLES.includes(membership.role)) return NextResponse.json({ error: "Adults only" }, { status: 403 });
  if (membership.household.familyTrial) return NextResponse.json({ error: "Trial already used" }, { status: 400 });

  const { childId } = await req.json();
  if (!childId) return NextResponse.json({ error: "childId required" }, { status: 400 });

  const childMember = await prisma.householdMember.findFirst({
    where: { householdId: membership.householdId, userId: childId, role: "CHILD" },
  });
  if (!childMember) return NextResponse.json({ error: "Child not found in household" }, { status: 404 });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const trial = await prisma.familyTrial.create({
    data: {
      householdId: membership.householdId,
      childId,
      createdBy: session.user.id,
      expiresAt,
    },
  });

  return NextResponse.json({ trial, daysLeft: 7 });
}
