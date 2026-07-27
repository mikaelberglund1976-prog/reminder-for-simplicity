import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes } from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const APP_URL = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function shareUrl(token: string) {
  return `${APP_URL}/shop/${token}`;
}

async function getMembershipHousehold(userId: string) {
  const membership = await prisma.householdMember.findFirst({
    where: { userId },
    include: { household: true },
  });
  return membership;
}

// GET /api/family/shopping-list/share — current share status for the household.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await getMembershipHousehold(session.user.id);
    if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });

    const token = membership.household.shoppingListShareToken;
    return NextResponse.json({ enabled: !!token, url: token ? shareUrl(token) : null });
  } catch (err) {
    console.error("Shopping list share GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/family/shopping-list/share — turn sharing on (idempotent) and
// return the link. Anyone with the household's Shopping list page can do
// this — it's a convenience for the whole family, not an admin-only action.
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await getMembershipHousehold(session.user.id);
    if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });

    let token = membership.household.shoppingListShareToken;
    if (!token) {
      token = randomBytes(18).toString("base64url");
      await prisma.household.update({
        where: { id: membership.householdId },
        data: { shoppingListShareToken: token },
      });
    }

    return NextResponse.json({ enabled: true, url: shareUrl(token) });
  } catch (err) {
    console.error("Shopping list share POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/family/shopping-list/share — revoke the current link. A new
// POST afterwards mints a fresh token, so anyone who had the old link loses access.
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await getMembershipHousehold(session.user.id);
    if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });

    await prisma.household.update({
      where: { id: membership.householdId },
      data: { shoppingListShareToken: null },
    });

    return NextResponse.json({ enabled: false, url: null });
  } catch (err) {
    console.error("Shopping list share DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
