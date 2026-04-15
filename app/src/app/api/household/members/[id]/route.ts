import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/household/members/:memberId — remove a member from household
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const targetMembership = await prisma.householdMember.findUnique({
      where: { id: params.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!targetMembership) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    // Verify requester is OWNER of the same household
    const requesterMembership = await prisma.householdMember.findFirst({
      where: { userId: session.user.id, householdId: targetMembership.householdId },
    });

    if (!requesterMembership || requesterMembership.role !== "OWNER") {
      return NextResponse.json({ error: "Only household owners can remove members" }, { status: 403 });
    }

    if (targetMembership.role === "OWNER") {
      return NextResponse.json({ error: "Cannot remove the household owner" }, { status: 400 });
    }

    const removedUserId = targetMembership.userId;

    // Find reminders assigned to this user within the household
    const assignedReminders = await prisma.reminder.findMany({
      where: { assignedTo: removedUserId, isActive: true },
      select: { id: true, name: true, date: true },
    });

    // Find pending handovers to this user
    const pendingHandovers = await prisma.reminder.findMany({
      where: { handoverTo: removedUserId, handoverState: "PENDING", isActive: true },
      select: { id: true, name: true, date: true },
    });

    // Auto-revert pending handovers to NONE
    if (pendingHandovers.length > 0) {
      await prisma.reminder.updateMany({
        where: { handoverTo: removedUserId, handoverState: "PENDING" },
        data: { handoverState: "NONE", handoverTo: null, handoverInitiatedAt: null },
      });
    }

    // Remove the member
    await prisma.householdMember.delete({ where: { id: params.id } });

    return NextResponse.json({
      success: true,
      removedUser: { id: removedUserId, name: targetMembership.user.name, email: targetMembership.user.email },
      assignedReminders,
      revertedHandovers: pendingHandovers.length,
    });
  } catch (err) {
    console.error("Remove member error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
