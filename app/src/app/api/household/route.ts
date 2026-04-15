import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/household — get the current user's household with members
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const membership = await prisma.householdMember.findFirst({
      where: { userId: session.user.id },
      include: {
        household: {
          include: {
            members: {
              include: { user: { select: { id: true, name: true, email: true } } },
              orderBy: { joinedAt: "asc" },
            },
            invites: {
              where: { usedAt: null, expiresAt: { gt: new Date() } },
              select: { id: true, email: true, createdAt: true },
            },
          },
        },
      },
    });

    if (!membership) return NextResponse.json({ household: null });

    return NextResponse.json({ household: membership.household, role: membership.role });
  } catch (err) {
    console.error("Get household error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
