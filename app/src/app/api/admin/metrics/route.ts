import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSchoolFeedTables } from "@/lib/schoolFeeds";
import { ensureActivityFeedTables } from "@/lib/activityFeeds";
import { ensureAnalyticsTable } from "@/lib/analyticsStore";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "mikaelberglund1976@gmail.com";
export const dynamic = "force-dynamic";

// 2026-10-25 (masterbrief §38–39, Etapp 0 G7): GET /api/admin/metrics — the
// brief's product metrics, admin only, read-only. Counts only: nothing here
// identifies a person or a family. Event-based numbers only exist from the
// day the events started (25 Oct 2026); before that they're null.
//
// Definitions (also in OPERATIONS.md §1d):
//   activeHouseholds7d  — households with at least one app_open in the last 7 days
//   coordinated7d       — Weekly Coordinated Households (North Star, first
//                         version): households where ≥2 different people opened
//                         the app in the last 7 days
//   retentionD7/D30     — of households first seen 7–14 / 30–60 days ago, the
//                         share active in the last 7 days
//   connectedSourceRate — households with ≥1 school or activity link / all households
//   secondAdultRate     — households with ≥2 adults / all households
//   childActivation     — households with a child where a child opened the app
//                         in the last 30 days / households with a child
//   automaticShare30d   — items that came in from links / (those + items made
//                         by hand) in the last 30 days
//   correctionRate30d   — imported items someone fixed (moved, edited, removed)
//                         / imported items added, last 30 days
//   syncSuccess30d      — successful link syncs / all link syncs, last 30 days

