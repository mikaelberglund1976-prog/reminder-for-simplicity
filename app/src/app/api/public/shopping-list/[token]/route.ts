import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCategoryId } from "@/lib/shoppingCategories";

// Public, token-gated shopping list access — no login required. Used for the
// "share this list" link (e.g. with a relative or babysitter who isn't a
// household member/account holder). The token is a 24-char random string
// (see /api/family/shopping-list/share), unguessable in practice, same trust
// model as HouseholdInvite's token.
//
// Deliberately doesn't re-check Pro/trial status here: creating the link in
// the first place already required the household to have access, and this
// is a convenience surface for people the household explicitly chose to
// share with, not a way to route around the paywall.

async function householdForToken(token: string) {
  return prisma.household.findUnique({ where: { shoppingListShareToken: token } });
}

// GET /api/public/shopping-list/[token]
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  try {
    const household = await householdForToken(params.token);
    if (!household) return NextResponse.json({ error: "Link not found or revoked" }, { status: 404 });

    const items = await prisma.shoppingListItem.findMany({
      where: { householdId: household.id },
      include: { adder: { select: { id: true, name: true } }, categoryDef: true },
      orderBy: [{ isPurchased: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ items, householdName: household.name ?? "the family" });
  } catch (err) {
    console.error("Public shopping list GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/public/shopping-list/[token] — add an item.
export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const household = await householdForToken(params.token);
    if (!household) return NextResponse.json({ error: "Link not found or revoked" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const { name, quantity } = body ?? {};
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const categoryId = await resolveCategoryId(household.id, name);

    // Guests don't have a User account, but addedBy is a required FK on
    // ShoppingListItem. We attribute the item to whichever household member
    // happens to be first — not perfectly accurate, but harmless: the public
    // page never shows "Added by" for guest actions anyway (see /shop/[token]),
    // and inside the app it just reads as "added by a household member".
    const anyMember = await prisma.householdMember.findFirst({ where: { householdId: household.id } });
    if (!anyMember) return NextResponse.json({ error: "Household has no members" }, { status: 400 });

    const item = await prisma.shoppingListItem.create({
      data: {
        name: name.trim(),
        quantity: quantity?.toString().trim() || null,
        categoryId,
        householdId: household.id,
        addedBy: anyMember.userId,
      },
      include: { adder: { select: { id: true, name: true } }, categoryDef: true },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error("Public shopping list POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
