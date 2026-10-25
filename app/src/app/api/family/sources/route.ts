import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdult } from "../school-feeds/_auth";
import { listSources, sourceProblem, SOURCE_PAGE } from "@/lib/feedSources";
import { importedCount } from "@/lib/schoolFeeds";
import { activityImportedCount } from "@/lib/activityFeeds";

export const dynamic = "force-dynamic";

// 2026-10-25 (masterbrief Etapp 2 "source management", §11 transparency):
// GET /api/family/sources — every calendar link of the family in one list
// (lib/feedSources.ts): child, source, last sync, status, how many items it
// brought in. Read-only; syncing/removing goes through each kind's own route.
// The links themselves never go to the browser.
export async function GET() {
  const a = await requireAdult();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  try {
    const [sources, members] = await Promise.all([
      listSources(a.householdId),
      prisma.householdMember.findMany({ where: { householdId: a.householdId }, include: { user: { select: { id: true, name: true, email: true } } } }),
    ]);
    const name = new Map(members.map((m) => [m.userId, (m.user.name ?? m.user.email.split("@")[0]).split(" ")[0]]));
    const now = Date.now();
    const out = await Promise.all(sources.map(async (s) => ({
      id: s.id,
      kind: s.kind,
      childId: s.childId,
      who: name.get(s.childId) ?? "",
      label: s.label,
      lastSyncAt: s.lastSyncAt ? s.lastSyncAt.toISOString() : null,
      lastStatus: s.lastStatus,
      problem: sourceProblem(s, now),
      items: s.kind === "school" ? await importedCount(s.id).catch(() => 0) : await activityImportedCount(s.id).catch(() => 0),
      manage: SOURCE_PAGE[s.kind],
    })));
    out.sort((x, y) => x.who.localeCompare(y.who) || x.kind.localeCompare(y.kind));
    return NextResponse.json({ sources: out });
  } catch (err) {
    console.error("Sources GET error:", err);
    return NextResponse.json({ error: "Couldn't load calendar links" }, { status: 500 });
  }
}
