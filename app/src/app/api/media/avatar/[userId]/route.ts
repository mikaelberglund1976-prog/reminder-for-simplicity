import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteImage, imageResponseHeaders, loadImage, parseDataUrl, saveImage } from "@/lib/media";

export const dynamic = "force-dynamic";

// Who may see / change a person's profile picture: the person themselves,
// anyone in the same family can see it, and a parent (OWNER/PARENT) can set
// one for a child. 2026-09-28 (row 40).
async function access(viewerId: string, targetId: string) {
  if (viewerId === targetId) return { canView: true, canEdit: true };
  const viewer = await prisma.householdMember.findFirst({ where: { userId: viewerId } });
  if (!viewer) return { canView: false, canEdit: false };
  const target = await prisma.householdMember.findFirst({ where: { userId: targetId, householdId: viewer.householdId } });
  if (!target) return { canView: false, canEdit: false };
  const canEdit = ["OWNER", "PARENT"].includes(viewer.role) && target.role === "CHILD";
  return { canView: true, canEdit };
}

export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse(null, { status: 401 });
  const a = await access(session.user.id, params.userId);
  if (!a.canView) return new NextResponse(null, { status: 404 });
  const img = await loadImage("avatar", params.userId).catch(() => null);
  if (!img) return new NextResponse(null, { status: 404 });
  const body = Buffer.from(img.data);
  return new NextResponse(body, { status: 200, headers: imageResponseHeaders(img.mime, body.length) });
}

export async function PUT(req: Request, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const a = await access(session.user.id, params.userId);
  if (!a.canEdit) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const parsed = parseDataUrl(body?.dataUrl, "avatar");
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const saved = await saveImage("avatar", params.userId, parsed.mime, parsed.data);
    return NextResponse.json({ version: saved.updatedAt.getTime() });
  } catch (err) {
    console.error("Avatar save error:", err);
    return NextResponse.json({ error: "Couldn't save the picture" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const a = await access(session.user.id, params.userId);
  if (!a.canEdit) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  await deleteImage("avatar", params.userId);
  return NextResponse.json({ success: true });
}
