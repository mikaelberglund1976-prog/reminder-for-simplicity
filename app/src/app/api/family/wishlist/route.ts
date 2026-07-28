import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userCanAccessList, getListMemberIds, type HouseholdRoleStr } from "@/lib/lists";

// Fields a child is allowed to see about their OWN wishlist items.
// Deliberately excludes status/reservedBy/reservedAt/purchasedBy/purchasedAt —
// P0.6 in the 2026-07-27 order requires that a child never learns whether
// something on their list has been reserved or bought, so we strip those
// fields on the server rather than just hiding them in the UI. This applies
// no matter whose list it is — a child viewing their own list never sees
// status, full stop.
function toChildSafeItem(item: {
  id: string; name: string; url: string | null; price: number | null;
  currency: string | null; imageUrl: string | null; note: string | null;
  createdAt: Date; updatedAt: Date;
}) {
  return {
    id: item.id,
    name: item.name,
    url: item.url,
    price: item.price,
    currency: item.currency,
    imageUrl: item.imageUrl,
    note: item.note,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function membershipAndAccess(userId: string, listId: string | null) {
  const membership = await prisma.householdMember.findFirst({
    where: { userId },
    include: { household: { include: { familyTrial: true } } },
  });
  if (!membership) return { membership: null, list: null } as const;

  let list = null;
  if (listId) {
    list = await prisma.list.findUnique({ where: { id: listId } });
    if (!list || list.householdId !== membership.householdId || list.kind !== "WISHLIST") list = null;
    else {
      const memberIds = await getListMemberIds(list.id);
      if (!userCanAccessList(list, userId, membership.role as HouseholdRoleStr, memberIds)) list = null;
    }
  }
  return { membership, list } as const;
}

// GET /api/family/wishlist?listId=xxx
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const listId = searchParams.get("listId");
    if (!listId) return NextResponse.json({ error: "listId required" }, { status: 400 });

    const { membership, list } = await membershipAndAccess(session.user.id, listId);
    if (!membership) return NextResponse.json({ access: "NO_HOUSEHOLD" });

    const isPro = membership.household.is_pro;
    const trial = membership.household.familyTrial;
    const trialActive = trial ? trial.expiresAt > new Date() : false;
    if (!isPro && !trialActive) return NextResponse.json({ access: "LOCKED" });
    if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isChildRequester = membership.role === "CHILD";
    const items = await prisma.wishlistItem.findMany({
      where: { listId },
      include: isChildRequester ? undefined : {
        reserver: { select: { id: true, name: true } },
        purchaser: { select: { id: true, name: true } },
      },
      orderBy: isChildRequester ? { createdAt: "desc" } : [{ status: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      access: isPro ? "PRO" : "TRIAL",
      items: isChildRequester ? items.map(toChildSafeItem) : items,
    });
  } catch (err) {
    console.error("Wishlist GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/family/wishlist — body: { listId, name, url?, price?, imageUrl?, note? }
// Only the list's owning child can add to it (P0.5) — it's their list, not a
// shared family one. Adults help set lists up via /api/family/lists but
// don't add wishes on a child's behalf in v1; revisit if that turns out to matter.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { listId, name, url, price, imageUrl, note } = body ?? {};
    if (!listId) return NextResponse.json({ error: "listId required" }, { status: 400 });
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const { membership, list } = await membershipAndAccess(session.user.id, listId);
    if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });

    const isPro = membership.household.is_pro;
    const trial = membership.household.familyTrial;
    const trialActive = trial ? trial.expiresAt > new Date() : false;
    if (!isPro && !trialActive) return NextResponse.json({ error: "Trial or Pro required" }, { status: 403 });
    if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (list.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Only the list's owner can add to their wishlist" }, { status: 403 });
    }

    const item = await prisma.wishlistItem.create({
      data: {
        name: name.trim(),
        url: url?.toString().trim() || null,
        price: price != null && price !== "" ? Number(price) : null,
        imageUrl: imageUrl?.toString().trim() || null,
        note: note?.toString().trim() || null,
        householdId: membership.householdId,
        listId,
        childId: session.user.id,
        addedBy: session.user.id,
      },
    });

    return NextResponse.json(toChildSafeItem(item), { status: 201 });
  } catch (err) {
    console.error("Wishlist POST error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}

