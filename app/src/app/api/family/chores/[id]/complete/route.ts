// @ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// POST /api/family/chores/[id]/complete
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const chore = await prisma.reminder.findFirst({
    where: { id: params.id, category: "CHORE", isActive: true },
    include: { household: { include: { familyTrial: true } } },
  });

  if (!chore) return NextResponse.json({ error: "Chore not found" }, { status: 404 });

  const membership = await prisma.householdMember.findFirst({
    where: { userId: session.user.id, householdId: chore.householdId ?? "" },
  });
  if (!membership) return NextResponse.json({ error: "Not in this household" }, { status: 403 });

  const isAdult = ["OWNER", "PARENT", "ADULT"].includes(membership.role);
  if (!isAdult && chore.assignedTo !== session.user.id) {
    return NextResponse.json({ error: "Not your chore" }, { status: 403 });
  }

  const isPro = chore.household?.is_pro;
  const trial = chore.household?.familyTrial;
  const trialActive = trial ? trial.expiresAt > new Date() : false;
  if (!isPro && !trialActive) return NextResponse.json({ error: "Trial expired" }, { status: 403 });

  const weekStart = getWeekStart(new Date());
  const childId = isAdult ? (chore.assignedTo ?? session.user.id) : session.user.id;

  const existing = await prisma.choreCompletion.findUnique({
    where: { reminderId_childId_weekStart: { reminderId: params.id, childId, weekStart } },
  });

  if (existing) {
    await prisma.choreCompletion.delete({ where: { id: existing.id } });
    return NextResponse.json({ done: false });
  } else {
    const newStatus = chore.requiresApproval ? "PENDING_APPROVAL" : "DONE";
    const completion = await prisma.choreCompletion.create({
      data: { reminderId: params.id, childId, weekStart, status: newStatus },
    });
    return NextResponse.json({ done: true, status: newStatus, completion });
  }
}
