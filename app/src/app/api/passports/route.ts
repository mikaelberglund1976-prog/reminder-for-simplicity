import { NextResponse } from "next/server";
import { tripCtx } from "../trips/_ctx";
import { isYmd, setPassport } from "@/lib/trips";

// 2026-10-11: passport expiry date for the trip checklist — only the date,
// never the number. PUT { userId, expires: "YYYY-MM-DD" | null }.
// Adults for anyone in the family, a child for themselves.
export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  const c = await tripCtx();
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const userId = typeof b?.userId === "string" ? b.userId : "";
  if (!c.people.some((p) => p.id === userId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!c.isAdult && userId !== c.uid) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  await setPassport(userId, isYmd(b?.expires) ? b.expires : null);
  return NextResponse.json({ ok: true });
}
