import { NextResponse } from "next/server";
import { requireAdult } from "../../school-feeds/_auth";
import {
  MANUAL_SYNC_MIN_MS, clearActivityImports, deleteActivityFeed, getActivityFeed,
  normalizeActivityUrl, syncActivityFeed, updateActivityFeed,
} from "@/lib/activityFeeds";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function own(id: string) {
  const a = await requireAdult();
  if ("error" in a) return { res: NextResponse.json({ error: a.error }, { status: a.status }) } as const;
  const feed = await getActivityFeed(id);
  if (!feed || feed.householdId !== a.householdId) return { res: NextResponse.json({ error: "Not found" }, { status: 404 }) } as const;
  return { feed } as const;
}

// POST /api/family/activity-feeds/[id] { action: "sync" | "clear" }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const o = await own(params.id);
  if ("res" in o) return o.res;
  const body = await req.json().catch(() => ({}));
  try {
    if (body?.action === "clear") return NextResponse.json({ removed: await clearActivityImports(o.feed.id) });
    if (body?.action === "sync") {
      if (o.feed.lastSyncAt && Date.now() - new Date(o.feed.lastSyncAt).getTime() < MANUAL_SYNC_MIN_MS) {
        return NextResponse.json({ error: "Just synced — try again in a few minutes" }, { status: 429 });
      }
      return NextResponse.json({ result: await syncActivityFeed(o.feed) });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("Activity feed action error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// PATCH /api/family/activity-feeds/[id] { label?, url? } — rename, or swap
// the link (then fetch again).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const o = await own(params.id);
  if ("res" in o) return o.res;
  const body = await req.json().catch(() => ({}));
  const patch: { url?: string; label?: string | null } = {};
  if (body?.label !== undefined) patch.label = typeof body.label === "string" && body.label.trim() ? body.label.trim().slice(0, 40) : null;
  if (body?.url !== undefined) {
    const n = normalizeActivityUrl(body.url);
    if ("error" in n) return NextResponse.json({ error: n.error }, { status: 400 });
    patch.url = n.url;
  }
  await updateActivityFeed(o.feed.id, patch);
  if (patch.url) {
    const feed = await getActivityFeed(o.feed.id);
    return NextResponse.json({ result: feed ? await syncActivityFeed(feed) : null });
  }
  return NextResponse.json({ success: true });
}

// DELETE /api/family/activity-feeds/[id]?clear=1 — remove the link; with
// clear=1 also its imported activities.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const o = await own(params.id);
  if ("res" in o) return o.res;
  if (new URL(req.url).searchParams.get("clear") === "1") await clearActivityImports(o.feed.id);
  await deleteActivityFeed(o.feed.id);
  return NextResponse.json({ success: true });
}
