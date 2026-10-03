import { NextResponse } from "next/server";
import { childInFamily, requireAdult } from "../_auth";
import { clearImported, deleteFeed, getFeedForChild, MANUAL_SYNC_MIN_MS, syncFeed } from "@/lib/schoolFeeds";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// POST /api/family/school-feeds/[childId] { action: "sync" | "clear" }
//   sync  — fetch now (at most every 10 minutes; otherwise once a day by cron)
//   clear — remove everything imported for this child (hand-made items stay),
//           e.g. before re-syncing with another selection in SchoolSoft
export async function POST(req: Request, { params }: { params: { childId: string } }) {
  const a = await requireAdult();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  if (!(await childInFamily(a.householdId, params.childId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const action = body?.action;
  try {
    if (action === "clear") {
      const removed = await clearImported(params.childId);
      return NextResponse.json({ removed });
    }
    if (action === "sync") {
      const feed = await getFeedForChild(params.childId);
      if (!feed || feed.householdId !== a.householdId) return NextResponse.json({ error: "No SchoolSoft link for this child" }, { status: 404 });
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

// DELETE /api/family/school-feeds/[childId]?clear=1 — disconnect; with
// clear=1 also remove what was imported.
export async function DELETE(req: Request, { params }: { params: { childId: string } }) {
  const a = await requireAdult();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  if (!(await childInFamily(a.householdId, params.childId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const clear = new URL(req.url).searchParams.get("clear") === "1";
  if (clear) await clearImported(params.childId);
  await deleteFeed(params.childId);
  return NextResponse.json({ success: true });
}
