// 2026-10-16 (Mikael: "som förälder vill du ju se vilken som är första
// lektionen så att man vet när barnen går upp"): when each child starts
// school. Parents don't want the whole timetable in their calendar — just
// "Elsa starts 08:20 · Leo 09:10" the evening before, so they know when to
// wake everyone.
//
//  - Rules per child and weekday (Mon–Fri). Schools with alternating weeks
//    get an A and a B time; which week is A (odd or even ISO week) is a
//    setting per child.
//  - Exceptions per date: a different start ("Sovmorgon, börjar 10:00") or a
//    day off (studiedag, lov). Entered as a date range.
//  - Optional "wake N minutes before" per child → "⏰ väck 07:20".
//  - Shown in the Tomorrow card (Home + child's page) and the evening push.
//
// Today the times are entered by hand. The SchoolSoft/Studybee timetable
// import (first lesson of the day) will write the same rules later — the
// `source` column is there for that, so hand-entered times win over imported.
//
// Storage: self-creating tables (no database step on deploy).
//   school_start_settings  — per child: A/B weeks on/off, which week is A, wake offset.
//   school_start_rules     — per child + weekday + week ('' | 'A' | 'B'): start time.
//   school_start_overrides — per child + date: other start time, or null = no school.
import { prisma } from "@/lib/prisma";

export const WAKE_OPTIONS = [0, 30, 45, 60, 75, 90, 120];
export const MAX_OVERRIDE_DAYS = 62;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

let ensured: Promise<void> | null = null;
export function ensureSchoolStartTables(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "school_start_settings" ("childId" TEXT NOT NULL, "householdId" TEXT NOT NULL, "abWeeks" BOOLEAN NOT NULL DEFAULT false, "aIsOdd" BOOLEAN NOT NULL DEFAULT true, "wakeMinutes" INTEGER, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "school_start_settings_pkey" PRIMARY KEY ("childId"))`
      );
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "school_start_rules" ("childId" TEXT NOT NULL, "householdId" TEXT NOT NULL, "weekday" INTEGER NOT NULL, "week" TEXT NOT NULL DEFAULT '', "time" TEXT NOT NULL, "source" TEXT NOT NULL DEFAULT 'manual', CONSTRAINT "school_start_rules_pkey" PRIMARY KEY ("childId", "weekday", "week"))`
      );
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "school_start_overrides" ("childId" TEXT NOT NULL, "ymd" TEXT NOT NULL, "householdId" TEXT NOT NULL, "time" TEXT, "note" TEXT, "createdBy" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "school_start_overrides_pkey" PRIMARY KEY ("childId", "ymd"))`
      );
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "school_start_overrides_household_idx" ON "school_start_overrides"("householdId", "ymd")`);
    })().catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}

export type StartSettings = { childId: string; abWeeks: boolean; aIsOdd: boolean; wakeMinutes: number | null };
export type StartRule = { childId: string; weekday: number; week: "" | "A" | "B"; time: string };
export type StartOverride = { childId: string; ymd: string; time: string | null; note: string | null };
/** What a child's school day looks like on one date. */
export type DayStart = { childId: string; time: string | null; off: boolean; note: string | null; wake: string | null; week: "" | "A" | "B" };

export const isTime = (v: unknown): v is string => typeof v === "string" && TIME_RE.test(v);
export const isYmd = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + "T12:00:00Z"));

