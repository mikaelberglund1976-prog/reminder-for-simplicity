import { NextResponse } from "next/server";
import { requireAdult } from "../_auth";
import { clearImported, deleteFeed, getFeed, MANUAL_SYNC_MIN_MS, syncFeed } from "@/lib/schoolFeeds";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// 2026-10-10: keyed by link (a child can have several), not by child.
async function feedInFamily(householdId: string, feedId: string) {
  const feed = await getFeed(feedId);
  return feed && feed.householdId === householdId ? feed : null;
}

// POST /api/family/school-feeds/[feedId] { action: "sync" | "clear" }
//   sync  — fetch now (at most every 10 minutes; otherwise once a day by cron)
//   clear — remove everything this link imported (hand-made items stay),
//           e.g. before re-syncing with another selection on the platform
export async function POST(req: Request, { params }: { params: { feedId: string } }) {
  const a = await requireAdult();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const feed = await feedInFamily(a.householdId, params.feedId);
  if (!feed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const action = body?.action;
  try {
    if (action === "clear") {
      const removed = await clearImported(feed.id);
      return NextResponse.json({ removed });
    }
    if (action === "sync") {
      if (feed.lastSyncAt && Date.now() - new Date(feed.lastSyncAt).getTime() < MANUAL_SYNC_MIN_MS) {
        return NextResponse.json({ error: "Just synced — try again in a few minutes" }, { status: 429 });
      }
      const result = await syncFeed(feed);
      return NextResponse.json({ result });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("School feed action error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// DELETE /api/family/school-feeds/[feedId]?clear=1 — disconnect one link;
// with clear=1 also remove what it imported.
export async function DELETE(req: Request, { params }: { params: { feedId: string } }) {
  const a = await requireAdult();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const feed = await feedInFamily(a.householdId, params.feedId);
  if (!feed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (new URL(req.url).searchParams.get("clear") === "1") await clearImported(feed.id);
  await deleteFeed(feed.id);
  return NextResponse.json({ success: true });
}
