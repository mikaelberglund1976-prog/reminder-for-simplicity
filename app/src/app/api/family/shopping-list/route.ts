import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveCategory, rememberCategory } from "@/lib/shoppingCategories";
import { ShoppingCategory } from "@prisma/client";

const VALID_CATEGORIES: ShoppingCategory[] = ["PRODUCE", "DAIRY", "BREAD", "FROZEN", "PANTRY", "HOUSEHOLD", "MEAT_FISH", "OTHER", "UNSORTED"];

// GET /api/family/shopping-list
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await prisma.householdMember.findFirst({
      where: { userId: session.user.id },
      include: { household: { include: { familyTrial: true } } },
    });

    if (!membership) return NextResponse.json({ items: [], access: "NO_HOUSEHOLD" });

    const { household } = membership;
    const isPro = household.is_pro;
    const trial = household.familyTrial;
    const trialActive = trial ? trial.expiresAt > new Date() : false;

    if (!isPro && !trialActive) {
      return NextResponse.json({ items: [], access: "LOCKED" });
    }

    const items = await prisma.shoppingListItem.findMany({
      where: { householdId: membership.householdId },
      include: {
        adder: { select: { id: true, name: true } },
        purchaser: { select: { id: true, name: true } },
      },
      // Purchased items sink to the bottom (P0.3); within each group, newest first.
      orderBy: [{ isPurchased: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ items, access: isPro ? "PRO" : "TRIAL" });
  } catch (err) {
    console.error("Shopping list GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/family/shopping-list
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await prisma.householdMember.findFirst({
      where: { userId: session.user.id },
      include: { household: { include: { familyTrial: true } } },
    });

    if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });

    const isPro = membership.household.is_pro;
    const trial = membership.household.familyTrial;
    const trialActive = trial ? trial.expiresAt > new Date() : false;
    if (!isPro && !trialActive) {
      return NextResponse.json({ error: "Trial or Pro required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, quantity, category: explicitCategory } = body ?? {};

    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

    // Manual category wins and is remembered for next time; otherwise fall
    // back to household memory, then a keyword guess (see shoppingCategories.ts).
    let category: ShoppingCategory;
    if (explicitCategory && VALID_CATEGORIES.includes(explicitCategory)) {
      category = explicitCategory;
      await rememberCategory(membership.householdId, name, category);
    } else {
      category = await resolveCategory(membership.householdId, name);
    }

    const item = await prisma.shoppingListItem.create({
      data: {
        name: name.trim(),
        quantity: quantity?.toString().trim() || null,
        category,
        householdId: membership.householdId,
        addedBy: session.user.id,
      },
      include: {
        adder: { select: { id: true, name: true } },
        purchaser: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error("Shopping list POST error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}

// DELETE /api/family/shopping-list — clears every purchased item ("Clear bought items" button).
// Individual items are deleted via DELETE /api/family/shopping-list/[id].
// The same cleanup also runs automatically ~24h after purchase via the daily cron (see lib/cron.ts) —
// this button is for anyone who wants the list tidy sooner. See PRODUCT_SPEC 4b.8 open-question decision.
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await prisma.householdMember.findFirst({
      where: { userId: session.user.id },
    });
    if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });

    const { count } = await prisma.shoppingListItem.deleteMany({
      where: { householdId: membership.householdId, isPurchased: true },
    });

    return NextResponse.json({ success: true, cleared: count });
  } catch (err) {
    console.error("Shopping list DELETE (clear) error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
