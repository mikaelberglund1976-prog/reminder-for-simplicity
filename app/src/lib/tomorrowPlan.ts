// 2026-10-11 (Mikael: make it a ritual — "I morgon"-kortet): tomorrow for the
// family as one card to tick off the evening before.
//  - What's on: tests, homework due, activities (with time and place).
//  - What to bring: read from the item's note ("Ta med matsäck och
//    regnkläder"), a few sure-fire defaults (PE → gym bag, swimming → swimwear,
//    excursion → packed lunch), and anything the family adds by hand. Ticking
//    something off is shared, so both parents see that the bag is packed.
//  - Who drives: a child's activity with a time gets "I'll take it" — one tap,
//    and the other adults get a push.
//  - Clashes: two children's activities at about the same time with no ride
//    sorted (or the same driver for both) are flagged.
//
// Storage: self-creating tables (no database step on deploy).
//   day_checks — the checklist, per family and day.
//   day_rides  — who drives, per activity occurrence (reminder + day).
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getOccurrencesInRange, type RecurrenceRule } from "@/lib/recurrence";
import { getTimes } from "@/lib/reminderTimes";
import type { Messages } from "@/lib/i18n/messages";
import { ensureTripTables, flightTitle, leaveFor, parseFlight, type ItemRow, type TripRow } from "@/lib/trips";
import { startsOn } from "@/lib/schoolStart";
import { busyOnlyImportIds } from "@/lib/activityFeeds";

const ADULT = ["OWNER", "PARENT", "ADULT"];
const CLASH_GAP_MIN = 30;
const DEFAULT_LENGTH_MIN = 90;

let ensured: Promise<void> | null = null;
export function ensurePlanTables(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "day_checks" ("householdId" TEXT NOT NULL, "ymd" TEXT NOT NULL, "key" TEXT NOT NULL, "label" TEXT NOT NULL, "custom" BOOLEAN NOT NULL DEFAULT false, "checked" BOOLEAN NOT NULL DEFAULT false, "updatedBy" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "day_checks_pkey" PRIMARY KEY ("householdId", "ymd", "key"))`
      );
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "day_rides" ("reminderId" TEXT NOT NULL, "ymd" TEXT NOT NULL, "householdId" TEXT NOT NULL, "driverId" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "day_rides_pkey" PRIMARY KEY ("reminderId", "ymd"))`
      );
    })().catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}

export const stockholmYmd = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const addDaysYmd = (ymd: string, n: number) => new Date(Date.parse(ymd + "T12:00:00Z") + n * 86400000).toISOString().slice(0, 10);
export const tomorrowYmd = (now = new Date()) => new Date(Date.parse(stockholmYmd(now) + "T12:00:00Z") + 86400000).toISOString().slice(0, 10);

// ── what to bring ───────────────────────────────────────────────────────────
const BRING_RE = /(?:ta med|ta med dig|medtag|glöm inte|packa|bring|don't forget|remember)\s*:?\s*([^.\n!]+)/gi;
function bringFromNote(note: string | null): string[] {
  if (!note) return [];
  const out: string[] = [];
  for (const m of Array.from(note.matchAll(BRING_RE))) {
    for (const part of m[1].split(/,|\boch\b|\band\b|\+|&/i)) {
      const p = part.trim().replace(/^(en|ett|din|ditt|dina|a|an|your)\s+/i, "").replace(/\s+/g, " ");
      if (p.length >= 2 && p.length <= 40) out.push(p.charAt(0).toUpperCase() + p.slice(1));
    }
  }
  return out;
}
function bringDefaults(title: string, subject: string | null, t: Messages["assist"]): string[] {
  const hay = `${title} ${subject ?? ""}`.toLowerCase();
  if (/\b(pe|idrott|idh|gympa|gymnastik)\b/.test(hay)) return [t.bringGymBag];
  if (/\b(sim|simning|simträning|simskola|bad|swim|swimming)\b/.test(hay)) return [t.bringSwim];
  if (/\b(utflykt|friluftsdag|skridskodag|excursion|field trip|trip)\b/.test(hay)) return [t.bringLunch];
  return [];
}
const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9åäö]+/g, "-").slice(0, 40);

