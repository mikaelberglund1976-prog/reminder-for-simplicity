import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { showsAds } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

// GET /api/ads?placement=home — 2026-09-28. Returns at most one active ad for
// this placement (or "any"), or { ad: null } when the viewer shouldn't see
// ads (child, Pro, trial, ad-free) or none is running. Counts an impression.
// Nothing about the viewer is stored or sent to the advertiser.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ad: null });

  const placement = new URL(req.url).searchParams.get("placement") ?? "any";
  const [user, membership] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { isChildProfile: true } }),
    prisma.householdMember.findFirst({ where: { userId: session.user.id }, include: { household: { include: { familyTrial: true } } } }),
  ]);
  const isChild = !!user?.isChildProfile || membership?.role === "CHILD";
  if (!showsAds(membership?.household ?? null, isChild)) return NextResponse.json({ ad: null });

  const now = new Date();
  const ads = await prisma.ad.findMany({
    where: {
      active: true,
      placement: { in: [placement, "any"] },
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      ],
    },
    select: { id: true, title: true, body: true, imageUrl: true, ctaLabel: true, advertiser: true },
  });
  if (ads.length === 0) return NextResponse.json({ ad: null });

  const ad = ads[Math.floor(Math.random() * ads.length)];
  await prisma.ad.update({ where: { id: ad.id }, data: { impressions: { increment: 1 } } }).catch(() => {});
  return NextResponse.json({ ad });
}
