import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin, parseAd } from "@/lib/ads";

export const dynamic = "force-dynamic";

// GET /api/admin/ads — all ads with stats. POST — create.
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const ads = await prisma.ad.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ ads });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const parsed = parseAd(await req.json().catch(() => ({})));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const ad = await prisma.ad.create({ data: parsed.data });
  return NextResponse.json({ ad }, { status: 201 });
}
