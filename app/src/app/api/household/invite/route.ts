import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendHouseholdInviteEmail } from "@/lib/email";

// POST /api/household/invite — send an invite to join the household
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { email, role } = await req.json();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    const validRoles = ["PARENT", "ADULT", "CHILD", "MEMBER"];
    const inviteRole = validRoles.includes(role) ? role : "ADULT";

    // Get user's household and verify OWNER role
    const membership = await prisma.householdMember.findFirst({
      where: { userId: session.user.id },
      include: { household: true },
    });

    if (!membership) return NextResponse.json({ error: "No household found" }, { status: 400 });
    if (membership.role !== "OWNER") {
      return NextResponse.json({ error: "Only household owners can send invites" }, { status: 403 });
    }
    if (!membership.household.is_pro) {
      return NextResponse.json({ error: "Household sharing requires Pro" }, { status: 403 });
    }

    // Check if already a member
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const alreadyMember = await prisma.householdMember.findFirst({
        where: { userId: existingUser.id, householdId: membership.householdId },
      });
      if (alreadyMember) return NextResponse.json({ error: "User is already a member" }, { status: 400 });
    }

    // Delete any existing unused invite for this email + household
    await prisma.householdInvite.deleteMany({
      where: { email, householdId: membership.householdId, usedAt: null },
    });

    // Create invite (expires in 48h)
    const invite = await prisma.householdInvite.create({
      data: {
        householdId: membership.householdId,
        email,
        role: inviteRole as "PARENT" | "ADULT" | "CHILD" | "MEMBER",
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });

    const APP_URL = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const joinUrl = `${APP_URL}/join-household?token=${invite.token}`;

    await sendHouseholdInviteEmail({
      to: email,
      fromName: session.user.name ?? session.user.email ?? "Someone",
      householdName: membership.household.name ?? "a household",
      joinUrl,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Invite error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
