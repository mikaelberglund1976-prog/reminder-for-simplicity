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

// POST /api/family/chores/[id]/approve
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.householdMember.findFirst({
    where: { userId: session.user.id },
  });
  if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });

  const isAdult = ["OWNER", "PARENT", "ADULT"].includes(membership.role);
  if (!isAdult) return NextResponse.json({ error: "Adults only" }, { status: 403 });

  const { action, childId } = await req.json();
  if (!action || !childId) return NextResponse.json({ error: "action and childId required" }, { status: 400 });

  const weekStart = getWeekStart(new Date());
  const completion = await prisma.choreCompletion.findUnique({
    where: { reminderId_childId_weekStart: { reminderId: params.id, childId, weekStart } },
  });

  if (!completion) return NextResponse.json({ error: "No completion found" }, { status: 404 });

  if (action === "approve") {
    const updated = await prisma.choreCompletion.update({
      where: { id: completion.id },
      data: { status: "APPROVED", approvedBy: session.user.id, approvedAt: new Date() },
    });
    return NextResponse.json(updated);
  } else if (action === "reopen") {
    await prisma.choreCompletion.delete({ where: { id: completion.id } });
    return NextResponse.json({ reopened: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
