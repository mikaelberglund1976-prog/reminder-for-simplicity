import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/ads";
import { deleteCode, updateCode } from "@/lib/signupCodes";

export const dynamic = "force-dynamic";

// PATCH { note?, maxUses?, expiresAt?, active? } · DELETE — 2026-11-02
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  try {
    const r = await updateCode(params.id, body ?? {});
    if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.error === "Not found" ? 404 : 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Update signup code error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const ok = await deleteCode(params.id);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (err) {
    console.error("Delete signup code error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
