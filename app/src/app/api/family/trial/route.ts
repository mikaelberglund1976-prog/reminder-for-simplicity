// @ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPro, describeAccess, TRIAL_DAYS } from "@/lib/entitlements";

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
  const isPro = hasPro(household);
  const trial = household.familyTrial;

  const now = new Date();
  const trialActive = trial ? trial.expiresAt > now : false;
  const trialExpired = trial ? trial.expiresAt <= now : false;
  const daysLeft = trial ? Math.max(0, Math.ceil((trial.expiresAt.getTime() - now.getTime()) / 86400000)) : 0;

  const childMembers = household.members.filter(m => m.role === "CHILD");
  const isAdult = ADULT_ROLES.includes(membership.role);

  return NextResponse.json({
    status: isPro ? "PRO" : trialActive ? "TRIAL" : trialExpired ? "TRIAL_EXPIRED" : "NO_TRIAL",
    access: describeAccess(household, now),
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

  // 2026-09-28: 14 days for the whole family (no longer "1 child, 7 days").
  // childId is still accepted from older clients but no longer required.
  if (hasPro(membership.household)) return NextResponse.json({ error: "Already Pro" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const childId = typeof body?.childId === "string" ? body.childId : null;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const trial = await prisma.familyTrial.create({
    data: {
      householdId: membership.householdId,
      childId,
      createdBy: session.user.id,
      expiresAt,
    },
  });

  return NextResponse.json({ trial, daysLeft: TRIAL_DAYS });
}
