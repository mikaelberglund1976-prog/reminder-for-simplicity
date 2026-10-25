import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdult } from "../school-feeds/_auth";
import { listFeeds, providerLabel } from "@/lib/schoolFeeds";
import { listActivityFeeds, maskActivityUrl } from "@/lib/activityFeeds";

export const dynamic = "force-dynamic";

// 2026-10-25 (masterbrief §45 "Failure must be visible", Etapp 0 G8): school
// and activity links that have stopped syncing, for "Needs your attention"
// on the adult Home. Read-only — nothing is written here. A link counts as a
// problem when its last sync failed, or when it hasn't synced for 48 h (the
// cron runs daily, so one missed run is still fine).
const STALE_MS = 48 * 60 * 60 * 1000;

export type FeedIssue = { id: string; kind: "school" | "activity"; who: string; source: string; lastSyncAt: string | null; failed: boolean };

export async function GET() {
  const a = await requireAdult();
  // Children, no family, no Pro → simply nothing to show.
  if ("error" in a) return NextResponse.json({ issues: [] });
  try {
    const [school, activity, members] = await Promise.all([
      listFeeds(a.householdId).catch(() => []),
      listActivityFeeds(a.householdId).catch(() => []),
      prisma.householdMember.findMany({ where: { householdId: a.householdId }, include: { user: { select: { id: true, name: true, email: true } } } }),
    ]);
    const name = new Map(members.map((m) => [m.userId, (m.user.name ?? m.user.email.split("@")[0]).split(" ")[0]]));
    const now = Date.now();
    const issues: FeedIssue[] = [];
    const check = (id: string, kind: FeedIssue["kind"], childId: string, source: string, createdAt: Date, lastSyncAt: Date | null, lastStatus: string | null) => {
      const failed = !!lastSyncAt && !!lastStatus && lastStatus !== "ok";
      // A link added in the last 48 h that hasn't synced yet isn't stale.
      const stale = (lastSyncAt ? lastSyncAt.getTime() : createdAt.getTime()) < now - STALE_MS;
      if (!failed && !stale) return;
      issues.push({ id, kind, who: name.get(childId) ?? "", source, lastSyncAt: lastSyncAt ? lastSyncAt.toISOString() : null, failed });
    };
    for (const f of school) check(f.id, "school", f.childId, providerLabel(f.provider), new Date(f.createdAt), f.lastSyncAt ? new Date(f.lastSyncAt) : null, f.lastStatus);
    for (const f of activity) check(f.id, "activity", f.childId, f.label || maskActivityUrl(f.url), new Date(f.createdAt), f.lastSyncAt ? new Date(f.lastSyncAt) : null, f.lastStatus);
    return NextResponse.json({ issues: issues.slice(0, 6) });
  } catch (err) {
    console.error("Feed health GET error:", err);
    return NextResponse.json({ issues: [] });
  }
}
