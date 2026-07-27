import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/family/shopping-list/suggestions
// Returns the household's most recently-used item names (from
// ShoppingCategoryMemory, which persists even after an item is bought and
// cleared — see shoppingCategories.ts). This is the "Recent" quick-add row,
// the equivalent of Listonic's "Senaste" tab, without needing a separate
// usage-tracking table.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await prisma.householdMember.findFirst({
      where: { userId: session.user.id },
    });
    if (!membership) return NextResponse.json({ recent: [] });

    const remembered = await prisma.shoppingCategoryMemory.findMany({
      where: { householdId: membership.householdId },
      orderBy: { updatedAt: "desc" },
      take: 12,
      select: { itemName: true, category: true },
    });

    // itemName is stored lowercase/trimmed for matching; title-case it back
    // for display so suggestion chips don't read "mjölk" / "toilet paper" oddly.
    const recent = remembered.map((r) => ({
      name: r.itemName.replace(/\b\w/g, (c) => c.toUpperCase()),
      category: r.category,
    }));

    return NextResponse.json({ recent });
  } catch (err) {
    console.error("Shopping list suggestions GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
