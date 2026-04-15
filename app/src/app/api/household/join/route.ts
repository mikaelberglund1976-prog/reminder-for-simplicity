import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/household/join — join a household via invite token
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

    const invite = await prisma.householdInvite.findUnique({
      where: { token },
      include: { household: true },
    });

    if (!invite) return NextResponse.json({ error: "Invalid invite link" }, { status: 400 });
    if (invite.usedAt) return NextResponse.json({ error: "This invite has already been used" }, { status: 400 });
    if (invite.expiresAt < new Date()) return NextResponse.json({ error: "This invite has expired" }, { status: 400 });

    // Check if already a member of any household
    const existingMembership = await prisma.householdMember.findFirst({
      where: { userId: session.user.id },
    });

    if (existingMembership) {
      if (existingMembership.householdId === invite.householdId) {
        return NextResponse.json({ error: "You are already in this household" }, { status: 400 });
      }
      // Remove from old household first
      await prisma.householdMember.delete({ where: { id: existingMembership.id } });
    }

    // Add to new household with the role specified in the invite
    await prisma.householdMember.create({
      data: {
        householdId: invite.householdId,
        userId: session.user.id,
        role: invite.role ?? "MEMBER",
      },
    });

    // Mark invite as used
    await prisma.householdInvite.update({
      where: { token },
      data: { usedAt: new Date() },
    });

    return NextResponse.json({ success: true, householdName: invite.household.name });
  } catch (err) {
    console.error("Join error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// GET /api/household/join?token=xxx — validate token (for join page preview)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  try {
    const invite = await prisma.householdInvite.findUnique({
      where: { token },
      include: { household: { include: { members: { include: { user: { select: { name: true } } }, where: { role: "OWNER" } } } } },
    });

    if (!invite) return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
    if (invite.usedAt) return NextResponse.json({ error: "This invite has already been used" }, { status: 400 });
    if (invite.expiresAt < new Date()) return NextResponse.json({ error: "This invite has expired" }, { status: 400 });

    const ownerName = invite.household.members[0]?.user.name ?? "Someone";
    return NextResponse.json({
      valid: true,
      householdName: invite.household.name,
      ownerName,
      invitedEmail: invite.email,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
