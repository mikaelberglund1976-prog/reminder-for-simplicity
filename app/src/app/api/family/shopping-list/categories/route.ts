import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureHouseholdCategories } from "@/lib/shoppingCategories";

// GET /api/family/shopping-list/categories — list this household's shopping
// categories, seeding the 8 defaults on first use.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await prisma.householdMember.findFirst({ where: { userId: session.user.id } });
    if (!membership) return NextResponse.json({ categories: [] });

    const categories = await ensureHouseholdCategories(membership.householdId);
    return NextResponse.json({ categories });
  } catch (err) {
    console.error("Shopping categories GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/family/shopping-list/categories — add a category the household
// is missing. Body: { label: string, icon?: string }
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await prisma.householdMember.findFirst({ where: { userId: session.user.id } });
    if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { label, icon } = body ?? {};
    if (!label?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

    // Make sure defaults exist first so sortOrder lands after them.
    const existing = await ensureHouseholdCategories(membership.householdId);
    const nextOrder = existing.reduce((max, c) => Math.max(max, c.sortOrder), -1) + 1;

    const category = await prisma.shoppingCategoryDef.create({
      data: {
        householdId: membership.householdId,
        slug: null,
        label: label.trim(),
        icon: icon?.trim() || "📦",
        sortOrder: nextOrder,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    console.error("Shopping categories POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
