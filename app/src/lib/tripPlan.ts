// 2026-11-05 (Mikael: "nästa del, om man ska resa internt … hotell … buss, flyg
// eller annat till nästa stad … ska hjälpa med vilka dagar man är borta"):
// the trip's route as a timeline of nights, and the gaps in it.
//
// Pure functions only (no database) so the rules can be tested on their own
// and reused for anything that is "a series of bookings that should cover
// every night" (CAPABILITY-KANDIDAT: tidslinje-luckor).
//
// Rules (BESLUTAD 2026-11-05):
//  - The whole family travels together in v1 → gaps are counted per trip,
//    not per person.
//  - Warnings never block. Anything can be saved; a warning stays until it
//    is solved or someone taps "Ignore".
//  - We count NIGHTS, not days. Night N = the evening of date N to the
//    morning of N+1. A night is covered by a stay (check-in ≤ N < check-out)
//    or by being on the move (a leg that leaves on N and arrives on N+1, or
//    leaves on N+1 before 06:00 — e.g. a 00:40 flight after a layover).
//  - The frame is the trip's dates, stretched if a leg leaves before them or
//    lands after them. Night of the last day is home.

export type LegKind = "FLIGHT" | "MOVE";
export type MoveMode = "TRAIN" | "BUS" | "BOAT" | "CAR" | "TRANSFER" | "OTHER";
export const MOVE_MODES: MoveMode[] = ["TRAIN", "BUS", "BOAT", "CAR", "TRANSFER", "OTHER"];

export type PlanLeg = {
  id: string; kind: LegKind; mode?: MoveMode; title: string;
  from?: string; to?: string;
  depYmd: string; depTime?: string | null; arrYmd: string; arrTime?: string | null;
  connection?: boolean;
};
export type PlanStay = { id: string; name: string; checkIn: string; checkOut: string };

export type WarnKind = "GAP" | "OVERLAP" | "OUTSIDE" | "TRANSFER" | "LATE";
export type PlanWarning = {
  key: string; kind: WarnKind;
  /** Where on the timeline it belongs (sorts with the legs and stays). */
  at: string;
  nights?: string[]; stayIds?: string[]; legId?: string; place?: string; time?: string;
  /** Pre-fill for the fix button. */
  fix?: { type: "STAY"; checkIn: string; checkOut: string } | { type: "MOVE"; mode: MoveMode; from?: string; depYmd: string; depTime?: string };
};
export type Plan = {
  frameStart: string; frameEnd: string;
  nights: { ymd: string; stays: string[]; moving: boolean }[];
  warnings: PlanWarning[];
  dismissed: number;
};

const day = (ymd: string, n: number) => new Date(Date.parse(ymd + "T12:00:00Z") + n * 86400000).toISOString().slice(0, 10);
const lt = (a: string, b: string) => a < b;

/** Builds the nights and the warnings. `dismissed` = warning keys someone chose to ignore. */
export function buildPlan(trip: { startYmd: string; endYmd: string }, legs: PlanLeg[], stays: PlanStay[], dismissed: Set<string> = new Set()): Plan {
  const sorted = [...legs].sort((a, b) => (a.depYmd + (a.depTime ?? "12:00")).localeCompare(b.depYmd + (b.depTime ?? "12:00")));
  let frameStart = trip.startYmd;
  let frameEnd = trip.endYmd;
  for (const l of sorted) {
    if (lt(l.depYmd, frameStart)) frameStart = l.depYmd;
    if (lt(frameEnd, l.arrYmd)) frameEnd = l.arrYmd;
  }

  const nights: Plan["nights"] = [];
  for (let n = frameStart, guard = 0; lt(n, frameEnd) && guard < 400; n = day(n, 1), guard++) {
    const onStays = stays.filter((s) => s.checkIn <= n && n < s.checkOut).map((s) => s.id);
    const moving = sorted.some((l) => (l.depYmd <= n && l.arrYmd > n) || (l.depYmd === day(n, 1) && !!l.depTime && l.depTime < "06:00"));
    nights.push({ ymd: n, stays: onStays, moving });
  }

  const all: PlanWarning[] = [];

  // 1. Nights with nowhere to sleep — grouped into runs.
  let run: string[] = [];
  const flush = () => {
    if (!run.length) return;
    all.push({ key: `gap:${run[0]}`, kind: "GAP", at: `${run[0]}T23:58`, nights: run, fix: { type: "STAY", checkIn: run[0], checkOut: day(run[run.length - 1], 1) } });
    run = [];
  };
  for (const n of nights) {
    if (!n.stays.length && !n.moving) run.push(n.ymd);
    else flush();
  }
  flush();

  // 2. Two stays on the same night — one warning per pair.
  const pairs = new Map<string, string[]>();
  for (const n of nights) {
    for (let i = 0; i < n.stays.length; i++) for (let j = i + 1; j < n.stays.length; j++) {
      const k = [n.stays[i], n.stays[j]].sort().join("|");
      pairs.set(k, [...(pairs.get(k) ?? []), n.ymd]);
    }
  }
  pairs.forEach((ns, k) => all.push({ key: `overlap:${k}`, kind: "OVERLAP", at: `${ns[0]}T23:57`, nights: ns, stayIds: k.split("|") }));

  // 3. A stay outside the trip.
  for (const s of stays) {
    if (lt(s.checkIn, frameStart) || lt(frameEnd, s.checkOut)) all.push({ key: `outside:${s.id}`, kind: "OUTSIDE", at: `${s.checkIn}T23:56`, stayIds: [s.id] });
  }

  // 4. Landed at an airport with nothing booked onwards. Not after the last
  //    leg (that's home) and not when the next leg is a connecting flight.
  sorted.forEach((l, i) => {
    if (l.kind !== "FLIGHT" || i === sorted.length - 1) return;
    const next = sorted[i + 1];
    if (next.kind === "FLIGHT" && next.connection) return;
    const arrAt = l.arrYmd + (l.arrTime ?? "00:00");
    const limit = day(l.arrYmd, 1) + "06:00";
    const onward = sorted.some((m) => m.kind === "MOVE" && (m.depYmd + (m.depTime ?? "23:59")) >= arrAt && (m.depYmd + (m.depTime ?? "00:00")) <= limit);
    if (!onward) all.push({ key: `transfer:${l.id}`, kind: "TRANSFER", at: `${l.arrYmd}T${l.arrTime ?? "12:00"}~`, legId: l.id, place: l.to, fix: { type: "MOVE", mode: "TRANSFER", from: l.to, depYmd: l.arrYmd, depTime: l.arrTime ?? undefined } });
  });

  // 5. Arriving late on the check-in day.
  for (const s of stays) {
    const late = sorted.filter((l) => l.arrYmd === s.checkIn && !!l.arrTime && l.arrTime >= "22:00").map((l) => l.arrTime!).sort().pop();
    if (late) all.push({ key: `late:${s.id}`, kind: "LATE", at: `${s.checkIn}T23:59~`, stayIds: [s.id], time: late });
  }

  const warnings = all.filter((w) => !dismissed.has(w.key)).sort((a, b) => a.at.localeCompare(b.at));
  return { frameStart, frameEnd, nights, warnings, dismissed: all.length - warnings.length };
}