/** ISO week number of a date (yyyy-mm-dd). */
export function isoWeek(ymd: string): number {
  const d = new Date(ymd + "T00:00:00Z");
  const dayNum = d.getUTCDay() || 7; // Mon = 1 … Sun = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Thursday of this week decides the year
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
}
/** 1 = Monday … 7 = Sunday. */
export const weekdayOf = (ymd: string) => ((new Date(ymd + "T12:00:00Z").getUTCDay() + 6) % 7) + 1;
export function weekLetter(ymd: string, aIsOdd: boolean): "A" | "B" {
  const odd = isoWeek(ymd) % 2 === 1;
  return odd === aIsOdd ? "A" : "B";
}
export function minusMinutes(time: string, minutes: number): string | null {
  const total = +time.slice(0, 2) * 60 + +time.slice(3, 5) - minutes;
  if (total < 0) return null;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
export const addDays = (ymd: string, n: number) => new Date(Date.parse(ymd + "T12:00:00Z") + n * 86400000).toISOString().slice(0, 10);

// ── reading ─────────────────────────────────────────────────────────────────
export async function loadStartData(childIds: string[]) {
  await ensureSchoolStartTables();
  if (!childIds.length) return { settings: new Map<string, StartSettings>(), rules: [] as StartRule[] };
  const [settings, rules] = await Promise.all([
    prisma.$queryRaw<StartSettings[]>`SELECT "childId", "abWeeks", "aIsOdd", "wakeMinutes" FROM "school_start_settings" WHERE "childId" = ANY(${childIds}::text[])`,
    prisma.$queryRaw<StartRule[]>`SELECT "childId", "weekday", "week", "time" FROM "school_start_rules" WHERE "childId" = ANY(${childIds}::text[]) ORDER BY "weekday", "week"`,
  ]);
  return { settings: new Map(settings.map((s) => [s.childId, s])), rules };
}

export async function loadOverrides(childIds: string[], fromYmd: string, toYmd: string): Promise<StartOverride[]> {
  await ensureSchoolStartTables();
  if (!childIds.length) return [];
  return prisma.$queryRaw<StartOverride[]>`SELECT "childId", "ymd", "time", "note" FROM "school_start_overrides" WHERE "childId" = ANY(${childIds}::text[]) AND "ymd" >= ${fromYmd} AND "ymd" <= ${toYmd} ORDER BY "ymd" ASC`;
}

/** Pure: a child's start on `ymd` from rules + override. null = nothing known. */
export function resolveStart(childId: string, ymd: string, settings: StartSettings | undefined, rules: StartRule[], override: StartOverride | undefined): DayStart | null {
  const s = settings ?? { childId, abWeeks: false, aIsOdd: true, wakeMinutes: null };
  const week: "" | "A" | "B" = s.abWeeks ? weekLetter(ymd, s.aIsOdd) : "";
  const wakeFor = (time: string | null) => (time && s.wakeMinutes ? minusMinutes(time, s.wakeMinutes) : null);
  if (override) {
    if (!override.time) return { childId, time: null, off: true, note: override.note, wake: null, week };
    return { childId, time: override.time, off: false, note: override.note, wake: wakeFor(override.time), week };
  }
  const wd = weekdayOf(ymd);
  if (wd > 5) return null;
  const mine = rules.filter((r) => r.childId === childId && r.weekday === wd);
  const rule = (week && mine.find((r) => r.week === week)) || mine.find((r) => r.week === "");
  if (!rule) return null;
  return { childId, time: rule.time, off: false, note: null, wake: wakeFor(rule.time), week };
}

/** Starts for several children on one day, in the given order. */
export async function startsOn(childIds: string[], ymd: string): Promise<DayStart[]> {
  if (!childIds.length) return [];
  const [{ settings, rules }, overrides] = await Promise.all([loadStartData(childIds), loadOverrides(childIds, ymd, ymd)]);
  const ov = new Map(overrides.map((o) => [o.childId, o]));
  return childIds.map((id) => resolveStart(id, ymd, settings.get(id), rules, ov.get(id))).filter((x): x is DayStart => !!x);
}

// ── writing ─────────────────────────────────────────────────────────────────
export async function saveSchedule(householdId: string, childId: string, input: { abWeeks: boolean; aIsOdd: boolean; wakeMinutes: number | null; rules: { weekday: number; week: "" | "A" | "B"; time: string }[] }) {
  await ensureSchoolStartTables();
  await prisma.$executeRaw`INSERT INTO "school_start_settings" ("childId", "householdId", "abWeeks", "aIsOdd", "wakeMinutes") VALUES (${childId}, ${householdId}, ${input.abWeeks}, ${input.aIsOdd}, ${input.wakeMinutes})
    ON CONFLICT ("childId") DO UPDATE SET "householdId" = EXCLUDED."householdId", "abWeeks" = EXCLUDED."abWeeks", "aIsOdd" = EXCLUDED."aIsOdd", "wakeMinutes" = EXCLUDED."wakeMinutes", "updatedAt" = CURRENT_TIMESTAMP`;
  await prisma.$executeRaw`DELETE FROM "school_start_rules" WHERE "childId" = ${childId} AND "source" = 'manual'`;
  for (const r of input.rules) {
    await prisma.$executeRaw`INSERT INTO "school_start_rules" ("childId", "householdId", "weekday", "week", "time", "source") VALUES (${childId}, ${householdId}, ${r.weekday}, ${r.week}, ${r.time}, 'manual')
      ON CONFLICT ("childId", "weekday", "week") DO UPDATE SET "time" = EXCLUDED."time", "source" = 'manual'`;
  }
}

/** Set an exception for every weekday from `from` to `to`. Returns the dates written. */
export async function addOverride(householdId: string, childId: string, from: string, to: string, time: string | null, note: string | null, createdBy: string): Promise<string[]> {
  await ensureSchoolStartTables();
  const days: string[] = [];
  for (let d = from; d <= to && days.length < MAX_OVERRIDE_DAYS; d = addDays(d, 1)) {
    if (weekdayOf(d) <= 5) days.push(d);
  }
  // A single date picked on a weekend is still saved (a Saturday school day happens).
  if (!days.length && from === to) days.push(from);
  for (const ymd of days) {
    await prisma.$executeRaw`INSERT INTO "school_start_overrides" ("childId", "ymd", "householdId", "time", "note", "createdBy") VALUES (${childId}, ${ymd}, ${householdId}, ${time}, ${note}, ${createdBy})
      ON CONFLICT ("childId", "ymd") DO UPDATE SET "time" = EXCLUDED."time", "note" = EXCLUDED."note", "createdBy" = EXCLUDED."createdBy", "createdAt" = CURRENT_TIMESTAMP`;
  }
  return days;
}

export async function removeOverride(childId: string, ymd: string, toYmd?: string) {
  await ensureSchoolStartTables();
  if (toYmd) await prisma.$executeRaw`DELETE FROM "school_start_overrides" WHERE "childId" = ${childId} AND "ymd" >= ${ymd} AND "ymd" <= ${toYmd}`;
  else await prisma.$executeRaw`DELETE FROM "school_start_overrides" WHERE "childId" = ${childId} AND "ymd" = ${ymd}`;
}

/** Old exceptions are no use. */
export async function cleanupOverrides(beforeYmd: string) {
  try {
    await ensureSchoolStartTables();
    await prisma.$executeRaw`DELETE FROM "school_start_overrides" WHERE "ymd" < ${beforeYmd}`;
  } catch (err) { console.error("School start cleanup failed:", err); }
}

export async function deleteSchoolStartForUser(userId: string) {
  try {
    await ensureSchoolStartTables();
    await prisma.$executeRaw`DELETE FROM "school_start_settings" WHERE "childId" = ${userId}`;
    await prisma.$executeRaw`DELETE FROM "school_start_rules" WHERE "childId" = ${userId}`;
    await prisma.$executeRaw`DELETE FROM "school_start_overrides" WHERE "childId" = ${userId}`;
    await prisma.$executeRaw`UPDATE "school_start_overrides" SET "createdBy" = NULL WHERE "createdBy" = ${userId}`;
  } catch (err) { console.error("deleteSchoolStartForUser failed:", err); }
}

/** Group consecutive override dates with the same time/note into ranges for display. */
export function groupOverrides(rows: StartOverride[]): { childId: string; from: string; to: string; time: string | null; note: string | null; days: number }[] {
  const out: { childId: string; from: string; to: string; time: string | null; note: string | null; days: number }[] = [];
  const sorted = [...rows].sort((a, b) => a.childId.localeCompare(b.childId) || a.ymd.localeCompare(b.ymd));
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && last.childId === r.childId && last.time === r.time && (last.note ?? "") === (r.note ?? "")) {
      // consecutive = next weekday after `to` (skipping a weekend)
      let next = addDays(last.to, 1);
      while (weekdayOf(next) > 5 && next < r.ymd) next = addDays(next, 1);
      if (next === r.ymd) { last.to = r.ymd; last.days++; continue; }
    }
    out.push({ childId: r.childId, from: r.ymd, to: r.ymd, time: r.time, note: r.note, days: 1 });
  }
  return out;
}
