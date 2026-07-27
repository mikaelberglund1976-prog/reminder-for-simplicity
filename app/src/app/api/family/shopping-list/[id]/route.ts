import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rememberCategory } from "@/lib/shoppingCategories";

// PATCH /api/family/shopping-list/[id]
// Body: { isPurchased?: boolean, name?: string, quantity?: string | null, categoryId?: string | null }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await prisma.householdMember.findFirst({
      where: { userId: session.user.id },
    });
    if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });

    const item = await prisma.shoppingListItem.findUnique({ where: { id: params.id } });
    if (!item || item.householdId !== membership.householdId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { isPurchased, name, quantity, categoryId } = body ?? {};

    const data: Record<string, unknown> = {};
    if (typeof isPurchased === "boolean") {
      data.isPurchased = isPurchased;
      data.purchasedBy = isPurchased ? session.user.id : null;
      data.purchasedAt = isPurchased ? new Date() : null;
    }
    if (typeof name === "string" && name.trim()) data.name = name.trim();
    if (quantity !== undefined) data.quantity = quantity?.toString().trim() || null;
    if (categoryId !== undefined) {
      // null is a valid choice (explicitly uncategorized); a non-empty
      // string must belong to this household.
      if (categoryId !== null) {
        const owned = await prisma.shoppingCategoryDef.findUnique({ where: { id: categoryId } });
        if (!owned || owned.householdId !== membership.householdId) {
          return NextResponse.json({ error: "Unknown category" }, { status: 400 });
        }
      }
      data.categoryId = categoryId;
      // Remember the household's manual choice against the (possibly updated) name.
      await rememberCategory(membership.householdId, (typeof name === "string" && name.trim()) ? name : item.name, categoryId);
    }

    const updated = await prisma.shoppingListItem.update({
      where: { id: params.id },
      data,
      include: {
        adder: { select: { id: true, name: true } },
        purchaser: { select: { id: true, name: true } },
        categoryDef: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Shopping list PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/family/shopping-list/[id]
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await prisma.householdMember.findFirst({
      where: { userId: session.user.id },
    });
    if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });

    const item = await prisma.shoppingListItem.findUnique({ where: { id: params.id } });
    if (!item || item.householdId !== membership.householdId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.shoppingListItem.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Shopping list DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
