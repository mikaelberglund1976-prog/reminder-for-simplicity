import { NextResponse } from "next/server";
import { turnOffEmail, verifyUnsubscribe } from "@/lib/notifyPrefs";

// 2026-10-22: "Stop emails about …" from the link in an email — no login
// needed, the link is signed for that person and kind (lib/notifyPrefs.ts).
// POST { u, k, s }
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const ok = verifyUnsubscribe(body?.u, body?.k, body?.s);
  if (!ok) return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  try {
    await turnOffEmail(ok.userId, ok.kind);
    return NextResponse.json({ ok: true, kind: ok.kind });
  } catch (err) {
    console.error("Email off error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
