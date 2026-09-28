import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin, parseAd } from "@/lib/ads";

export const dynamic = "force-dynamic";

// PATCH /api/admin/ads/[id] — full update, or { active } to pause/resume.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (Object.keys(body).length === 1 && typeof body.active === "boolean") {
    const ad = await prisma.ad.update({ where: { id: params.id }, data: { active: body.active } });
    return NextResponse.json({ ad });
  }
  const parsed = parseAd(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const ad = await prisma.ad.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json({ ad });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  await prisma.ad.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