// ── the plan ────────────────────────────────────────────────────────────────
export type PlanItem = {
  reminderId: string; title: string; kind: "TEST" | "HOMEWORK" | "SCHOOL" | "ACTIVITY" | "TRIP";
  childId: string | null; who: string | null; startTime: string | null; endTime: string | null; place: string | null;
  needsRide: boolean; driverId: string | null; driver: string | null; href: string;
};
export type PlanCheck = { key: string; label: string; checked: boolean; custom: boolean; who: string | null };
// 2026-10-16: when each child starts school, tomorrow (and today, for the morning).
export type PlanStart = { childId: string; who: string | null; time: string | null; off: boolean; note: string | null; wake: string | null };
export type Plan = { ymd: string; isAdult: boolean; items: PlanItem[]; checks: PlanCheck[]; clashes: string[]; starts: PlanStart[]; todayStarts: PlanStart[] };

const toMin = (hhmm: string) => +hhmm.slice(0, 2) * 60 + +hhmm.slice(3, 5);

export async function buildPlan(userId: string, t: Messages["assist"], ymd = tomorrowYmd()): Promise<Plan | null> {
  await ensurePlanTables();
  const member = await prisma.householdMember.findFirst({
    where: { userId },
    include: { household: { include: { members: { include: { user: { select: { id: true, name: true, deletedAt: true } } } } } } },
  });
  if (!member) return null;
  const isAdult = ADULT.includes(member.role);
  const people = member.household.members.filter((m) => !m.user.deletedAt);
  const first = new Map(people.map((m) => [m.userId, (m.user.name ?? "").split(" ")[0] || "?"]));
  const children = new Set(people.filter((m) => m.role === "CHILD").map((m) => m.userId));
  const scope = isAdult ? people.map((m) => m.userId) : [userId];
  const day = new Date(ymd + "T00:00:00.000Z");

  const raw = await prisma.reminder.findMany({
    where: { householdId: member.householdId, isActive: true, category: { in: ["SCHOOL", "TRAINING"] }, assignedTo: { in: scope } },
    select: { id: true, name: true, category: true, date: true, recurrence: true, choreRecurrenceDays: true, schoolKind: true, subject: true, completedAt: true, assignedTo: true, note: true },
  });
  const due = raw.filter((r) => r.category === "SCHOOL"
    ? !r.completedAt && r.date.toISOString().slice(0, 10) === ymd
    : getOccurrencesInRange({ date: r.date.toISOString(), recurrence: r.recurrence as RecurrenceRule, choreRecurrenceDays: r.choreRecurrenceDays }, day, day).length > 0);
  const times = await getTimes(due.map((r) => r.id));
  const rides = due.length
    ? await prisma.$queryRaw<{ reminderId: string; driverId: string }[]>`SELECT "reminderId", "driverId" FROM "day_rides" WHERE "ymd" = ${ymd} AND "reminderId" = ANY(${due.map((r) => r.id)}::text[])`
    : [];
  const rideOf = new Map(rides.map((r) => [r.reminderId, r.driverId]));

  const items: PlanItem[] = due.map((r): PlanItem => {
    const tm = times.get(r.id);
    const place = r.note && /^📍/.test(r.note) ? r.note.replace(/^📍\s*/, "").split("\n")[0] : null;
    const kind: PlanItem["kind"] = r.category === "TRAINING" ? "ACTIVITY" : r.schoolKind === "TEST" ? "TEST" : r.schoolKind === "HOMEWORK" ? "HOMEWORK" : "SCHOOL";
    const driverId = rideOf.get(r.id) ?? null;
    return {
      reminderId: r.id, title: r.name, kind,
      childId: r.assignedTo, who: isAdult && r.assignedTo && r.assignedTo !== userId ? first.get(r.assignedTo) ?? null : null,
      startTime: tm?.startTime ?? null, endTime: tm?.endTime ?? null, place,
      needsRide: kind === "ACTIVITY" && !!r.assignedTo && children.has(r.assignedTo) && !!tm?.startTime,
      driverId, driver: driverId ? (driverId === userId ? t.me : first.get(driverId) ?? null) : null,
      href: r.category === "TRAINING" ? "/dashboard/training" : "/dashboard/school",
    };
  });
  // 2026-10-11: flights tomorrow (Trips) — with "leave home at".
  try {
    await ensureTripTables();
    const trips = await prisma.$queryRaw<TripRow[]>`SELECT * FROM "trips" WHERE "householdId" = ${member.householdId} AND "startYmd" <= ${ymd} AND "endYmd" >= ${addDaysYmd(ymd, -1)}`;
    for (const trip of trips) {
      const going = (trip.travellers ?? "").split(",").filter(Boolean);
      if (!isAdult && going.length && !going.includes(userId)) continue;
      const flights = await prisma.$queryRaw<ItemRow[]>`SELECT * FROM "trip_items" WHERE "tripId" = ${trip.id} AND "kind" = 'FLIGHT'`;
      for (const f of flights) {
        const d = parseFlight(f);
        if (!d || d.depYmd !== ymd) continue;
        const leave = leaveFor(trip, d);
        items.push({ reminderId: f.id, title: flightTitle(d), kind: "TRIP", childId: null, who: trip.name, startTime: d.depTime, endTime: d.arrTime ?? null, place: leave ? t.leaveHomeShort(leave.time) : null, needsRide: false, driverId: null, driver: null, href: `/dashboard/trips/${trip.id}` });
      }
    }
  } catch (err) { console.error("Tomorrow plan: trips failed:", err); }
  items.sort((a, b) => (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99") || a.title.localeCompare(b.title));

  // Checklist: derived items + hand-added ones, with their ticked state.
  const stored = await prisma.$queryRaw<{ key: string; label: string; custom: boolean; checked: boolean }[]>`SELECT "key", "label", "custom", "checked" FROM "day_checks" WHERE "householdId" = ${member.householdId} AND "ymd" = ${ymd} ORDER BY "updatedAt" ASC`;
  const state = new Map(stored.map((s) => [s.key, s]));
  const checks: PlanCheck[] = [];
  const seen = new Set<string>();
  for (const r of due) {
    if (!scope.includes(r.assignedTo ?? "")) continue;
    const it = items.find((i) => i.reminderId === r.id)!;
    for (const label of [...bringFromNote(r.note), ...bringDefaults(r.name, r.subject, t)]) {
      const key = `${r.assignedTo ?? "x"}:${slug(label)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      checks.push({ key, label, checked: !!state.get(key)?.checked, custom: false, who: it.who });
    }
  }
  for (const s of stored) if (s.custom) checks.push({ key: s.key, label: s.label, checked: s.checked, custom: true, who: null });

  // Clashes between children's activities (adults only).
  const clashes: string[] = [];
  if (isAdult) {
    const rideItems = items.filter((i) => i.needsRide);
    for (let i = 0; i < rideItems.length; i++) {
      for (let j = i + 1; j < rideItems.length; j++) {
        const a = rideItems[i], b = rideItems[j];
        if (a.childId === b.childId) continue;
        const aEnd = a.endTime ? toMin(a.endTime) : toMin(a.startTime!) + DEFAULT_LENGTH_MIN;
        const bEnd = b.endTime ? toMin(b.endTime) : toMin(b.startTime!) + DEFAULT_LENGTH_MIN;
        const overlap = toMin(a.startTime!) < bEnd + CLASH_GAP_MIN && toMin(b.startTime!) < aEnd + CLASH_GAP_MIN;
        if (!overlap) continue;
        const sameDriver = a.driverId && a.driverId === b.driverId;
        if (a.driverId && b.driverId && !sameDriver) continue;
        clashes.push(sameDriver
          ? t.clashSameDriver(a.driver ?? "?", `${a.who ?? "?"} ${a.startTime}`, `${b.who ?? "?"} ${b.startTime}`)
          : t.clashNoRide(`${a.who ?? "?"} ${a.startTime}`, `${b.who ?? "?"} ${b.startTime}`));
      }
    }
  }
  // 2026-10-16: an adult's own calendar (e.g. work, lib/activityFeeds.ts) —
  // warn when the driver is busy, or when nobody is free for a child's ride.
  if (isAdult) {
    const adults = people.filter((m) => ADULT.includes(m.role)).map((m) => m.userId);
    const span = (i: PlanItem) => [toMin(i.startTime!), i.endTime ? toMin(i.endTime) : toMin(i.startTime!) + 60] as const;
    const busy = items.filter((i) => i.kind === "ACTIVITY" && i.childId && adults.includes(i.childId) && i.startTime);
    if (busy.length) {
      const busyAt = (adultId: string, from: number, to: number) =>
        busy.find((b) => b.childId === adultId && span(b)[0] < to && span(b)[1] > from) ?? null;
      for (const r of items.filter((i) => i.needsRide)) {
        // Need to be free from a bit before it starts until it starts (drop-off),
        // and around when it ends (pick-up).
        const [s0, e0] = r.endTime ? span(r) : [toMin(r.startTime!), toMin(r.startTime!) + DEFAULT_LENGTH_MIN];
        const hit = (a: string) => busyAt(a, s0 - CLASH_GAP_MIN, s0) ?? busyAt(a, e0 - 10, e0 + CLASH_GAP_MIN);
        const label = `${r.who ?? "?"} ${r.startTime}`;
        if (r.driverId) {
          const b = hit(r.driverId);
          if (b) clashes.push(t.clashDriverBusy(r.driver ?? "?", label, `${b.title} ${b.startTime}${b.endTime ? `–${b.endTime}` : ""}`));
        } else if (adults.length && adults.every((a) => hit(a))) {
          clashes.push(t.clashNoAdultFree(label));
        }
      }
    }
  }

  // 2026-10-16: school start per child (adults: every child; a child: themself).
  let starts: PlanStart[] = [];
  let todayStarts: PlanStart[] = [];
  try {
    const kids = isAdult ? people.filter((m) => m.role === "CHILD").map((m) => m.userId) : member.role === "CHILD" ? [userId] : [];
    const toPlan = (s: Awaited<ReturnType<typeof startsOn>>[number]): PlanStart => ({ childId: s.childId, who: isAdult ? first.get(s.childId) ?? null : null, time: s.time, off: s.off, note: s.note, wake: s.wake });
    [starts, todayStarts] = await Promise.all([
      startsOn(kids, ymd).then((l) => l.map(toPlan)),
      startsOn(kids, addDaysYmd(ymd, -1)).then((l) => l.map(toPlan)),
    ]);
  } catch (err) { console.error("Tomorrow plan: school start failed:", err); }

  // "Busy" blocks from an adult's work calendar are only for the clash check —
  // the family card doesn't need "Jobb: Upptagen 08–17" twice a day.
  const hide = await busyOnlyImportIds(items.filter((i) => i.kind === "ACTIVITY").map((i) => i.reminderId));
  const shown = hide.size ? items.filter((i) => !hide.has(i.reminderId)) : items;

  return { ymd, isAdult, items: shown, checks, clashes, starts, todayStarts };
}

// ── changes ─────────────────────────────────────────────────────────────────
export async function setCheck(householdId: string, ymd: string, key: string, label: string, checked: boolean, userId: string) {
  await ensurePlanTables();
  await prisma.$executeRaw`INSERT INTO "day_checks" ("householdId", "ymd", "key", "label", "checked", "updatedBy") VALUES (${householdId}, ${ymd}, ${key}, ${label.slice(0, 60)}, ${checked}, ${userId})
    ON CONFLICT ("householdId", "ymd", "key") DO UPDATE SET "checked" = EXCLUDED."checked", "updatedBy" = EXCLUDED."updatedBy", "updatedAt" = CURRENT_TIMESTAMP`;
}
export async function addCustomCheck(householdId: string, ymd: string, label: string, userId: string) {
  await ensurePlanTables();
  const key = `c:${randomUUID()}`;
  await prisma.$executeRaw`INSERT INTO "day_checks" ("householdId", "ymd", "key", "label", "custom", "updatedBy") VALUES (${householdId}, ${ymd}, ${key}, ${label.slice(0, 60)}, true, ${userId})`;
  return key;
}
export async function removeCustomCheck(householdId: string, ymd: string, key: string) {
  await ensurePlanTables();
  await prisma.$executeRaw`DELETE FROM "day_checks" WHERE "householdId" = ${householdId} AND "ymd" = ${ymd} AND "key" = ${key} AND "custom" = true`;
}
export async function setRide(householdId: string, reminderId: string, ymd: string, driverId: string | null) {
  await ensurePlanTables();
  if (!driverId) await prisma.$executeRaw`DELETE FROM "day_rides" WHERE "reminderId" = ${reminderId} AND "ymd" = ${ymd}`;
  else await prisma.$executeRaw`INSERT INTO "day_rides" ("reminderId", "ymd", "householdId", "driverId") VALUES (${reminderId}, ${ymd}, ${householdId}, ${driverId})
    ON CONFLICT ("reminderId", "ymd") DO UPDATE SET "driverId" = EXCLUDED."driverId", "updatedAt" = CURRENT_TIMESTAMP`;
}
/** Old rows are only useful for a day or two. */
export async function cleanupPlanTables() {
  try {
    await ensurePlanTables();
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    await prisma.$executeRaw`DELETE FROM "day_checks" WHERE "ymd" < ${cutoff}`;
    await prisma.$executeRaw`DELETE FROM "day_rides" WHERE "ymd" < ${cutoff}`;
  } catch (err) { console.error("Plan cleanup failed:", err); }
}
export async function deletePlanDataForUser(userId: string) {
  try {
    await ensurePlanTables();
    await prisma.$executeRaw`DELETE FROM "day_rides" WHERE "driverId" = ${userId}`;
    await prisma.$executeRaw`UPDATE "day_checks" SET "updatedBy" = NULL WHERE "updatedBy" = ${userId}`;
  } catch (err) { console.error("deletePlanDataForUser failed:", err); }
}
