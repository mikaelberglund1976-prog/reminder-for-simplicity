import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/family/members — every member of the caller's household, for the
// "who can see this list" member picker on shopping lists / wishlists.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await prisma.householdMember.findFirst({ where: { userId: session.user.id } });
    if (!membership) return NextResponse.json({ members: [] });

    const members = await prisma.householdMember.findMany({
      where: { householdId: membership.householdId },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      members: members.map((m) => ({ id: m.user.id, name: m.user.name ?? "Household member", role: m.role })),
    });
  } catch (err) {
    console.error("Family members GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
