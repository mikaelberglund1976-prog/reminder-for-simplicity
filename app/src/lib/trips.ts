// 2026-10-11 (Mikael: "om man som familj ska på semester eller cup …"): Trips.
// A trip is one place for what the family needs before and during it:
//  - Before the trip: passports (expiry date per person — never the number),
//    vaccination, tickets, check-in and "leave home at", as a timeline that
//    also nudges by push (lib/cron.ts → tripNudges).
//  - Flights & times: each flight is also a normal item in the calendar, so
//    the change watch, the "Tomorrow" card and reminders cover it for free.
//  - Packing list per person (templates for beach / ski / city / cup), ticked
//    off together — children tick their own.
//  - Things we want to do there: anyone adds, everyone votes.
//
// Storage: self-creating tables (no database step on deploy).
//   trips        — one row per trip.
//   trip_items   — packing (PACK), ideas (IDEA), flights (FLIGHT), to-dos (TODO).
//   person_docs  — passport expiry date per person (only the date).
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { setTime } from "@/lib/reminderTimes";
import type { Messages } from "@/lib/i18n/messages";

export const ADULT = ["OWNER", "PARENT", "ADULT"];
export type TripKind = "BEACH" | "SKI" | "CITY" | "CUP" | "OTHER";
export const TRIP_KINDS: TripKind[] = ["BEACH", "SKI", "CITY", "CUP", "OTHER"];
export type ItemKind = "PACK" | "IDEA" | "FLIGHT" | "TODO";

export type TripRow = {
  id: string; householdId: string; name: string; destination: string | null; startYmd: string; endYmd: string;
  kind: string; travellers: string | null; vaccine: boolean; homeToAirportMin: number; airportBufferMin: number;
  createdBy: string; createdAt: Date;
};
// 2026-10-11 (Mikael): timing per flight, and connecting flights (a change on
// the way — no "leave home", the layover is shown instead).
export type FlightData = {
  flightNo?: string; from?: string; to?: string; depYmd: string; depTime: string; arrTime?: string | null; returnLeg?: boolean;
  arrNextDay?: boolean; connection?: boolean; airportMin?: number; travelMin?: number;
};
export type ItemRow = {
  id: string; tripId: string; kind: ItemKind; personId: string | null; label: string; checked: boolean;
  votes: string | null; data: string | null; dueYmd: string | null; reminderId: string | null; createdBy: string; createdAt: Date;
};

let ensured: Promise<void> | null = null;
export function ensureTripTables(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "trips" ("id" TEXT NOT NULL, "householdId" TEXT NOT NULL, "name" TEXT NOT NULL, "destination" TEXT, "startYmd" TEXT NOT NULL, "endYmd" TEXT NOT NULL, "kind" TEXT NOT NULL DEFAULT 'OTHER', "travellers" TEXT, "vaccine" BOOLEAN NOT NULL DEFAULT false, "homeToAirportMin" INTEGER NOT NULL DEFAULT 45, "airportBufferMin" INTEGER NOT NULL DEFAULT 120, "createdBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "trips_pkey" PRIMARY KEY ("id"))`
      );
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "trips_household_idx" ON "trips"("householdId")`);
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "trip_items" ("id" TEXT NOT NULL, "tripId" TEXT NOT NULL, "kind" TEXT NOT NULL, "personId" TEXT, "label" TEXT NOT NULL, "checked" BOOLEAN NOT NULL DEFAULT false, "votes" TEXT, "data" TEXT, "dueYmd" TEXT, "reminderId" TEXT, "createdBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "trip_items_pkey" PRIMARY KEY ("id"))`
      );
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "trip_items_trip_idx" ON "trip_items"("tripId")`);
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "person_docs" ("userId" TEXT NOT NULL, "passportExpires" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "person_docs_pkey" PRIMARY KEY ("userId"))`
      );
    })().catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}

