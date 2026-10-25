// 2026-10-25 (masterbrief §10–12 + §45 "one source of truth", Etapp 0 G3):
// one model for every external calendar source, whatever kind it is.
//
// Today there are two kinds, each with its own table and sync:
//   school   — school_feeds   + school_imports   (lib/schoolFeeds.ts: SchoolSoft, Studybee)
//   activity — activity_feeds + activity_imports (lib/activityFeeds.ts: MyClub, any iCal/WebCal)
// Both follow the same rules (provenance per item via external UID, edited /
// hidden items are left alone, items made by hand are never touched, a moved
// item keeps its person). This file is the shared layer on top: list every
// source of a family in one shape, and run due syncs the same way. Anything
// new that needs "the family's sources" (health on Home, metrics, a future
// sources page, a third kind) reads them from here.
//
// Deliberately NOT done yet: merging the two reconcile loops into one engine.
// They match differently on purpose (school per child + UID across a child's
// links, activity per link + UID) and touch live data, so that merge waits for
// a test database — see NEXT_STEPS.md "Synkmotor".
import { listFeeds, maskUrl, providerLabel } from "@/lib/schoolFeeds";
import { listActivityFeeds, maskActivityUrl } from "@/lib/activityFeeds";

export type SourceKind = "school" | "activity";

export type Source = {
  id: string;
  kind: SourceKind;
  householdId: string;
  childId: string;
  /** What people call it: "SchoolSoft", "Studybee", the club calendar's name or host. */
  label: string;
  createdAt: Date;
  lastSyncAt: Date | null;
  lastStatus: string | null;
  lastCount: number | null;
};

/** Where in the app a source of this kind is managed. */
export const SOURCE_PAGE: Record<SourceKind, string> = { school: "/dashboard/school", activity: "/dashboard/training" };

const asDate = (d: Date | string | null) => (d ? new Date(d) : null);

/** Every school and activity link of a family, in one shape. */
export async function listSources(householdId: string): Promise<Source[]> {
  const [school, activity] = await Promise.all([
    listFeeds(householdId).catch(() => []),
    listActivityFeeds(householdId).catch(() => []),
  ]);
  return [
    ...school.map((f): Source => ({ id: f.id, kind: "school", householdId: f.householdId, childId: f.childId, label: f.provider === "ical" ? maskUrl(f.url) : providerLabel(f.provider), createdAt: new Date(f.createdAt), lastSyncAt: asDate(f.lastSyncAt), lastStatus: f.lastStatus, lastCount: f.lastCount })),
    ...activity.map((f): Source => ({ id: f.id, kind: "activity", householdId: f.householdId, childId: f.childId, label: f.label || maskActivityUrl(f.url), createdAt: new Date(f.createdAt), lastSyncAt: asDate(f.lastSyncAt), lastStatus: f.lastStatus, lastCount: f.lastCount })),
  ];
}

/** A source that has stopped syncing: last sync failed, or nothing for `staleMs`. */
export function sourceProblem(s: Source, now = Date.now(), staleMs = 48 * 60 * 60 * 1000): null | { failed: boolean } {
  const failed = !!s.lastSyncAt && !!s.lastStatus && s.lastStatus !== "ok";
  // A link added recently that hasn't synced yet isn't stale.
  const stale = (s.lastSyncAt ? s.lastSyncAt.getTime() : s.createdAt.getTime()) < now - staleMs;
  return failed || stale ? { failed } : null;
}

/** The daily/evening loop shared by both kinds: sync each due feed until the deadline. */
export async function runDueSyncs<F>(feeds: F[], sync: (f: F) => Promise<{ ok: boolean }>, deadline?: number): Promise<{ synced: number; failed: number }> {
  let synced = 0, failed = 0;
  for (const f of feeds) {
    if (deadline && Date.now() > deadline) break;
    const r = await sync(f);
    if (r.ok) synced++; else failed++;
  }
  return { synced, failed };
}
