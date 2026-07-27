import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rememberCategory } from "@/lib/shoppingCategories";
import { ShoppingCategory } from "@prisma/client";

const VALID_CATEGORIES: ShoppingCategory[] = ["PRODUCE", "DAIRY", "BREAD", "FROZEN", "PANTRY", "HOUSEHOLD", "MEAT_FISH", "OTHER", "UNSORTED"];

async function householdForToken(token: string) {
  return prisma.household.findUnique({ where: { shoppingListShareToken: token } });
}

// PATCH /api/public/shopping-list/[token]/[id] — toggle bought / change category.
export async function PATCH(req: Request, { params }: { params: { token: string; id: string } }) {
  try {
    const household = await householdForToken(params.token);
    if (!household) return NextResponse.json({ error: "Link not found or revoked" }, { status: 404 });

    const item = await prisma.shoppingListItem.findUnique({ where: { id: params.id } });
    if (!item || item.householdId !== household.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { isPurchased, category } = body ?? {};

    const data: Record<string, unknown> = {};
    if (typeof isPurchased === "boolean") {
      data.isPurchased = isPurchased;
      // No guest User to attribute the purchase to — leave purchasedBy unset,
      // purchasedAt still records when, which is what the 24h auto-clear uses.
      data.purchasedBy = null;
      data.purchasedAt = isPurchased ? new Date() : null;
    }
    if (typeof category === "string" && VALID_CATEGORIES.includes(category as ShoppingCategory)) {
      data.category = category;
      await rememberCategory(household.id, item.name, category as ShoppingCategory);
    }

    const updated = await prisma.shoppingListItem.update({
      where: { id: params.id },
      data,
      include: { adder: { select: { id: true, name: true } } },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Public shopping list PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/public/shopping-list/[token]/[id]
export async function DELETE(_req: Request, { params }: { params: { token: string; id: string } }) {
  try {
    const household = await householdForToken(params.token);
    if (!household) return NextResponse.json({ error: "Link not found or revoked" }, { status: 404 });

    const item = await prisma.shoppingListItem.findUnique({ where: { id: params.id } });
    if (!item || item.householdId !== household.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.shoppingListItem.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Public shopping list DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
