import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteImage, imageResponseHeaders, loadImage, parseDataUrl, saveImage } from "@/lib/media";

export const dynamic = "force-dynamic";

// The family's home-screen photo. Everyone in the family sees it; adults
// can change it. 2026-09-28 (row 40).
async function household(userId: string) {
  return prisma.householdMember.findFirst({ where: { userId } });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse(null, { status: 401 });
  const m = await household(session.user.id);
  if (!m) return new NextResponse(null, { status: 404 });
  const img = await loadImage("header", m.householdId).catch(() => null);
  if (!img) return new NextResponse(null, { status: 404 });
  const body = Buffer.from(img.data);
  return new NextResponse(body, { status: 200, headers: imageResponseHeaders(img.mime, body.length) });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const m = await household(session.user.id);
  if (!m) return NextResponse.json({ error: "Create your family first" }, { status: 400 });
  if (!["OWNER", "PARENT", "ADULT"].includes(m.role)) return NextResponse.json({ error: "Only adults can change the family photo" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const parsed = parseDataUrl(body?.dataUrl, "header");
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const saved = await saveImage("header", m.householdId, parsed.mime, parsed.data);
    return NextResponse.json({ version: saved.updatedAt.getTime() });
  } catch (err) {
    console.error("Header save error:", err);
    return NextResponse.json({ error: "Couldn't save the picture" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const m = await household(session.user.id);
  if (!m || !["OWNER", "PARENT", "ADULT"].includes(m.role)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  await deleteImage("header", m.householdId);
  return NextResponse.json({ success: true });
}
