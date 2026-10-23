// 2026-10-23 (launch list row 52): shared custody / växelvis boende — PREPARED,
// NOT LIVE. Everything here is behind FEATURE_CUSTODY=true (Vercel env); with
// the flag off the API answers 404 and nothing in the app changes.
// Plan and next steps: CUSTODY_PLAN.md in the repo root.
//
// One schedule per child: which adult the child lives with on a given day.
//  - Pattern: weekly (7/7), 2-2-3 or 2-2-5-5, anchored on the first day of a
//    period with parent A ("startYmd"). The pattern repeats every 14 days.
//  - Parent A / B: an adult in the family (userId) or someone outside the app
//    (a label, e.g. "Mamma") — in split families the other parent often isn't
//    in the same family account.
//  - Handover time (optional): "17:00" on the day the child changes home.
//  - Single-day exceptions ("Leo stays with dad on Wednesday").
//
// Storage: self-creating tables (no database step on deploy).
//   custody_schedules — per child.
//   custody_overrides — per child + date.
import { prisma } from "@/lib/prisma";

export const CUSTODY_ENABLED = process.env.FEATURE_CUSTODY === "true";

export type CustodyPattern = "weekly" | "2-2-3" | "2-2-5-5";
export const CUSTODY_PATTERNS: CustodyPattern[] = ["weekly", "2-2-3", "2-2-5-5"];
export type Side = "A" | "B";

// 14-day cycles, day 0 = startYmd.
const CYCLES: Record<CustodyPattern, Side[]> = {
  weekly: "AAAAAAABBBBBBB".split("") as Side[],
  "2-2-3": "AABBAAABBAABBB".split("") as Side[],
  "2-2-5-5": "AABBAAAAABBBBB".split("") as Side[],
};

export type Parent = { userId: string | null; label: string | null };
export type CustodySchedule = {
  childId: string;
  pattern: CustodyPattern;
  startYmd: string;
  handoverTime: string | null;
  a: Parent;
  b: Parent;
};
export type CustodyOverride = { childId: string; ymd: string; side: Side; note: string | null };

const DAY = 86400000;
const toDay = (ymd: string) => Math.floor(Date.parse(ymd + "T12:00:00Z") / DAY);
export const addDays = (ymd: string, n: number) => new Date(Date.parse(ymd + "T12:00:00Z") + n * DAY).toISOString().slice(0, 10);
export const isYmd = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + "T12:00:00Z"));
export const isTime = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

// ── pure ────────────────────────────────────────────────────────────────────
/** Which side the child is with on `ymd` by the pattern alone. */
export function sideByPattern(s: Pick<CustodySchedule, "pattern" | "startYmd">, ymd: string): Side {
  const cycle = CYCLES[s.pattern];
  const i = (((toDay(ymd) - toDay(s.startYmd)) % cycle.length) + cycle.length) % cycle.length;
  return cycle[i];
}

/** Which side on `ymd`, exceptions first. */
export function sideOn(s: CustodySchedule, ymd: string, overrides: CustodyOverride[] = []): Side {
  return overrides.find((o) => o.childId === s.childId && o.ymd === ymd)?.side ?? sideByPattern(s, ymd);
}

export type CustodyDay = { ymd: string; side: Side; handover: boolean; note: string | null };

/** The child's days from `fromYmd`, `days` long. `handover` = the child changes home that day. */
export function custodyDays(s: CustodySchedule, fromYmd: string, days: number, overrides: CustodyOverride[] = []): CustodyDay[] {
  const out: CustodyDay[] = [];
  let prev = sideOn(s, addDays(fromYmd, -1), overrides);
  for (let i = 0; i < days; i++) {
    const ymd = addDays(fromYmd, i);
    const side = sideOn(s, ymd, overrides);
    out.push({ ymd, side, handover: side !== prev, note: overrides.find((o) => o.childId === s.childId && o.ymd === ymd)?.note ?? null });
    prev = side;
  }
  return out;
}

/** The adult (userId) the child is with on `ymd`, or null when it's someone outside the app. */
export function adultOn(s: CustodySchedule, ymd: string, overrides: CustodyOverride[] = []): string | null {
  return (sideOn(s, ymd, overrides) === "A" ? s.a : s.b).userId;
}

// ── storage ─────────────────────────────────────────────────────────────────
let ensured: Promise<void> | null = null;
export function ensureCustodyTables(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "custody_schedules" ("childId" TEXT NOT NULL, "householdId" TEXT NOT NULL, "pattern" TEXT NOT NULL, "startYmd" TEXT NOT NULL, "handoverTime" TEXT, "aUserId" TEXT, "aLabel" TEXT, "bUserId" TEXT, "bLabel" TEXT, "updatedBy" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "custody_schedules_pkey" PRIMARY KEY ("childId"))`
      );
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "custody_overrides" ("childId" TEXT NOT NULL, "ymd" TEXT NOT NULL, "householdId" TEXT NOT NULL, "side" TEXT NOT NULL, "note" TEXT, "createdBy" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "custody_overrides_pkey" PRIMARY KEY ("childId", "ymd"))`
      );
    })().catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}

