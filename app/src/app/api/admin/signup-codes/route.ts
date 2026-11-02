import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/ads";
import { INVITE_CODE_REQUIRED, createCode, listCodes } from "@/lib/signupCodes";

export const dynamic = "force-dynamic";

// 2026-11-02: invite codes for new accounts (lib/signupCodes.ts).
// GET — all codes with who used them. POST { code?, note?, maxUses?, expiresAt? }.
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    return NextResponse.json({ required: INVITE_CODE_REQUIRED, codes: await listCodes() });
  } catch (err) {
    console.error("List signup codes error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  try {
    const r = await createCode(body ?? {});
    if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json(r, { status: 201 });
  } catch (err) {
    console.error("Create signup code error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
