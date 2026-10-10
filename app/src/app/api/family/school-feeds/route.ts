import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { childInFamily, requireAdult } from "./_auth";
import { importedCount, listFeeds, MAX_FEEDS_PER_CHILD, maskUrl, normalizeFeedUrl, providerLabel, saveFeed, syncFeed } from "@/lib/schoolFeeds";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// GET /api/family/school-feeds — per child: its school links (SchoolSoft,
// Studybee …) and their last sync. The links themselves never go to the browser.
// 2026-10-10: a child can have several links (`feeds`); `connected` stays for
// older callers (StartGuide).
export async function GET() {
  const a = await requireAdult();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  try {
    const [children, feeds] = await Promise.all([
      prisma.householdMember.findMany({ where: { householdId: a.householdId, role: "CHILD" }, include: { user: { select: { id: true, name: true, email: true } } } }),
      listFeeds(a.householdId),
    ]);
    const out = await Promise.all(children.map(async (c) => {
      const mine = feeds.filter((x) => x.childId === c.userId);
      return {
        childId: c.userId,
        name: c.user.name ?? c.user.email.split("@")[0],
        connected: mine.length > 0,
        feeds: await Promise.all(mine.map(async (f) => ({
          id: f.id,
          provider: f.provider,
          label: providerLabel(f.provider),
          host: maskUrl(f.url),
          lastSyncAt: f.lastSyncAt,
          lastStatus: f.lastStatus,
          imported: await importedCount(f.id),
        }))),
      };
    }));
    return NextResponse.json({ children: out, maxPerChild: MAX_FEEDS_PER_CHILD });
  } catch (err) {
    console.error("School feeds GET error:", err);
    return NextResponse.json({ error: "Couldn't load school links" }, { status: 500 });
  }
}

// POST /api/family/school-feeds { childId, url } — add a school link for a
// child and fetch it right away (the same link again just re-syncs).
export async function POST(req: Request) {
  const a = await requireAdult();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const body = await req.json().catch(() => ({}));
  const childId = typeof body?.childId === "string" ? body.childId : "";
  if (!childId || !(await childInFamily(a.householdId, childId))) {
    return NextResponse.json({ error: "Pick one of your children" }, { status: 400 });
  }
  const n = normalizeFeedUrl(body?.url);
  if ("error" in n) return NextResponse.json({ error: n.error }, { status: 400 });
  try {
    const feed = await saveFeed(a.householdId, childId, n.url, n.provider, a.userId);
    if ("error" in feed) return NextResponse.json({ error: feed.error }, { status: 400 });
    const result = await syncFeed(feed);
    return NextResponse.json({ result, provider: feed.provider });
  } catch (err) {
    console.error("School feed POST error:", err);
    return NextResponse.json({ error: "Couldn't save the link" }, { status: 500 });
  }
}
