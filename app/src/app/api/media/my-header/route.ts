import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteImage, imageResponseHeaders, loadImage, parseDataUrl, saveImage } from "@/lib/media";

export const dynamic = "force-dynamic";

// 2026-10-11: a person's own Home picture. Anyone (children too) can set one
// for themselves; it replaces the family header only for them. Removing it
// brings the family header back. Nobody can read or change someone else's.

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse(null, { status: 401 });
  const img = await loadImage("myheader", session.user.id).catch(() => null);
  if (!img) return new NextResponse(null, { status: 404 });
  const body = Buffer.from(img.data);
  return new NextResponse(body, { status: 200, headers: imageResponseHeaders(img.mime, body.length) });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const parsed = parseDataUrl(body?.dataUrl, "myheader");
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const saved = await saveImage("myheader", session.user.id, parsed.mime, parsed.data);
    return NextResponse.json({ version: saved.updatedAt.getTime() });
  } catch (err) {
    console.error("Own header save error:", err);
    return NextResponse.json({ error: "Couldn't save the picture" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await deleteImage("myheader", session.user.id);
  return NextResponse.json({ success: true });
}
