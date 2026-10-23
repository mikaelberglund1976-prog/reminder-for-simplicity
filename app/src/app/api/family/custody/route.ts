import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stockholmYmd } from "@/lib/tomorrowPlan";
import {
  CUSTODY_ENABLED, CUSTODY_PATTERNS, custodyDays, isTime, isYmd, loadCustodyOverrides, loadSchedules,
  removeSchedule, saveSchedule, setCustodyOverride, addDays, type CustodyPattern, type Parent,
} from "@/lib/custody";

// 2026-10-23 (row 52): shared custody — PREPARED, NOT LIVE (lib/custody.ts).
// With FEATURE_CUSTODY unset every method answers 404, so the card stays hidden.
// GET                                                     → per child: schedule + the next 14 days
// PUT    { childId, pattern, startYmd, handoverTime, a: {userId|label}, b: {userId|label} }   (adults)
// DELETE ?childId=…                                       → remove the schedule                 (adults)
// POST   { childId, ymd, side: "A"|"B"|null, note? }      → one-day exception / clear it        (adults)
export const dynamic = "force-dynamic";
const ADULT = ["OWNER", "PARENT", "ADULT"];
const off = () => NextResponse.json({ error: "Not found" }, { status: 404 });

async function ctx() {
  const session = await getServerSession(authOptions);
  const uid = session?.user?.id;
  if (!uid) return null;
  const me = await prisma.householdMember.findFirst({
    where: { userId: uid },
    include: { household: { include: { members: { include: { user: { select: { id: true, name: true, email: true, deletedAt: true } } } } } } },
  });
  if (!me) return null;
  const live = me.household.members.filter((m) => !m.user.deletedAt);
  const name = (m: (typeof live)[number]) => ((m.user.name ?? m.user.email.split("@")[0]) as string).split(" ")[0];
  return {
    uid, me, isAdult: ADULT.includes(me.role),
    children: live.filter((m) => m.role === "CHILD").map((m) => ({ id: m.userId, name: name(m) })),
    adults: live.filter((m) => ADULT.includes(m.role)).map((m) => ({ id: m.userId, name: name(m) })),
  };
}

export async function GET() {
  if (!CUSTODY_ENABLED) return off();
  const c = await ctx();
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const visible = c.isAdult ? c.children : c.children.filter((ch) => ch.id === c.uid);
  const today = stockholmYmd();
  const ids = visible.map((v) => v.id);
  const [schedules, overrides] = await Promise.all([loadSchedules(ids), loadCustodyOverrides(ids, addDays(today, -1), addDays(today, 14))]);
  const label = (p: Parent) => (p.userId ? c.adults.find((a) => a.id === p.userId)?.name ?? null : p.label);
  return NextResponse.json({
    canEdit: c.isAdult,
    adults: c.adults,
    patterns: CUSTODY_PATTERNS,
    children: visible.map((ch) => {
      const s = schedules.get(ch.id) ?? null;
      return {
        childId: ch.id, name: ch.name, schedule: s,
        aName: s ? label(s.a) : null, bName: s ? label(s.b) : null,
        days: s ? custodyDays(s, today, 14, overrides) : [],
      };
    }),
  });
}

async function adultFor(childId: unknown) {
  if (!CUSTODY_ENABLED) return { res: off() } as const;
  const c = await ctx();
  if (!c) return { res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  if (!c.isAdult) return { res: NextResponse.json({ error: "Only an adult can change this" }, { status: 403 }) } as const;
  const child = c.children.find((ch) => ch.id === childId);
  if (!child) return { res: NextResponse.json({ error: "Pick one of your children" }, { status: 400 }) } as const;
  return { c, child } as const;
}

function parent(v: unknown, adults: { id: string }[]): Parent | null {
  const o = (v ?? {}) as { userId?: unknown; label?: unknown };
  if (typeof o.userId === "string" && adults.some((a) => a.id === o.userId)) return { userId: o.userId, label: null };
  if (typeof o.label === "string" && o.label.trim()) return { userId: null, label: o.label.trim().slice(0, 40) };
  return null;
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  const r = await adultFor(body?.childId);
  if ("res" in r) return r.res;
  const pattern = (CUSTODY_PATTERNS as string[]).includes(body?.pattern) ? (body.pattern as CustodyPattern) : null;
  const a = parent(body?.a, r.c.adults);
  const b = parent(body?.b, r.c.adults);
  if (!pattern || !isYmd(body?.startYmd) || !a || !b) return NextResponse.json({ error: "Fill in both parents, the pattern and the start date" }, { status: 400 });
  const handoverTime = isTime(body?.handoverTime) ? body.handoverTime : null;
  await saveSchedule(r.c.me.householdId, { childId: r.child.id, pattern, startYmd: body.startYmd, handoverTime, a, b }, r.c.uid);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const r = await adultFor(new URL(req.url).searchParams.get("childId"));
  if ("res" in r) return r.res;
  await removeSchedule(r.child.id);
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const r = await adultFor(body?.childId);
  if ("res" in r) return r.res;
  if (!isYmd(body?.ymd)) return NextResponse.json({ error: "Pick a date" }, { status: 400 });
  const side = body?.side === "A" || body?.side === "B" ? body.side : null;
  const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim().slice(0, 60) : null;
  await setCustodyOverride(r.c.me.householdId, r.child.id, body.ymd, side, note, r.c.uid);
  return NextResponse.json({ ok: true });
}
