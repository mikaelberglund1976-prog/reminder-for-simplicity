import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WISHLIST_LINK_ENABLED, linkByToken, reserveAsGuest } from "@/lib/wishlistLinks";
import { checkRateLimit, recordFailedAttempt } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// 2026-10-25 (masterbrief §20, behind FEATURE_WISHLIST_LINK): the public,
// no-login view of ONE shared wishlist. Shows only that list: its name, the
// child's first name, the wishes and whether each is taken. Never who took
// it, never anything else of the family.
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  if (!WISHLIST_LINK_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const link = await linkByToken(params.token);
  if (!link) return NextResponse.json({ error: "This link has expired or been turned off" }, { status: 404 });
  const list = await prisma.list.findUnique({ where: { id: link.listId }, include: { owner: { select: { name: true } } } });
  if (!list) return NextResponse.json({ error: "This link has expired or been turned off" }, { status: 404 });
  const items = await prisma.wishlistItem.findMany({ where: { listId: list.id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, url: true, price: true, currency: true, imageUrl: true, note: true, status: true } });
  return NextResponse.json({
    listName: list.name,
    childName: (list.owner?.name ?? "").split(" ")[0] || null,
    items: items.map((i) => ({ id: i.id, name: i.name, url: i.url, price: i.price, currency: i.currency, imageUrl: i.imageUrl, note: i.note, taken: i.status !== "WANTED" })),
  });
}

// POST { itemId, name } — reserve one wish with just a name.
export async function POST(req: Request, { params }: { params: { token: string } }) {
  if (!WISHLIST_LINK_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const key = `wishlink:${params.token.slice(0, 12)}`;
  try { checkRateLimit(key); } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 429 }); }
  const link = await linkByToken(params.token);
  if (!link) { recordFailedAttempt(key); return NextResponse.json({ error: "This link has expired or been turned off" }, { status: 404 }); }
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Write your name so the family knows" }, { status: 400 });
  if (typeof body?.itemId !== "string") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const ok = await reserveAsGuest(link, body.itemId, name);
  if (!ok) return NextResponse.json({ error: "Someone already took that one" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