type Row = { childId: string; pattern: string; startYmd: string; handoverTime: string | null; aUserId: string | null; aLabel: string | null; bUserId: string | null; bLabel: string | null };
const fromRow = (r: Row): CustodySchedule => ({
  childId: r.childId,
  pattern: (CUSTODY_PATTERNS as string[]).includes(r.pattern) ? (r.pattern as CustodyPattern) : "weekly",
  startYmd: r.startYmd,
  handoverTime: r.handoverTime,
  a: { userId: r.aUserId, label: r.aLabel },
  b: { userId: r.bUserId, label: r.bLabel },
});

export async function loadSchedules(childIds: string[]): Promise<Map<string, CustodySchedule>> {
  await ensureCustodyTables();
  if (!childIds.length) return new Map();
  const rows = await prisma.$queryRaw<Row[]>`SELECT "childId", "pattern", "startYmd", "handoverTime", "aUserId", "aLabel", "bUserId", "bLabel" FROM "custody_schedules" WHERE "childId" = ANY(${childIds}::text[])`;
  return new Map(rows.map((r) => [r.childId, fromRow(r)]));
}

export async function loadCustodyOverrides(childIds: string[], fromYmd: string, toYmd: string): Promise<CustodyOverride[]> {
  await ensureCustodyTables();
  if (!childIds.length) return [];
  const rows = await prisma.$queryRaw<{ childId: string; ymd: string; side: string; note: string | null }[]>`SELECT "childId", "ymd", "side", "note" FROM "custody_overrides" WHERE "childId" = ANY(${childIds}::text[]) AND "ymd" >= ${fromYmd} AND "ymd" <= ${toYmd} ORDER BY "ymd"`;
  return rows.map((r) => ({ childId: r.childId, ymd: r.ymd, side: r.side === "B" ? "B" : "A", note: r.note }));
}

export async function saveSchedule(householdId: string, s: CustodySchedule, by: string) {
  await ensureCustodyTables();
  await prisma.$executeRaw`INSERT INTO "custody_schedules" ("childId", "householdId", "pattern", "startYmd", "handoverTime", "aUserId", "aLabel", "bUserId", "bLabel", "updatedBy")
    VALUES (${s.childId}, ${householdId}, ${s.pattern}, ${s.startYmd}, ${s.handoverTime}, ${s.a.userId}, ${s.a.label}, ${s.b.userId}, ${s.b.label}, ${by})
    ON CONFLICT ("childId") DO UPDATE SET "householdId" = EXCLUDED."householdId", "pattern" = EXCLUDED."pattern", "startYmd" = EXCLUDED."startYmd", "handoverTime" = EXCLUDED."handoverTime",
      "aUserId" = EXCLUDED."aUserId", "aLabel" = EXCLUDED."aLabel", "bUserId" = EXCLUDED."bUserId", "bLabel" = EXCLUDED."bLabel", "updatedBy" = EXCLUDED."updatedBy", "updatedAt" = CURRENT_TIMESTAMP`;
}

export async function removeSchedule(childId: string) {
  await ensureCustodyTables();
  await prisma.$executeRaw`DELETE FROM "custody_schedules" WHERE "childId" = ${childId}`;
  await prisma.$executeRaw`DELETE FROM "custody_overrides" WHERE "childId" = ${childId}`;
}

export async function setCustodyOverride(householdId: string, childId: string, ymd: string, side: Side | null, note: string | null, by: string) {
  await ensureCustodyTables();
  if (!side) {
    await prisma.$executeRaw`DELETE FROM "custody_overrides" WHERE "childId" = ${childId} AND "ymd" = ${ymd}`;
    return;
  }
  await prisma.$executeRaw`INSERT INTO "custody_overrides" ("childId", "ymd", "householdId", "side", "note", "createdBy") VALUES (${childId}, ${ymd}, ${householdId}, ${side}, ${note}, ${by})
    ON CONFLICT ("childId", "ymd") DO UPDATE SET "side" = EXCLUDED."side", "note" = EXCLUDED."note", "createdBy" = EXCLUDED."createdBy", "createdAt" = CURRENT_TIMESTAMP`;
}

/** Account deletion: a child's schedule goes; an adult is unlinked (the label stays empty). */
export async function deleteCustodyForUser(userId: string) {
  try {
    await ensureCustodyTables();
    await removeSchedule(userId);
    await prisma.$executeRaw`UPDATE "custody_schedules" SET "aUserId" = NULL WHERE "aUserId" = ${userId}`;
    await prisma.$executeRaw`UPDATE "custody_schedules" SET "bUserId" = NULL WHERE "bUserId" = ${userId}`;
    await prisma.$executeRaw`UPDATE "custody_overrides" SET "createdBy" = NULL WHERE "createdBy" = ${userId}`;
  } catch (err) { console.error("deleteCustodyForUser failed:", err); }
}
