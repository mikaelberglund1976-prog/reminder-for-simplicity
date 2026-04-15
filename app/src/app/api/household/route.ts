import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/household — create a new household (user becomes OWNER)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name } = await req.json().catch(() => ({}));

    // Can't already be in a household
    const existing = await prisma.householdMember.findFirst({
      where: { userId: session.user.id },
    });
    if (existing) return NextResponse.json({ error: "You are already in a household" }, { status: 400 });

    const household = await prisma.household.create({
      data: {
        name: name?.trim() || `${session.user.name ?? "My"}'s Household`,
        members: {
          create: { userId: session.user.id, role: "OWNER" },
        },
      },
    });

    return NextResponse.json({ household });
  } catch (err) {
    console.error("Create household error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PATCH /api/household — rename the household (OWNER only)
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const membership = await prisma.householdMember.findFirst({
      where: { userId: session.user.id },
    });
    if (!membership) return NextResponse.json({ error: "No household found" }, { status: 404 });
    if (membership.role !== "OWNER") return NextResponse.json({ error: "Only the owner can rename" }, { status: 403 });

    const household = await prisma.household.update({
      where: { id: membership.householdId },
      data: { name: name.trim() },
    });

    return NextResponse.json({ household });
  } catch (err) {
    console.error("Rename household error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

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
