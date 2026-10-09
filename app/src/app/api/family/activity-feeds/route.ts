import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { childInFamily, requireAdult } from "../school-feeds/_auth";
import {
  MAX_FEEDS_PER_CHILD, activityImportedCount, countFeedsForChild, createActivityFeed,
  listActivityFeeds, maskActivityUrl, normalizeActivityUrl, syncActivityFeed,
} from "@/lib/activityFeeds";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function cleanLabel(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, 40) : null;
}

// GET /api/family/activity-feeds — per child: their calendar links (max 3),
// last sync and how many upcoming activities each brought in. The links
// themselves never leave the server.
export async function GET() {
  const a = await requireAdult();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  try {
    const [children, feeds] = await Promise.all([
      prisma.householdMember.findMany({ where: { householdId: a.householdId, role: "CHILD" }, include: { user: { select: { id: true, name: true, email: true } } } }),
      listActivityFeeds(a.householdId),
    ]);
    const out = await Promise.all(children.map(async (c) => ({
      childId: c.userId,
      name: c.user.name ?? c.user.email.split("@")[0],
      feeds: await Promise.all(feeds.filter((f) => f.childId === c.userId).map(async (f) => ({
        id: f.id,
        label: f.label,
        host: maskActivityUrl(f.url),
        lastSyncAt: f.lastSyncAt,
        lastStatus: f.lastStatus,
        upcoming: await activityImportedCount(f.id),
      }))),
    })));
    return NextResponse.json({ children: out, max: MAX_FEEDS_PER_CHILD });
  } catch (err) {
    console.error("Activity feeds GET error:", err);
    return NextResponse.json({ error: "Couldn't load calendar links" }, { status: 500 });
  }
}

// POST /api/family/activity-feeds { childId, url, label? } — add a link for a
// child (max 3) and fetch it right away.
export async function POST(req: Request) {
  const a = await requireAdult();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const body = await req.json().catch(() => ({}));
  const childId = typeof body?.childId === "string" ? body.childId : "";
  if (!childId || !(await childInFamily(a.householdId, childId))) {
    return NextResponse.json({ error: "Pick one of your children" }, { status: 400 });
  }
  const n = normalizeActivityUrl(body?.url);
  if ("error" in n) return NextResponse.json({ error: n.error }, { status: 400 });
  try {
    if ((await countFeedsForChild(childId)) >= MAX_FEEDS_PER_CHILD) {
      return NextResponse.json({ error: "Max 3 calendar links per child" }, { status: 400 });
    }
    const feed = await createActivityFeed(a.householdId, childId, n.url, cleanLabel(body?.label), a.userId);
    const result = await syncActivityFeed(feed);
    return NextResponse.json({ result, id: feed.id });
  } catch (err) {
    console.error("Activity feed POST error:", err);
    return NextResponse.json({ error: "Couldn't save the link" }, { status: 500 });
  }
}
