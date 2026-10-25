import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WISHLIST_LINK_ENABLED, activeLinkForList, createLink, revokeLinks } from "@/lib/wishlistLinks";

export const dynamic = "force-dynamic";
const ADULT = ["OWNER", "PARENT", "ADULT"];
const APP_URL = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://assistiq.se";

// 2026-10-25 (masterbrief §20, behind FEATURE_WISHLIST_LINK): the share link of
// one wishlist. GET ?listId → { enabled, link }, POST { listId } → new link
// (replaces the old one), DELETE ?listId → revoke. Adults in the family only.
async function ctx(listId: string | null) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !listId) return null;
  const m = await prisma.householdMember.findFirst({ where: { userId: session.user.id } });
  if (!m || !ADULT.includes(m.role)) return null;
  const list = await prisma.list.findFirst({ where: { id: listId, householdId: m.householdId, kind: "WISHLIST" } });
  return list ? { userId: session.user.id, householdId: m.householdId, list } : null;
}
const out = (l: { token: string; expiresAt: Date } | null) => (l ? { url: `${APP_URL}/w/${l.token}`, expiresAt: l.expiresAt } : null);

export async function GET(req: Request) {
  if (!WISHLIST_LINK_ENABLED) return NextResponse.json({ enabled: false });
  const c = await ctx(new URL(req.url).searchParams.get("listId"));
  if (!c) return NextResponse.json({ enabled: true, link: null, allowed: false });
  return NextResponse.json({ enabled: true, allowed: true, link: out(await activeLinkForList(c.list.id)) });
}

export async function POST(req: Request) {
  if (!WISHLIST_LINK_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const c = await ctx(typeof body?.listId === "string" ? body.listId : null);
  if (!c) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  return NextResponse.json({ link: out(await createLink(c.householdId, c.list.id, c.userId)) });
}

export async function DELETE(req: Request) {
  if (!WISHLIST_LINK_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const c = await ctx(new URL(req.url).searchParams.get("listId"));
  if (!c) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  await revokeLinks(c.list.id);
  return NextResponse.json({ link: null });
}
