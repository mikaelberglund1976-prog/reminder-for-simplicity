import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rememberCategory } from "@/lib/shoppingCategories";

async function listForToken(token: string) {
  return prisma.list.findUnique({ where: { shareToken: token } });
}

// PATCH /api/public/shopping-list/[token]/[id] — toggle bought / change category.
export async function PATCH(req: Request, { params }: { params: { token: string; id: string } }) {
  try {
    const list = await listForToken(params.token);
    if (!list || list.kind !== "SHOPPING") return NextResponse.json({ error: "Link not found or revoked" }, { status: 404 });

    const item = await prisma.shoppingListItem.findUnique({ where: { id: params.id } });
    if (!item || item.listId !== list.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { isPurchased, categoryId } = body ?? {};

    const data: Record<string, unknown> = {};
    if (typeof isPurchased === "boolean") {
      data.isPurchased = isPurchased;
      // No guest User to attribute the purchase to — leave purchasedBy unset,
      // purchasedAt still records when it happened.
      data.purchasedBy = null;
      data.purchasedAt = isPurchased ? new Date() : null;
    }
    if (categoryId !== undefined) {
      if (categoryId !== null) {
        const owned = await prisma.shoppingCategoryDef.findUnique({ where: { id: categoryId } });
        if (!owned || owned.householdId !== list.householdId) {
          return NextResponse.json({ error: "Unknown category" }, { status: 400 });
        }
      }
      data.categoryId = categoryId;
      await rememberCategory(list.householdId, item.name, categoryId);
    }

    const updated = await prisma.shoppingListItem.update({
      where: { id: params.id },
      data,
      include: { adder: { select: { id: true, name: true } }, categoryDef: true },
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
    const list = await listForToken(params.token);
    if (!list || list.kind !== "SHOPPING") return NextResponse.json({ error: "Link not found or revoked" }, { status: 404 });

    const item = await prisma.shoppingListItem.findUnique({ where: { id: params.id } });
    if (!item || item.listId !== list.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.shoppingListItem.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Public shopping list DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
