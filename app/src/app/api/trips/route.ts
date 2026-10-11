import { NextResponse } from "next/server";
import { tripCtx } from "./_ctx";
import { TRIP_KINDS, createTrip, daysBetween, isYmd, listTrips, stockholmToday, tripItems, type TripKind } from "@/lib/trips";

// 2026-10-11: Trips (lib/trips.ts).
// GET  → { trips: [{ ...trip, left, packed, packTotal }], isAdult }
// POST { name, destination?, startYmd, endYmd, kind, travellers: [userId], vaccine } → { id } (adults)
export const dynamic = "force-dynamic";

export async function GET() {
  const c = await tripCtx();
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const trips = await listTrips(c.householdId);
  const out = [];
  for (const trip of trips) {
    const items = await tripItems(trip.id);
    const packs = items.filter((i) => i.kind === "PACK");
    const todos = items.filter((i) => i.kind === "TODO" && !i.checked).length;
    out.push({ ...trip, packTotal: packs.length, packed: packs.filter((i) => i.checked).length, todosLeft: todos, daysTo: daysBetween(stockholmToday(), trip.startYmd) });
  }
  return NextResponse.json({ trips: out, isAdult: c.isAdult, people: c.people, me: c.uid });
}

export async function POST(req: Request) {
  const c = await tripCtx();
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!c.isAdult) return NextResponse.json({ error: "Only an adult can add a trip" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const name = typeof b?.name === "string" ? b.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (!isYmd(b?.startYmd) || !isYmd(b?.endYmd) || b.endYmd < b.startYmd) return NextResponse.json({ error: "Pick the dates" }, { status: 400 });
  const kind: TripKind = TRIP_KINDS.includes(b?.kind) ? b.kind : "OTHER";
  const ids = new Set(c.people.map((p) => p.id));
  const travellers = Array.isArray(b?.travellers) ? b.travellers.filter((x: unknown): x is string => typeof x === "string" && ids.has(x)) : [];
  const destination = typeof b?.destination === "string" && b.destination.trim() ? b.destination.trim() : null;
  try {
    const id = await createTrip({ householdId: c.householdId, name, destination, startYmd: b.startYmd, endYmd: b.endYmd, kind, travellers, vaccine: !!b?.vaccine, createdBy: c.uid }, c.people, c.t);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("Trip create error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
