import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runTomorrowDigest } from "@/lib/tomorrowDigest";
import { syncAllFeeds } from "@/lib/schoolFeeds";
import { syncAllActivityFeeds } from "@/lib/activityFeeds";
import { notifyChanges } from "@/lib/changeWatch";

// 2026-10-09: evening run (17:00 UTC) — "tomorrow" push notifications.
// 2026-10-11: the change watch — school and club calendars are synced again
// here (those not synced in the last 6 h) so a match moved during the day is
// caught the same evening, and the "tomorrow" push shows the new time.
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
  const log: string[] = [];
  const deadline = Date.now() + 30_000; // leave time for the digest
  const sixHours = 6 * 60 * 60 * 1000;
  try {
    const s = await syncAllFeeds({ maxAgeMs: sixHours, deadline });
    const a = await syncAllActivityFeeds({ maxAgeMs: sixHours, deadline });
    log.push(`Evening sync: school ${s.synced}/${s.failed} failed, activities ${a.synced}/${a.failed} failed`);
    log.push(`Change watch: ${await notifyChanges()} pushes`);
  } catch (err) {
    console.error("Evening sync failed:", err);
    log.push(`Evening sync ERROR: ${String(err)}`);
  }
  const digest = await runTomorrowDigest();
  return NextResponse.json({ ...digest, log: [...log, ...digest.log] });
}
