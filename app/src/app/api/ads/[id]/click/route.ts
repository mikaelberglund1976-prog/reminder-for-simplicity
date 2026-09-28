import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/ads/[id]/click — counts a click and sends the viewer on to the
// advertiser. Only http(s) targets set by the admin are followed.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ad = await prisma.ad.findUnique({ where: { id: params.id } });
  if (!ad || !/^https?:\/\//i.test(ad.url)) return NextResponse.redirect(new URL("/dashboard", _req.url));
  await prisma.ad.update({ where: { id: ad.id }, data: { clicks: { increment: 1 } } }).catch(() => {});
  return NextResponse.redirect(ad.url);
}
