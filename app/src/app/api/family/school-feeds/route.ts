import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { childInFamily, requireAdult } from "./_auth";
import { importedCount, listFeeds, maskUrl, normalizeFeedUrl, saveFeed, syncFeed } from "@/lib/schoolFeeds";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// GET /api/family/school-feeds — per child: connected or not, last sync.
// The link itself is never sent back to the browser.
export async function GET() {
  const a = await requireAdult();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  try {
    const [children, feeds] = await Promise.all([
      prisma.householdMember.findMany({ where: { householdId: a.householdId, role: "CHILD" }, include: { user: { select: { id: true, name: true, email: true } } } }),
      listFeeds(a.householdId),
    ]);
    const out = await Promise.all(children.map(async (c) => {
      const f = feeds.find((x) => x.childId === c.userId);
      return {
        childId: c.userId,
        name: c.user.name ?? c.user.email.split("@")[0],
        connected: !!f,
        host: f ? maskUrl(f.url) : null,
        lastSyncAt: f?.lastSyncAt ?? null,
        lastStatus: f?.lastStatus ?? null,
        imported: f ? await importedCount(c.userId) : 0,
      };
    }));
    return NextResponse.json({ children: out });
  } catch (err) {
    console.error("School feeds GET error:", err);
    return NextResponse.json({ error: "Couldn't load SchoolSoft settings" }, { status: 500 });
  }
}

// POST /api/family/school-feeds { childId, url } — connect (or replace) a
// child's SchoolSoft link and fetch it right away.
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
    const feed = await saveFeed(a.householdId, childId, n.url, a.userId);
    const result = await syncFeed(feed);
    return NextResponse.json({ result });
  } catch (err) {
    console.error("School feed POST error:", err);
    return NextResponse.json({ error: "Couldn't save the link" }, { status: 500 });
  }
}
