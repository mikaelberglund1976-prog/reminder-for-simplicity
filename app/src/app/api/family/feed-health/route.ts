import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdult } from "../school-feeds/_auth";
import { listSources, sourceProblem } from "@/lib/feedSources";

export const dynamic = "force-dynamic";

// 2026-10-25 (masterbrief §45 "Failure must be visible", Etapp 0 G8): school
// and activity links that have stopped syncing, for "Needs your attention"
// on the adult Home. Read-only — nothing is written here. A link counts as a
// problem when its last sync failed, or when it hasn't synced for 48 h (the
// cron runs daily, so one missed run is still fine).
// 2026-10-25 (G3): reads the family's sources through lib/feedSources.ts.

export type FeedIssue = { id: string; kind: "school" | "activity"; who: string; source: string; lastSyncAt: string | null; failed: boolean };

export async function GET() {
  const a = await requireAdult();
  // Children, no family, no Pro → simply nothing to show.
  if ("error" in a) return NextResponse.json({ issues: [] });
  try {
    const [sources, members] = await Promise.all([
      listSources(a.householdId),
      prisma.householdMember.findMany({ where: { householdId: a.householdId }, include: { user: { select: { id: true, name: true, email: true } } } }),
    ]);
    const name = new Map(members.map((m) => [m.userId, (m.user.name ?? m.user.email.split("@")[0]).split(" ")[0]]));
    const now = Date.now();
    const issues: FeedIssue[] = [];
    for (const s of sources) {
      const p = sourceProblem(s, now);
      if (p) issues.push({ id: s.id, kind: s.kind, who: name.get(s.childId) ?? "", source: s.label, lastSyncAt: s.lastSyncAt ? s.lastSyncAt.toISOString() : null, failed: p.failed });
    }
    return NextResponse.json({ issues: issues.slice(0, 6) });
  } catch (err) {
    console.error("Feed health GET error:", err);
    return NextResponse.json({ issues: [] });
  }
}