type Row = Record<string, unknown>;
const num = (v: unknown) => (typeof v === "bigint" ? Number(v) : typeof v === "number" ? v : Number(v ?? 0));
const rate = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    // Make sure the tables exist (they create themselves on first use).
    await Promise.all([ensureSchoolFeedTables(), ensureActivityFeedTables(), ensureAnalyticsTable()]);

    const q = <T extends Row>(sql: string) => prisma.$queryRawUnsafe<T[]>(sql);
    const [hhTotal, withSource, secondAdult, withChild] = await Promise.all([
      prisma.household.count(),
      q(`SELECT COUNT(DISTINCT "householdId") AS n FROM (SELECT "householdId" FROM "school_feeds" UNION SELECT "householdId" FROM "activity_feeds") s`),
      q(`SELECT COUNT(*) AS n FROM (SELECT "householdId" FROM "household_members" WHERE "role" <> 'CHILD' GROUP BY 1 HAVING COUNT(*) >= 2) s`),
      prisma.householdMember.findMany({ where: { role: "CHILD" }, select: { householdId: true }, distinct: ["householdId"] }),
    ]);

    const ev = (sql: string) => q(sql).then((r) => r[0] ?? {});
    const [active, coord, d7, d30, childActive, sync, imported, corrections, firstEvent] = await Promise.all([
      ev(`SELECT COUNT(DISTINCT "hh") AS n FROM "analytics_events" WHERE "event" = 'app_open' AND "hh" IS NOT NULL AND "createdAt" >= NOW() - INTERVAL '7 days'`),
      ev(`SELECT COUNT(*) AS n FROM (SELECT "hh" FROM "analytics_events" WHERE "event" = 'app_open' AND "hh" IS NOT NULL AND "createdAt" >= NOW() - INTERVAL '7 days' GROUP BY "hh" HAVING COUNT(DISTINCT "ph") >= 2) s`),
      ev(`WITH f AS (SELECT "hh", MIN("createdAt") AS first FROM "analytics_events" WHERE "event" = 'app_open' AND "hh" IS NOT NULL GROUP BY "hh")
          SELECT COUNT(*) FILTER (WHERE f.first BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days') AS cohort,
                 COUNT(*) FILTER (WHERE f.first BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'
                   AND EXISTS (SELECT 1 FROM "analytics_events" e WHERE e."hh" = f."hh" AND e."event" = 'app_open' AND e."createdAt" >= NOW() - INTERVAL '7 days')) AS kept FROM f`),
      ev(`WITH f AS (SELECT "hh", MIN("createdAt") AS first FROM "analytics_events" WHERE "event" = 'app_open' AND "hh" IS NOT NULL GROUP BY "hh")
          SELECT COUNT(*) FILTER (WHERE f.first BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days') AS cohort,
                 COUNT(*) FILTER (WHERE f.first BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days'
                   AND EXISTS (SELECT 1 FROM "analytics_events" e WHERE e."hh" = f."hh" AND e."event" = 'app_open' AND e."createdAt" >= NOW() - INTERVAL '7 days')) AS kept FROM f`),
      ev(`SELECT COUNT(DISTINCT "hh") AS n FROM "analytics_events" WHERE "event" = 'app_open' AND "isChild" = true AND "hh" IS NOT NULL AND "createdAt" >= NOW() - INTERVAL '30 days'`),
      ev(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE (props->>'ok')::boolean) AS ok, COALESCE(SUM((props->>'added')::int), 0) AS added FROM "analytics_events" WHERE "event" = 'sync_result' AND "createdAt" >= NOW() - INTERVAL '30 days'`),
      ev(`SELECT COUNT(*) AS n FROM "reminders" r WHERE r."createdAt" >= NOW() - INTERVAL '30 days'
          AND (EXISTS (SELECT 1 FROM "school_imports" i WHERE i."reminderId" = r."id") OR EXISTS (SELECT 1 FROM "activity_imports" a WHERE a."reminderId" = r."id"))`),
      ev(`SELECT COUNT(*) AS n, COUNT(*) FILTER (WHERE props->>'how' = 'move') AS moved, COUNT(*) FILTER (WHERE props->>'how' = 'edit') AS edited, COUNT(*) FILTER (WHERE props->>'how' = 'hide') AS hidden FROM "analytics_events" WHERE "event" = 'import_corrected' AND "createdAt" >= NOW() - INTERVAL '30 days'`),
      ev(`SELECT MIN("createdAt") AS first FROM "analytics_events" WHERE "hh" IS NOT NULL`),
    ]);
    const manual = await ev(`SELECT COUNT(*) AS n FROM "reminders" r WHERE r."createdAt" >= NOW() - INTERVAL '30 days'
          AND NOT EXISTS (SELECT 1 FROM "school_imports" i WHERE i."reminderId" = r."id") AND NOT EXISTS (SELECT 1 FROM "activity_imports" a WHERE a."reminderId" = r."id")`);
    const events = await q(`SELECT "event", COUNT(*) AS n FROM "analytics_events" WHERE "createdAt" >= NOW() - INTERVAL '30 days' GROUP BY 1 ORDER BY 2 DESC`);

    const hh = hhTotal;
    const importedN = num(imported.n);
    return NextResponse.json({
      since: firstEvent.first ?? null,
      households: hh,
      activeHouseholds7d: num(active.n),
      coordinated7d: num(coord.n),
      retentionD7: { cohort: num(d7.cohort), kept: num(d7.kept), pct: rate(num(d7.kept), num(d7.cohort)) },
      retentionD30: { cohort: num(d30.cohort), kept: num(d30.kept), pct: rate(num(d30.kept), num(d30.cohort)) },
      connectedSourceRate: { n: num(withSource[0]?.n), pct: rate(num(withSource[0]?.n), hh) },
      secondAdultRate: { n: num(secondAdult[0]?.n), pct: rate(num(secondAdult[0]?.n), hh) },
      childActivation: { n: num(childActive.n), of: withChild.length, pct: rate(num(childActive.n), withChild.length) },
      automaticShare30d: { imported: importedN, manual: num(manual.n), pct: rate(importedN, importedN + num(manual.n)) },
      correctionRate30d: { corrected: num(corrections.n), moved: num(corrections.moved), edited: num(corrections.edited), hidden: num(corrections.hidden), added: num(sync.added), pct: rate(num(corrections.n), num(sync.added)) },
      syncSuccess30d: { ok: num(sync.ok), total: num(sync.total), pct: rate(num(sync.ok), num(sync.total)) },
      events30d: events.map((e) => ({ event: String(e.event), n: num(e.n) })),
    });
  } catch (err) {
    console.error("Admin metrics error:", err);
    return NextResponse.json({ error: "Couldn't compute metrics" }, { status: 500 });
  }
}
