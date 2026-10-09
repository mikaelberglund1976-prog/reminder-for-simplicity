import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFamilyAccess } from "@/lib/entitlements";
import { ensureGuestTable } from "@/lib/wishlistGuests";

// 2026-10-09: a relative reserves / un-reserves / marks a wish as bought.
// PATCH { action: "reserve" | "unreserve" | "bought" }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const uid = session?.user?.id;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const action = body?.action;
  if (!["reserve", "unreserve", "bought"].includes(action)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const item = await prisma.wishlistItem.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await ensureGuestTable();
  const access = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT "id" FROM "wishlist_guests" WHERE "userId" = $1 AND "householdId" = $2 AND "childId" = $3 LIMIT 1`, uid, item.householdId, item.childId
  );
  if (!access.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const household = await prisma.household.findUnique({ where: { id: item.householdId }, include: { familyTrial: true } });
  if (!hasFamilyAccess(household)) return NextResponse.json({ error: "Wishlists are part of Pro" }, { status: 403 });

  const now = new Date();
  const mine = item.reservedBy === uid || item.purchasedBy === uid;
  if (action === "reserve") {
    if (item.status !== "WANTED") return NextResponse.json({ error: "Someone else got there first" }, { status: 409 });
    await prisma.wishlistItem.update({ where: { id: item.id }, data: { status: "RESERVED", reservedBy: uid, reservedAt: now } });
  } else if (action === "unreserve") {
    if (!mine) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    await prisma.wishlistItem.update({ where: { id: item.id }, data: { status: "WANTED", reservedBy: null, reservedAt: null, purchasedBy: null, purchasedAt: null } });
  } else {
    if (item.status !== "WANTED" && !mine) return NextResponse.json({ error: "Someone else got there first" }, { status: 409 });
    await prisma.wishlistItem.update({ where: { id: item.id }, data: { status: "PURCHASED", purchasedBy: uid, purchasedAt: now, reservedBy: item.reservedBy ?? uid, reservedAt: item.reservedAt ?? now } });
  }
  return NextResponse.json({ ok: true });
}
