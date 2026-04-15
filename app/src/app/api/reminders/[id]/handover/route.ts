import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendHandoverRequestEmail, sendHandoverResponseEmail } from "@/lib/email";

// POST /api/reminders/:id/handover — initiate a handover to another household member
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { toUserId } = await req.json();
    if (!toUserId) return NextResponse.json({ error: "toUserId required" }, { status: 400 });

    const reminder = await prisma.reminder.findUnique({
      where: { id: params.id },
      include: { user: true },
    });

    if (!reminder) return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    if (reminder.userId !== session.user.id && reminder.assignedTo !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    if (reminder.handoverState === "PENDING") {
      return NextResponse.json({ error: "A handover is already pending for this reminder" }, { status: 400 });
    }

    // Verify Pro and household membership
    const membership = await prisma.householdMember.findFirst({
      where: { userId: session.user.id },
      include: { household: true },
    });
    if (!membership?.household.is_pro) {
      return NextResponse.json({ error: "Household sharing requires Pro" }, { status: 403 });
    }

    // Verify target user is in the same household
    const targetMembership = await prisma.householdMember.findFirst({
      where: { userId: toUserId, householdId: membership.householdId },
      include: { user: true },
    });
    if (!targetMembership) {
      return NextResponse.json({ error: "Target user is not in your household" }, { status: 400 });
    }

    // Update reminder
    await prisma.reminder.update({
      where: { id: params.id },
      data: {
        handoverState: "PENDING",
        handoverTo: toUserId,
        handoverInitiatedAt: new Date(),
      },
    });

    // Send email to receiver
    const APP_URL = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    await sendHandoverRequestEmail({
      to: targetMembership.user.email,
      toName: targetMembership.user.name,
      fromName: session.user.name ?? session.user.email ?? "Someone",
      reminderName: reminder.name,
      reminderDate: reminder.date,
      acceptUrl: `${APP_URL}/dashboard/${reminder.id}`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Handover initiate error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PUT /api/reminders/:id/handover — accept or reject a handover
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { action } = await req.json(); // "accept" | "reject"
    if (!action || !["accept", "reject"].includes(action)) {
      return NextResponse.json({ error: "action must be 'accept' or 'reject'" }, { status: 400 });
    }

    const reminder = await prisma.reminder.findUnique({
      where: { id: params.id },
      include: { user: true },
    });

    if (!reminder) return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    if (reminder.handoverTo !== session.user.id) {
      return NextResponse.json({ error: "This handover is not addressed to you" }, { status: 403 });
    }
    if (reminder.handoverState !== "PENDING") {
      return NextResponse.json({ error: "No pending handover on this reminder" }, { status: 400 });
    }

    if (action === "accept") {
      await prisma.reminder.update({
        where: { id: params.id },
        data: {
          assignedTo: session.user.id,
          handoverState: "ACCEPTED",
          handoverTo: null,
          handoverInitiatedAt: null,
        },
      });

      // Notify original owner
      const APP_URL = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      await sendHandoverResponseEmail({
        to: reminder.user.email,
        toName: reminder.user.name,
        responderName: session.user.name ?? session.user.email ?? "Someone",
        reminderName: reminder.name,
        action: "accepted",
        dashboardUrl: `${APP_URL}/dashboard/${reminder.id}`,
      });
    } else {
      // Reject — revert to NONE
      await prisma.reminder.update({
        where: { id: params.id },
        data: {
          handoverState: "NONE",
          handoverTo: null,
          handoverInitiatedAt: null,
        },
      });

      await sendHandoverResponseEmail({
        to: reminder.user.email,
        toName: reminder.user.name,
        responderName: session.user.name ?? session.user.email ?? "Someone",
        reminderName: reminder.name,
        action: "rejected",
        dashboardUrl: `${APP_URL}/dashboard/${reminder.id}`,
      });
    }

    return NextResponse.json({ success: true, action });
  } catch (err) {
    console.error("Handover response error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
