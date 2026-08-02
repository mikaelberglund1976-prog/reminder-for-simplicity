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
    // Pro requirement removed 2026-08-02 (Mikael's decision, see PRODUCT_SPEC.md
    // §7.2): /features has always marketed "household sharing" as free, but
    // this route silently required is_pro — a Basic household couldn't
    // actually become a household. Basic/Pro line now sits at the family
    // feature set (shopping list, wishlist, chores, etc.), not at forming
    // the household itself.

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

    // 2026-07-28: let the inviting adult know up front if this email already
    // belongs to someone with their own account/household — accepting the
    // invite moves them out of it (see autoJoinPendingInvite in auth.ts,
    // "remove from any existing household" — the existing "move everything"
    // behavior agreed in TODO.md 19g), not something silent to surprise them
    // with later.
    return NextResponse.json({ success: true, existingUser: !!existingUser });
  } catch (err) {
    console.error("Invite error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
