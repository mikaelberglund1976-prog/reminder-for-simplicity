import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runTomorrowDigest } from "@/lib/tomorrowDigest";

// 2026-10-09: evening run (17:00 UTC) — "tomorrow" push notifications.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function isAuthorized(authHeader: string | null): boolean {
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET ?? ""}`);
  const provided = Buffer.from(authHeader ?? "");
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

export async function GET(req: Request) {
  if (!isAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runTomorrowDigest());
}
