import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFamilyAccess } from "@/lib/entitlements";
import { sharesForUser } from "@/lib/wishlistGuests";

// 2026-10-09: wishlists shared with me as a relative ("guest").
// GET → { shares: [{ id, childName, familyName, items: [...] }] }
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session as { impersonator?: unknown }).impersonator) return NextResponse.json({ shares: [] });
  // Impersonation ("view as") never binds invites to someone else's account.
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true, emailVerified: true } });
  if (!user?.emailVerified) return NextResponse.json({ shares: [] });
  try {
    const rows = await sharesForUser(user.id, user.email);
    const shares = [];
    for (const g of rows) {
      const household = await prisma.household.findUnique({ where: { id: g.householdId }, include: { familyTrial: true } });
      const stillChild = await prisma.householdMember.findFirst({ where: { householdId: g.householdId, userId: g.childId }, include: { user: { select: { name: true } } } });
      if (!household || !stillChild) continue;
      if (!hasFamilyAccess(household)) { shares.push({ id: g.id, childName: stillChild.user.name?.split(" ")[0] ?? "", familyName: household.name, paused: true, items: [] }); continue; }
      const items = await prisma.wishlistItem.findMany({
        where: { householdId: g.householdId, childId: g.childId },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, url: true, price: true, currency: true, imageUrl: true, note: true, status: true, reservedBy: true, purchasedBy: true },
      });
      shares.push({
        id: g.id,
        childName: stillChild.user.name?.split(" ")[0] ?? "",
        familyName: household.name,
        paused: false,
        items: items.map((i) => ({
          id: i.id, name: i.name, url: i.url, price: i.price, currency: i.currency, imageUrl: i.imageUrl, note: i.note,
          status: i.status,
          mine: i.reservedBy === user.id || i.purchasedBy === user.id,
        })),
      });
    }
    return NextResponse.json({ shares });
  } catch (err) {
    console.error("Gifts GET error:", err);
    return NextResponse.json({ error: "Couldn't load wishlists" }, { status: 500 });
  }
}