export const stockholmToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export const addDays = (ymd: string, n: number) => new Date(Date.parse(ymd + "T12:00:00Z") + n * 86400000).toISOString().slice(0, 10);
export const addMonths = (ymd: string, n: number) => { const d = new Date(ymd + "T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000);
export const isYmd = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
export const isHhmm = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

/** "07:10" minus 165 min → "04:25" (and whether it's the day before). */
export function minusMinutes(hhmm: string, mins: number): { time: string; dayBefore: boolean } {
  let total = +hhmm.slice(0, 2) * 60 + +hhmm.slice(3, 5) - mins;
  const dayBefore = total < 0;
  total = ((total % 1440) + 1440) % 1440;
  return { time: `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`, dayBefore };
}

// ── access ──────────────────────────────────────────────────────────────────
export async function memberCtx(userId: string) {
  const m = await prisma.householdMember.findFirst({
    where: { userId },
    include: { household: { include: { members: { include: { user: { select: { id: true, name: true, deletedAt: true } } } } } } },
  });
  if (!m) return null;
  const people = m.household.members.filter((x) => !x.user.deletedAt).map((x) => ({ id: x.userId, name: (x.user.name ?? "").split(" ")[0] || "?", role: x.role as string }));
  return { householdId: m.householdId, role: m.role as string, isAdult: ADULT.includes(m.role), people };
}

export async function getTrip(id: string, householdId: string): Promise<TripRow | null> {
  await ensureTripTables();
  const rows = await prisma.$queryRaw<TripRow[]>`SELECT * FROM "trips" WHERE "id" = ${id} AND "householdId" = ${householdId} LIMIT 1`;
  return rows[0] ?? null;
}
export async function listTrips(householdId: string): Promise<TripRow[]> {
  await ensureTripTables();
  return prisma.$queryRaw<TripRow[]>`SELECT * FROM "trips" WHERE "householdId" = ${householdId} ORDER BY "startYmd" ASC`;
}
export async function tripItems(tripId: string): Promise<ItemRow[]> {
  await ensureTripTables();
  return prisma.$queryRaw<ItemRow[]>`SELECT * FROM "trip_items" WHERE "tripId" = ${tripId} ORDER BY "createdAt" ASC`;
}
export function travellersOf(trip: TripRow, people: { id: string }[]): string[] {
  const ids = (trip.travellers ?? "").split(",").filter(Boolean);
  const live = new Set(people.map((p) => p.id));
  const picked = ids.filter((id) => live.has(id));
  return picked.length ? picked : people.map((p) => p.id);
}

// ── packing templates ───────────────────────────────────────────────────────
export function packTemplate(kind: TripKind, t: Messages["trips"], isChild: boolean): string[] {
  const base = [...t.packBase];
  const extra = kind === "BEACH" ? t.packBeach : kind === "SKI" ? t.packSki : kind === "CITY" ? t.packCity : kind === "CUP" ? t.packCup : [];
  return [...base, ...extra, ...(isChild ? t.packChild : [])];
}

export async function insertItem(tripId: string, kind: ItemKind, label: string, createdBy: string, extra: { personId?: string | null; data?: object | null; dueYmd?: string | null; reminderId?: string | null } = {}) {
  await ensureTripTables();
  const id = randomUUID();
  await prisma.$executeRaw`INSERT INTO "trip_items" ("id", "tripId", "kind", "personId", "label", "data", "dueYmd", "reminderId", "createdBy") VALUES (${id}, ${tripId}, ${kind}, ${extra.personId ?? null}, ${label.slice(0, 120)}, ${extra.data ? JSON.stringify(extra.data) : null}, ${extra.dueYmd ?? null}, ${extra.reminderId ?? null}, ${createdBy})`;
  return id;
}

export async function createTrip(input: { householdId: string; name: string; destination: string | null; startYmd: string; endYmd: string; kind: TripKind; travellers: string[]; vaccine: boolean; createdBy: string }, people: { id: string; role: string }[], t: Messages["trips"]): Promise<string> {
  await ensureTripTables();
  const id = randomUUID();
  await prisma.$executeRaw`INSERT INTO "trips" ("id", "householdId", "name", "destination", "startYmd", "endYmd", "kind", "travellers", "vaccine", "createdBy") VALUES (${id}, ${input.householdId}, ${input.name.slice(0, 80)}, ${input.destination?.slice(0, 80) ?? null}, ${input.startYmd}, ${input.endYmd}, ${input.kind}, ${input.travellers.join(",") || null}, ${input.vaccine}, ${input.createdBy})`;
  // Packing list per traveller + the shared things.
  const going = input.travellers.length ? people.filter((p) => input.travellers.includes(p.id)) : people;
  for (const p of going) {
    for (const label of packTemplate(input.kind, t, p.role === "CHILD")) await insertItem(id, "PACK", label, input.createdBy, { personId: p.id });
  }
  for (const label of t.packShared) await insertItem(id, "PACK", label, input.createdBy);
  // Default to-dos before the trip.
  for (const [label, daysBefore] of t.defaultTodos) await insertItem(id, "TODO", label, input.createdBy, { dueYmd: addDays(input.startYmd, -daysBefore) });
  if (input.vaccine) await insertItem(id, "TODO", t.vaccineTodo, input.createdBy, { dueYmd: addDays(input.startYmd, -42) });
  return id;
}

export async function deleteTrip(trip: TripRow) {
  const items = await tripItems(trip.id);
  const reminderIds = items.map((i) => i.reminderId).filter((x): x is string => !!x);
  if (reminderIds.length) await prisma.reminder.updateMany({ where: { id: { in: reminderIds }, householdId: trip.householdId }, data: { isActive: false } });
  await prisma.$executeRaw`DELETE FROM "trip_items" WHERE "tripId" = ${trip.id}`;
  await prisma.$executeRaw`DELETE FROM "trips" WHERE "id" = ${trip.id}`;
}

// ── flights (also a calendar item) ──────────────────────────────────────────
export function flightTitle(f: FlightData) {
  const route = f.from && f.to ? ` ${f.from.toUpperCase()} → ${f.to.toUpperCase()}` : "";
  return `✈️ ${f.flightNo ? f.flightNo.toUpperCase() : ""}${route}`.trim();
}
export async function saveFlightReminder(trip: TripRow, f: FlightData, userId: string, existingId: string | null): Promise<string> {
  const name = `${flightTitle(f)} · ${trip.name}`.slice(0, 120);
  const date = new Date(f.depYmd + "T10:00:00.000Z");
  let id = existingId;
  if (id) {
    const r = await prisma.reminder.findFirst({ where: { id, householdId: trip.householdId } });
    if (r) await prisma.reminder.update({ where: { id }, data: { name, date, isActive: true } });
    else id = null;
  }
  if (!id) {
    const r = await prisma.reminder.create({
      data: { name, category: "OTHER", userId, householdId: trip.householdId, visibility: "HOUSEHOLD", recurrence: "ONCE", date, reminderDaysBefore: 1, note: trip.destination ? `🧳 ${trip.name} – ${trip.destination}` : `🧳 ${trip.name}` },
      select: { id: true },
    });
    id = r.id;
  }
  const arr = f.arrTime && !f.arrNextDay && f.arrTime > f.depTime ? f.arrTime : null;
  await setTime(id, { startTime: f.depTime, endTime: arr });
  return id;
}

// ── the "before the trip" timeline ──────────────────────────────────────────
export type Step = { key: string; ymd: string; text: string; level: "ok" | "todo" | "warn" | "bad"; done: boolean; itemId?: string; personId?: string };

export async function passportDates(userIds: string[]): Promise<Map<string, string | null>> {
  await ensureTripTables();
  if (!userIds.length) return new Map();
  const rows = await prisma.$queryRaw<{ userId: string; passportExpires: string | null }[]>`SELECT "userId", "passportExpires" FROM "person_docs" WHERE "userId" = ANY(${userIds}::text[])`;
  return new Map(rows.map((r) => [r.userId, r.passportExpires]));
}
export async function setPassport(userId: string, ymd: string | null) {
  await ensureTripTables();
  await prisma.$executeRaw`INSERT INTO "person_docs" ("userId", "passportExpires", "updatedAt") VALUES (${userId}, ${ymd}, NOW()) ON CONFLICT ("userId") DO UPDATE SET "passportExpires" = EXCLUDED."passportExpires", "updatedAt" = NOW()`;
}

export function buildSteps(trip: TripRow, items: ItemRow[], travellers: { id: string; name: string }[], passports: Map<string, string | null>, t: Messages["trips"], fmt: (ymd: string) => string = (x) => x): Step[] {
  const steps: Step[] = [];
  const passBy = addDays(trip.startYmd, -60);
  for (const p of travellers) {
    const exp = passports.get(p.id) ?? null;
    if (!exp) steps.push({ key: `pass-${p.id}`, ymd: passBy, text: t.stepPassMissing(p.name), level: "todo", done: false, personId: p.id });
    else if (exp < trip.endYmd) steps.push({ key: `pass-${p.id}`, ymd: passBy, text: t.stepPassExpires(p.name, fmt(exp)), level: "bad", done: false, personId: p.id });
    else if (exp < addMonths(trip.endYmd, 6)) steps.push({ key: `pass-${p.id}`, ymd: passBy, text: t.stepPassSixMonths(p.name, fmt(exp)), level: "warn", done: false, personId: p.id });
    else steps.push({ key: `pass-${p.id}`, ymd: passBy, text: t.stepPassOk(p.name, fmt(exp)), level: "ok", done: true, personId: p.id });
  }
  if (trip.vaccine) {
    const todo = items.find((i) => i.kind === "TODO" && i.label === t.vaccineTodo);
    steps.push({ key: "vaccine", ymd: addDays(trip.startYmd, -42), text: t.vaccineTodo, level: "todo", done: !!todo?.checked, itemId: todo?.id });
  }
  for (const i of items.filter((x) => x.kind === "TODO" && x.label !== t.vaccineTodo)) {
    steps.push({ key: i.id, ymd: i.dueYmd ?? trip.startYmd, text: i.label, level: "todo", done: i.checked, itemId: i.id });
  }
  for (const f of items.filter((x) => x.kind === "FLIGHT")) {
    const d = parseFlight(f);
    if (!d) continue;
    if (d.connection) continue; // checked in together with the first flight, and you don't leave home
    steps.push({ key: `checkin-${f.id}`, ymd: addDays(d.depYmd, -1), text: t.stepCheckIn(flightTitle(d)), level: "todo", done: f.checked, itemId: f.id });
    const leave = leaveFor(trip, d)!;
    steps.push({ key: `leave-${f.id}`, ymd: leave.dayBefore ? addDays(d.depYmd, -1) : d.depYmd, text: t.stepLeave(leave.time, flightTitle(d)), level: "ok", done: false });
  }
  const packs = items.filter((x) => x.kind === "PACK");
  const left = packs.filter((x) => !x.checked).length;
  if (packs.length) steps.push({ key: "pack", ymd: addDays(trip.startYmd, -2), text: left ? t.stepPack(left) : t.stepPacked, level: left ? "todo" : "ok", done: left === 0 });
  return steps.sort((a, b) => a.ymd.localeCompare(b.ymd) || a.key.localeCompare(b.key));
}

/** "Leave home" for a flight — null for a connecting flight. */
export function leaveFor(trip: Pick<TripRow, "airportBufferMin" | "homeToAirportMin">, f: FlightData) {
  if (f.connection) return null;
  return minusMinutes(f.depTime, (f.airportMin ?? trip.airportBufferMin) + (f.travelMin ?? trip.homeToAirportMin));
}
/** Minutes between the previous flight's landing and this one's departure (null if unknown). */
export function layoverMinutes(prev: FlightData, f: FlightData): number | null {
  if (!prev.arrTime) return null;
  const arrYmd = prev.arrNextDay ? addDays(prev.depYmd, 1) : prev.depYmd;
  const mins = (Date.parse(`${f.depYmd}T${f.depTime}:00Z`) - Date.parse(`${arrYmd}T${prev.arrTime}:00Z`)) / 60000;
  return Number.isFinite(mins) ? Math.round(mins) : null;
}
/** Reads a flight from a request body (POST and PATCH). */
export function flightFromBody(b: Record<string, unknown>): FlightData | null {
  if (!isYmd(b.depYmd) || !isHhmm(b.depTime)) return null;
  const s = (v: unknown, n: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : undefined);
  const mins = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(600, Math.round(v))) : undefined);
  return {
    flightNo: s(b.flightNo, 12), from: s(b.from, 30), to: s(b.to, 30), depYmd: b.depYmd, depTime: b.depTime,
    arrTime: isHhmm(b.arrTime) ? b.arrTime : null, arrNextDay: !!b.arrNextDay, connection: !!b.connection,
    airportMin: mins(b.airportMin), travelMin: mins(b.travelMin),
  };
}

/** 2026-10-11: a link on an idea ("Vill göra"). http(s) only; "www.x.se" gets https://. */
export function cleanUrl(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  let s = v.trim();
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try { const u = new URL(s); return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".") && s.length <= 1000 ? u.toString() : null; } catch { return null; }
}
export function ideaUrl(i: ItemRow): string | null {
  try { const d = JSON.parse(i.data ?? "null"); return typeof d?.url === "string" ? d.url : null; } catch { return null; }
}

export function parseFlight(i: ItemRow): FlightData | null {
  try { const d = JSON.parse(i.data ?? "null"); return d && isYmd(d.depYmd) && isHhmm(d.depTime) ? d : null; } catch { return null; }
}
