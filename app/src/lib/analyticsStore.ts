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
//
// 2026-10-25 (masterbrief §38–39, Etapp 0 G7): to measure households (D7/D30
// household retention, Weekly Coordinated Households, connected-source rate)
// an event can carry two PSEUDONYMS — never the real ids:
//   hh — HMAC-SHA256(householdId) cut to 16 hex, ph — same for the person.
// The key is NEXTAUTH_SECRET, so the hashes can't be turned back into ids or
// matched against other data without it. No names, e-mails or content.
// Server-side events (SERVER_EVENTS) are recorded where the thing happens;
// `app_open` at most once per person per day. Read by /api/admin/metrics.
import { createHmac, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export const ANALYTICS_EVENTS = [
  "more_opened", "more_search_used", "more_quick_action_clicked", "more_feature_clicked",
  // 2026-10-25 (G7): client events
  "attention_clicked", "child_day_opened",
] as const;
// 2026-10-25 (G7): recorded on the server only (never accepted from /api/events).
export const SERVER_EVENTS = [
  "app_open",          // once per person per day (/api/profile)
  "source_connected",  // { kind: school|activity, provider }
  "sync_result",       // { kind, ok, added, updated, removed } — one per link sync
  "import_corrected",  // { kind, how: move|edit|hide } — someone fixed an imported item
  "quick_capture_saved", // { shopping, other, ai }
  "reminder_done",     // { undo } — G6
] as const;
export type ServerEvent = (typeof SERVER_EVENTS)[number];

export function pseudonym(id: string | null | undefined): string | null {
  if (!id) return null;
  const key = process.env.NEXTAUTH_SECRET || "rfs-analytics";
  return createHmac("sha256", key).update(id).digest("hex").slice(0, 16);
}
const RETENTION_DAYS = 180;

let ensured: Promise<void> | null = null;
export function ensureAnalyticsTable(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "analytics_events" ("id" TEXT NOT NULL, "event" TEXT NOT NULL, "props" JSONB, "isChild" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id"))`
      );
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "analytics_events_event_createdAt_idx" ON "analytics_events" ("event", "createdAt")`);
      // 2026-10-25 (G7): pseudonymous household / person (see top). Existing rows keep null.
      await prisma.$executeRawUnsafe(`ALTER TABLE "analytics_events" ADD COLUMN IF NOT EXISTS "hh" TEXT`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "analytics_events" ADD COLUMN IF NOT EXISTS "ph" TEXT`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "analytics_events_hh_createdAt_idx" ON "analytics_events" ("hh", "createdAt")`);
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

export async function recordAnalyticsEvent(event: string, props: Record<string, unknown>, isChild: boolean, who: { householdId?: string | null; userId?: string | null } = {}): Promise<void> {
  await ensureAnalyticsTable();
  await prisma.$executeRaw`INSERT INTO "analytics_events" ("id", "event", "props", "isChild", "hh", "ph") VALUES (${randomUUID()}, ${event}, ${JSON.stringify(props)}::jsonb, ${isChild}, ${pseudonym(who.householdId)}, ${pseudonym(who.userId)})`;
}

/**
 * Server-side event. Fire-and-forget: never throws, never slows the caller
 * noticeably (one INSERT). `who` is turned into pseudonyms here.
 */
export async function trackServer(event: ServerEvent, props: Record<string, string | number | boolean | null>, who: { householdId?: string | null; userId?: string | null; isChild?: boolean } = {}): Promise<void> {
  try {
    await recordAnalyticsEvent(event, cleanProps(props), !!who.isChild, who);
  } catch (err) {
    console.error("trackServer failed", event, err);
  }
}

/** `app_open` once per person per day (Stockholm day). */
export async function trackAppOpen(userId: string, householdId: string | null, isChild: boolean): Promise<void> {
  try {
    await ensureAnalyticsTable();
    const ph = pseudonym(userId);
    await prisma.$executeRaw`INSERT INTO "analytics_events" ("id", "event", "props", "isChild", "hh", "ph")
      SELECT ${randomUUID()}, 'app_open', '{}'::jsonb, ${isChild}, ${pseudonym(householdId)}, ${ph}
      WHERE NOT EXISTS (SELECT 1 FROM "analytics_events" WHERE "event" = 'app_open' AND "ph" = ${ph}
        AND "createdAt" >= (date_trunc('day', NOW() AT TIME ZONE 'Europe/Stockholm') AT TIME ZONE 'Europe/Stockholm'))`;
  } catch (err) {
    console.error("trackAppOpen failed", err);
  }
}

export async function deleteOldAnalyticsEvents(): Promise<number> {
  await ensureAnalyticsTable();
  return prisma.$executeRawUnsafe(`DELETE FROM "analytics_events" WHERE "createdAt" < NOW() - INTERVAL '${RETENTION_DAYS} days'`);
}
