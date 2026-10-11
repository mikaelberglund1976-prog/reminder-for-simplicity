import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tripCtx } from "../../_ctx";
import { cleanUrl, flightFromBody, getTrip, insertItem, isYmd, saveFlightReminder, tripItems, type ItemKind } from "@/lib/trips";

// POST   { kind: "PACK"|"IDEA"|"TODO", label, personId?, dueYmd? }  → { id }
// POST   { kind: "FLIGHT", flightNo?, from?, to?, depYmd, depTime, arrTime? } (adults) → { id }
// PATCH  { itemId, checked? , vote? , label? } | { itemId, flight: {…} } (adults)
// DELETE ?itemId=…
// Children: add ideas and their own packing, vote, tick their own packing.
export const dynamic = "force-dynamic";
const KINDS: ItemKind[] = ["PACK", "IDEA", "TODO", "FLIGHT"];

async function load(id: string) {
  const c = await tripCtx();
  if (!c) return { res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  const trip = await getTrip(id, c.householdId);
  if (!trip) return { res: NextResponse.json({ error: "Not found" }, { status: 404 }) } as const;
  return { c, trip } as const;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const l = await load(params.id);
  if ("res" in l) return l.res;
  const { c, trip } = l;
  const b = await req.json().catch(() => ({}));
  const kind: ItemKind | null = KINDS.includes(b?.kind) ? b.kind : null;
  if (!kind) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (!c.isAdult && (kind === "FLIGHT" || kind === "TODO")) return NextResponse.json({ error: "Only an adult can do that" }, { status: 403 });

  if (kind === "FLIGHT") {
    const f = flightFromBody(b);
    if (!f) return NextResponse.json({ error: "Add the date and departure time" }, { status: 400 });
    const reminderId = await saveFlightReminder(trip, f, c.uid, null);
    const id = await insertItem(trip.id, "FLIGHT", f.flightNo ?? "flight", c.uid, { data: f, reminderId });
    return NextResponse.json({ id }, { status: 201 });
  }
  const label = typeof b?.label === "string" ? b.label.trim() : "";
  if (!label) return NextResponse.json({ error: "Write something first" }, { status: 400 });
  const ids = new Set(c.people.map((p) => p.id));
  let personId = typeof b?.personId === "string" && ids.has(b.personId) ? b.personId : null;
  if (!c.isAdult && kind === "PACK") personId = c.uid;
  const url = kind === "IDEA" ? cleanUrl(b?.url) : null;
  const id = await insertItem(trip.id, kind, label, c.uid, { personId, dueYmd: kind === "TODO" && isYmd(b?.dueYmd) ? b.dueYmd : null, data: url ? { url } : null });
  return NextResponse.json({ id }, { status: 201 });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const l = await load(params.id);
  if ("res" in l) return l.res;
  const { c, trip } = l;
  const b = await req.json().catch(() => ({}));
  const item = (await tripItems(trip.id)).find((i) => i.id === b?.itemId);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (typeof b.vote === "boolean" && item.kind === "IDEA") {
    const votes = new Set((item.votes ?? "").split(",").filter(Boolean));
    if (b.vote) votes.add(c.uid); else votes.delete(c.uid);
    await prisma.$executeRaw`UPDATE "trip_items" SET "votes" = ${Array.from(votes).join(",") || null} WHERE "id" = ${item.id}`;
    return NextResponse.json({ ok: true });
  }
  // 2026-10-11: edit a flight (tap the card) — the calendar item follows.
  if (b.flight && typeof b.flight === "object" && item.kind === "FLIGHT") {
    if (!c.isAdult) return NextResponse.json({ error: "Only an adult can do that" }, { status: 403 });
    const f = flightFromBody(b.flight);
    if (!f) return NextResponse.json({ error: "Add the date and departure time" }, { status: 400 });
    const reminderId = await saveFlightReminder(trip, f, c.uid, item.reminderId);
    await prisma.$executeRaw`UPDATE "trip_items" SET "data" = ${JSON.stringify(f)}, "label" = ${f.flightNo ?? "flight"}, "reminderId" = ${reminderId} WHERE "id" = ${item.id}`;
    return NextResponse.json({ ok: true });
  }
  const mayEdit = c.isAdult || item.personId === c.uid || (item.kind === "IDEA" && item.createdBy === c.uid);
  if (!mayEdit) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  if (typeof b.checked === "boolean") await prisma.$executeRaw`UPDATE "trip_items" SET "checked" = ${b.checked} WHERE "id" = ${item.id}`;
  if (b.url !== undefined && item.kind === "IDEA") {
    const url = cleanUrl(b.url);
    if (b.url && !url) return NextResponse.json({ error: "That doesn't look like a link" }, { status: 400 });
    await prisma.$executeRaw`UPDATE "trip_items" SET "data" = ${url ? JSON.stringify({ url }) : null} WHERE "id" = ${item.id}`;
  }
  if (typeof b.label === "string" && b.label.trim() && item.kind !== "FLIGHT") await prisma.$executeRaw`UPDATE "trip_items" SET "label" = ${b.label.trim().slice(0, 120)} WHERE "id" = ${item.id}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const l = await load(params.id);
  if ("res" in l) return l.res;
  const { c, trip } = l;
  const itemId = new URL(req.url).searchParams.get("itemId");
  const item = (await tripItems(trip.id)).find((i) => i.id === itemId);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const mayDelete = c.isAdult || item.createdBy === c.uid;
  if (!mayDelete) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  if (item.reminderId) await prisma.reminder.updateMany({ where: { id: item.reminderId, householdId: trip.householdId }, data: { isActive: false } });
  await prisma.$executeRaw`DELETE FROM "trip_items" WHERE "id" = ${item.id}`;
  return NextResponse.json({ ok: true });
}
