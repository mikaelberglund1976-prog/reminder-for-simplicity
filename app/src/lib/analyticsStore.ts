// 2026-10-24: storage for product analytics events (lib/analytics.ts).
//
// Self-creating side table (same pattern as reminder_times, OPERATIONS.md §5a),
// so a deploy needs no database step:
//   analytics_events — one row per event: name, small JSON props, child/adult,
//   time. Deliberately NO user id, household id or e-mail: the questions are
//   "which quick actions / features are used, what do people search for", which
//   need counts, not people. Rows older than 180 days are removed by the daily
//   cron (deleteOldAnalyticsEvents).
//
// Read it in Supabase, e.g.:
//   SELECT props->>'action', count(*) FROM analytics_events
//   WHERE event = 'more_quick_action_clicked' GROUP BY 1 ORDER BY 2 DESC;
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export const ANALYTICS_EVENTS = ["more_opened", "more_search_used", "more_quick_action_clicked", "more_feature_clicked"] as const;
const RETENTION_DAYS = 180;

let ensured: Promise<void> | null = null;
function ensureAnalyticsTable(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "analytics_events" ("id" TEXT NOT NULL, "event" TEXT NOT NULL, "props" JSONB, "isChild" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id"))`
      );
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "analytics_events_event_createdAt_idx" ON "analytics_events" ("event", "createdAt")`);
    })().catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}

/** Keeps only short scalar props (max 8 keys, strings ≤ 60 chars). */
export function cleanProps(raw: unknown): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>).slice(0, 8)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,30}$/.test(k)) continue;
    if (typeof v === "string") out[k] = v.slice(0, 60);
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "boolean" || v === null) out[k] = v;
  }
  return out;
}

export async function recordAnalyticsEvent(event: string, props: Record<string, unknown>, isChild: boolean): Promise<void> {
  await ensureAnalyticsTable();
  await prisma.$executeRaw`INSERT INTO "analytics_events" ("id", "event", "props", "isChild") VALUES (${randomUUID()}, ${event}, ${JSON.stringify(props)}::jsonb, ${isChild})`;
}

export async function deleteOldAnalyticsEvents(): Promise<number> {
  await ensureAnalyticsTable();
  return prisma.$executeRawUnsafe(`DELETE FROM "analytics_events" WHERE "createdAt" < NOW() - INTERVAL '${RETENTION_DAYS} days'`);
}
