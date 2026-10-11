import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tripCtx } from "../_ctx";
import {
  TRIP_KINDS, addDays, buildSteps, daysBetween, deleteTrip, getTrip, insertItem, isYmd, minusMinutes, parseFlight,
  passportDates, stockholmToday, travellersOf, tripItems,
} from "@/lib/trips";

// GET    → the whole trip: trip, travellers, steps, flights, packing, ideas, passports
// PATCH  { name?, destination?, startYmd?, endYmd?, kind?, travellers?, vaccine?, homeToAirportMin?, airportBufferMin? } (adults)
// DELETE (adults)
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const c = await tripCtx();
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const trip = await getTrip(params.id, c.householdId);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const items = await tripItems(trip.id);
  const travellerIds = travellersOf(trip, c.people);
  const travellers = c.people.filter((p) => travellerIds.includes(p.id));
  const passports = await passportDates(travellerIds);
  const steps = buildSteps(trip, items, travellers, passports, c.t, c.fmt);
  const today = stockholmToday();
  const flights = items.filter((i) => i.kind === "FLIGHT").map((i) => {
    const d = parseFlight(i);
    if (!d) return null;
    const leave = minusMinutes(d.depTime, trip.airportBufferMin + trip.homeToAirportMin);
    return { id: i.id, checked: i.checked, ...d, leave: leave.time, leaveDayBefore: leave.dayBefore };
  }).filter(Boolean).sort((a, b) => (a!.depYmd + a!.depTime).localeCompare(b!.depYmd + b!.depTime));
  return NextResponse.json({
    trip, me: c.uid, isAdult: c.isAdult, people: c.people, travellers,
    daysTo: daysBetween(today, trip.startYmd), daysLeft: daysBetween(today, trip.endYmd),
    steps, stepsLeft: steps.filter((s) => !s.done && s.level !== "ok" && s.ymd >= addDays(today, -365)).length,
    passports: Object.fromEntries(travellerIds.map((id) => [id, passports.get(id) ?? null])),
    flights,
    pack: items.filter((i) => i.kind === "PACK").map((i) => ({ id: i.id, label: i.label, personId: i.personId, checked: i.checked })),
    ideas: items.filter((i) => i.kind === "IDEA").map((i) => ({ id: i.id, label: i.label, personId: i.createdBy, votes: (i.votes ?? "").split(",").filter(Boolean) })),
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const c = await tripCtx();
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!c.isAdult) return NextResponse.json({ error: "Only an adult can change the trip" }, { status: 403 });
  const trip = await getTrip(params.id, c.householdId);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const next = { ...trip };
  if (typeof b.name === "string" && b.name.trim()) next.name = b.name.trim().slice(0, 80);
  if (b.destination !== undefined) next.destination = typeof b.destination === "string" && b.destination.trim() ? b.destination.trim().slice(0, 80) : null;
  if (isYmd(b.startYmd)) next.startYmd = b.startYmd;
  if (isYmd(b.endYmd)) next.endYmd = b.endYmd;
  if (next.endYmd < next.startYmd) return NextResponse.json({ error: "Pick the dates" }, { status: 400 });
  if (TRIP_KINDS.includes(b.kind)) next.kind = b.kind;
  if (Array.isArray(b.travellers)) {
    const ids = new Set(c.people.map((p) => p.id));
    next.travellers = b.travellers.filter((x: unknown) => typeof x === "string" && ids.has(x)).join(",") || null;
  }
  if (typeof b.vaccine === "boolean") next.vaccine = b.vaccine;
  const clamp = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : null);
  next.homeToAirportMin = clamp(b.homeToAirportMin, 0, 600) ?? trip.homeToAirportMin;
  next.airportBufferMin = clamp(b.airportBufferMin, 0, 600) ?? trip.airportBufferMin;
  await prisma.$executeRaw`UPDATE "trips" SET "name" = ${next.name}, "destination" = ${next.destination}, "startYmd" = ${next.startYmd}, "endYmd" = ${next.endYmd}, "kind" = ${next.kind}, "travellers" = ${next.travellers}, "vaccine" = ${next.vaccine}, "homeToAirportMin" = ${next.homeToAirportMin}, "airportBufferMin" = ${next.airportBufferMin} WHERE "id" = ${trip.id}`;
  if (next.vaccine && !trip.vaccine) {
    const items = await tripItems(trip.id);
    if (!items.some((i) => i.kind === "TODO" && i.label === c.t.vaccineTodo)) await insertItem(trip.id, "TODO", c.t.vaccineTodo, c.uid, { dueYmd: addDays(next.startYmd, -42) });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const c = await tripCtx();
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!c.isAdult) return NextResponse.json({ error: "Only an adult can delete the trip" }, { status: 403 });
  const trip = await getTrip(params.id, c.householdId);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await deleteTrip(trip);
  return NextResponse.json({ ok: true });
}
