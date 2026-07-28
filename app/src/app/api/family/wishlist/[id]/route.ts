import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WishlistStatus } from "@prisma/client";
import { userCanAccessList, getListMemberIds, type HouseholdRoleStr } from "@/lib/lists";

const ADULT_ROLES = ["OWNER", "PARENT", "ADULT"];
const VALID_STATUSES: WishlistStatus[] = ["WANTED", "RESERVED", "PURCHASED"];

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

async function accessibleItem(userId: string, itemId: string) {
  const membership = await prisma.householdMember.findFirst({ where: { userId } });
  if (!membership) return { membership: null, item: null } as const;

  const item = await prisma.wishlistItem.findUnique({ where: { id: itemId } });
  if (!item || item.householdId !== membership.householdId || !item.listId) return { membership, item: null } as const;

  const list = await prisma.list.findUnique({ where: { id: item.listId } });
  if (!list) return { membership, item: null } as const;
  const memberIds = await getListMemberIds(list.id);
  if (!userCanAccessList(list, userId, membership.role as HouseholdRoleStr, memberIds)) return { membership, item: null } as const;

  return { membership, item } as const;
}

// PATCH /api/family/wishlist/[id]
// Body from the owning child: { name?, url?, price?, imageUrl?, note? } — never status.
// Body from an adult: all of the above, plus { status?: "WANTED" | "RESERVED" | "PURCHASED" }.
// A child's own item is ALWAYS returned status-free, even if this same request came from an adult.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { membership, item } = await accessibleItem(session.user.id, params.id);
    if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = item.childId === session.user.id;
    const isAdult = ADULT_ROLES.includes(membership.role);

    if (!isOwner && !isAdult) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, url, price, imageUrl, note, status } = body ?? {};

    const data: Record<string, unknown> = {};
    if (typeof name === "string" && name.trim()) data.name = name.trim();
    if (url !== undefined) data.url = url?.toString().trim() || null;
    if (price !== undefined) data.price = price != null && price !== "" ? Number(price) : null;
    if (imageUrl !== undefined) data.imageUrl = imageUrl?.toString().trim() || null;
    if (note !== undefined) data.note = note?.toString().trim() || null;

    // Only adults can move status — this is the one thing a child must never
    // be able to set on their own list, by design (P0.6/P0.7).
    if (status !== undefined) {
      if (!isAdult) {
        return NextResponse.json({ error: "Only an adult can reserve or mark a wish as bought" }, { status: 403 });
      }
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      data.status = status;
      if (status === "RESERVED") {
        data.reservedBy = session.user.id;
        data.reservedAt = new Date();
      } else if (status === "PURCHASED") {
        data.purchasedBy = session.user.id;
        data.purchasedAt = new Date();
        // Being purchased implies it was at least claimed; keep any existing reservedBy as-is.
        if (!item.reservedBy) {
          data.reservedBy = session.user.id;
          data.reservedAt = new Date();
        }
      } else if (status === "WANTED") {
        data.reservedBy = null;
        data.reservedAt = null;
        data.purchasedBy = null;
        data.purchasedAt = null;
      }
    }

    const updated = await prisma.wishlistItem.update({
      where: { id: params.id },
      data,
      include: {
        reserver: { select: { id: true, name: true } },
        purchaser: { select: { id: true, name: true } },
      },
    });

    if (updated.childId === session.user.id) {
      // The requester is the owning child (adults editing their own item isn't
      // possible since isOwner already covers that) — always strip status.
      return NextResponse.json(toChildSafeItem(updated));
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Wishlist PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/family/wishlist/[id] — owning child or any adult with access to the list can remove a wish.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { membership, item } = await accessibleItem(session.user.id, params.id);
    if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = item.childId === session.user.id;
    const isAdult = ADULT_ROLES.includes(membership.role);
    if (!isOwner && !isAdult) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    await prisma.wishlistItem.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Wishlist DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
