import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveCategoryId, rememberCategory } from "@/lib/shoppingCategories";
import { userCanAccessList, getListMemberIds, type HouseholdRoleStr } from "@/lib/lists";

async function membershipAndAccess(userId: string, listId: string | null) {
  const membership = await prisma.householdMember.findFirst({
    where: { userId },
    include: { household: { include: { familyTrial: true } } },
  });
  if (!membership) return { membership: null, list: null } as const;

  let list = null;
  if (listId) {
    list = await prisma.list.findUnique({ where: { id: listId } });
    if (!list || list.householdId !== membership.householdId || list.kind !== "SHOPPING") list = null;
    else {
      const memberIds = await getListMemberIds(list.id);
      if (!userCanAccessList(list, userId, membership.role as HouseholdRoleStr, memberIds)) list = null;
    }
  }
  return { membership, list } as const;
}

// GET /api/family/shopping-list?listId=xxx
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const listId = searchParams.get("listId");
    if (!listId) return NextResponse.json({ error: "listId required" }, { status: 400 });

    const { membership, list } = await membershipAndAccess(session.user.id, listId);
    if (!membership) return NextResponse.json({ items: [], access: "NO_HOUSEHOLD" });

    const isPro = membership.household.is_pro;
    const trial = membership.household.familyTrial;
    const trialActive = trial ? trial.expiresAt > new Date() : false;
    if (!isPro && !trialActive) return NextResponse.json({ items: [], access: "LOCKED" });

    if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const items = await prisma.shoppingListItem.findMany({
      where: { listId },
      include: {
        adder: { select: { id: true, name: true } },
        purchaser: { select: { id: true, name: true } },
        categoryDef: true,
      },
      // Purchased items sink to the bottom (P0.3); within each group, newest
      // first. Alphabetical sort within a category happens client-side, on
      // top of this ordering.
      orderBy: [{ isPurchased: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ items, access: isPro ? "PRO" : "TRIAL" });
  } catch (err) {
    console.error("Shopping list GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/family/shopping-list — body: { listId, name, quantity?, note?, url?, imageUrl?, categoryId? }
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { listId, name, quantity, note, url, imageUrl, categoryId: explicitCategoryId } = body ?? {};
    if (!listId) return NextResponse.json({ error: "listId required" }, { status: 400 });
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const { membership, list } = await membershipAndAccess(session.user.id, listId);
    if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });

    const isPro = membership.household.is_pro;
    const trial = membership.household.familyTrial;
    const trialActive = trial ? trial.expiresAt > new Date() : false;
    if (!isPro && !trialActive) return NextResponse.json({ error: "Trial or Pro required" }, { status: 403 });
    if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Manual category wins and is remembered for next time; otherwise fall
    // back to household memory, then a keyword guess (see shoppingCategories.ts).
    let categoryId: string | null;
    if (explicitCategoryId !== undefined) {
      categoryId = explicitCategoryId || null;
      await rememberCategory(membership.householdId, name, categoryId);
    } else {
      categoryId = await resolveCategoryId(membership.householdId, name);
    }

    const item = await prisma.shoppingListItem.create({
      data: {
        name: name.trim(),
        quantity: quantity?.toString().trim() || null,
        note: note?.toString().trim() || null,
        url: url?.toString().trim() || null,
        imageUrl: imageUrl?.toString().trim() || null,
        categoryId,
        listId,
        householdId: membership.householdId,
        addedBy: session.user.id,
      },
      include: {
        adder: { select: { id: true, name: true } },
        purchaser: { select: { id: true, name: true } },
        categoryDef: true,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error("Shopping list POST error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}

// DELETE /api/family/shopping-list?listId=xxx — clears every purchased item
// in that list ("Clear bought items" button). Individual items are deleted
// via DELETE /api/family/shopping-list/[id].
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const listId = searchParams.get("listId");
    if (!listId) return NextResponse.json({ error: "listId required" }, { status: 400 });

    const { membership, list } = await membershipAndAccess(session.user.id, listId);
    if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });
    if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { count } = await prisma.shoppingListItem.deleteMany({
      where: { listId, isPurchased: true },
    });

    return NextResponse.json({ success: true, cleared: count });
  } catch (err) {
    console.error("Shopping list DELETE (clear) error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

