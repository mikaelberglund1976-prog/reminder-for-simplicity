import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADULT_ROLES = ["OWNER", "PARENT", "ADULT"];

// Fields a child is allowed to see about their OWN wishlist items.
// Deliberately excludes status/reservedBy/reservedAt/purchasedBy/purchasedAt —
// P0.6 in the 2026-07-27 order requires that a child never learns whether
// something on their list has been reserved or bought, so we strip those
// fields on the server rather than just hiding them in the UI.
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

// GET /api/family/wishlist
// Child role -> { access, role: "CHILD", items: [...] }              (own list, no status fields)
// Adult role -> { access, role: "ADULT", children: [{ childId, childName, items: [...] }] }  (all children, full status)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await prisma.householdMember.findFirst({
      where: { userId: session.user.id },
      include: { household: { include: { familyTrial: true } } },
    });

    if (!membership) return NextResponse.json({ access: "NO_HOUSEHOLD" });

    const { household } = membership;
    const isPro = household.is_pro;
    const trial = household.familyTrial;
    const trialActive = trial ? trial.expiresAt > new Date() : false;

    if (!isPro && !trialActive) {
      return NextResponse.json({ access: "LOCKED" });
    }

    const isChild = membership.role === "CHILD";
    const isAdult = ADULT_ROLES.includes(membership.role);

    if (isChild) {
      const items = await prisma.wishlistItem.findMany({
        where: { householdId: membership.householdId, childId: session.user.id },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({
        access: isPro ? "PRO" : "TRIAL",
        role: "CHILD",
        items: items.map(toChildSafeItem),
      });
    }

    if (!isAdult) {
      // MEMBER role (e.g. extended family added manually) has no defined view here yet.
      return NextResponse.json({ access: isPro ? "PRO" : "TRIAL", role: "NONE", children: [] });
    }

    const childMembers = await prisma.householdMember.findMany({
      where: { householdId: membership.householdId, role: "CHILD" },
      include: { user: { select: { id: true, name: true } } },
    });

    const allItems = await prisma.wishlistItem.findMany({
      where: { householdId: membership.householdId },
      include: {
        reserver: { select: { id: true, name: true } },
        purchaser: { select: { id: true, name: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    const children = childMembers.map((cm) => ({
      childId: cm.user.id,
      childName: cm.user.name ?? "Child",
      items: allItems.filter((i) => i.childId === cm.user.id),
    }));

    return NextResponse.json({ access: isPro ? "PRO" : "TRIAL", role: "ADULT", children });
  } catch (err) {
    console.error("Wishlist GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/family/wishlist
// Only children add to their own wishlist (P0.5) — it's their list, not a
// shared family one. Adults help via the Family screen but don't add wishes
// on a child's behalf in v1; revisit if that turns out to matter in practice.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await prisma.householdMember.findFirst({
      where: { userId: session.user.id },
      include: { household: { include: { familyTrial: true } } },
    });

    if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });
    if (membership.role !== "CHILD") {
      return NextResponse.json({ error: "Only a child's own profile can add to their wishlist" }, { status: 403 });
    }

    const isPro = membership.household.is_pro;
    const trial = membership.household.familyTrial;
    const trialActive = trial ? trial.expiresAt > new Date() : false;
    if (!isPro && !trialActive) {
      return NextResponse.json({ error: "Trial or Pro required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, url, price, imageUrl, note } = body ?? {};

    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const item = await prisma.wishlistItem.create({
      data: {
        name: name.trim(),
        url: url?.toString().trim() || null,
        price: price != null && price !== "" ? Number(price) : null,
        imageUrl: imageUrl?.toString().trim() || null,
        note: note?.toString().trim() || null,
        householdId: membership.householdId,
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
