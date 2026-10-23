import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLocaleForUser } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { sendPushToUser } from "@/lib/webPush";
import { stockholmYmd } from "@/lib/tomorrowPlan";
import {
  MAX_OVERRIDE_DAYS, WAKE_OPTIONS, addDays, addOverride, groupOverrides, isTime, isYmd, isoWeek,
  firstLessons, loadOverrides, loadStartData, removeOverride, resolveStart, saveSchedule, weekLetter,
} from "@/lib/schoolStart";

// 2026-10-16: when each child starts school (lib/schoolStart.ts).
// GET                                   → per child: schedule, upcoming exceptions, today + tomorrow.
//                                         Adults see every child, a child sees themself.
// PUT    { childId, abWeeks, aIsOdd, wakeMinutes, rules: [{ weekday, week, time }] }   (adults)
// POST   { childId, from, to?, time|null, note? } — an exception (other time / no school) (adults)
// DELETE ?childId=…&from=…&to=…         — remove an exception                         (adults)
// Available on every plan for now (part of the Free/Pro review, like Trips).
export const dynamic = "force-dynamic";
const ADULT = ["OWNER", "PARENT", "ADULT"];

async function ctx() {
  const session = await getServerSession(authOptions);
  const uid = session?.user?.id;
  if (!uid) return null;
  const me = await prisma.householdMember.findFirst({
    where: { userId: uid },
    include: { household: { include: { members: { include: { user: { select: { id: true, name: true, email: true, deletedAt: true } } } } } } },
  });
  if (!me) return null;
  const children = me.household.members
    .filter((m) => m.role === "CHILD" && !m.user.deletedAt)
    .map((m) => ({ id: m.userId, name: (m.user.name ?? m.user.email.split("@")[0]) as string }));
  return { uid, me, isAdult: ADULT.includes(me.role), children };
}

export async function GET() {
  const c = await ctx();
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const visible = c.isAdult ? c.children : c.children.filter((ch) => ch.id === c.uid);
  try {
    const ids = visible.map((v) => v.id);
    const today = stockholmYmd();
    const tomorrow = addDays(today, 1);
    const [{ settings, rules }, overrides, lessons] = await Promise.all([
      loadStartData(ids), loadOverrides(ids, today, addDays(today, 120)), firstLessons(ids, today, addDays(today, 20)),
    ]);
    const ovOn = (id: string, ymd: string) => overrides.find((o) => o.childId === id && o.ymd === ymd);
    const out = visible.map((ch) => {
      const s = settings.get(ch.id);
      return {
        childId: ch.id,
        name: ch.name,
        abWeeks: s?.abWeeks ?? false,
        aIsOdd: s?.aIsOdd ?? true,
        wakeMinutes: s?.wakeMinutes ?? null,
        rules: rules.filter((r) => r.childId === ch.id).map((r) => ({ weekday: r.weekday, week: r.week, time: r.time })),
        exceptions: groupOverrides(overrides.filter((o) => o.childId === ch.id)),
        today: resolveStart(ch.id, today, s, rules, ovOn(ch.id, today), lessons.get(ch.id)?.get(today)),
        tomorrow: resolveStart(ch.id, tomorrow, s, rules, ovOn(ch.id, tomorrow), lessons.get(ch.id)?.get(tomorrow)),
        // 2026-10-23: times come from the school link's timetable when nothing is typed in.
        fromTimetable: (lessons.get(ch.id)?.size ?? 0) > 0,
        thisWeek: s?.abWeeks ? weekLetter(today, s.aIsOdd) : null,
      };
    });
    return NextResponse.json({ children: out, canEdit: c.isAdult, isoWeek: isoWeek(today), wakeOptions: WAKE_OPTIONS });
  } catch (err) {
    console.error("School start GET error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

async function adultFor(childId: unknown) {
  const c = await ctx();
  if (!c) return { res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  if (!c.isAdult) return { res: NextResponse.json({ error: "Only an adult can change school times" }, { status: 403 }) } as const;
  const child = c.children.find((ch) => ch.id === childId);
  if (!child) return { res: NextResponse.json({ error: "Pick one of your children" }, { status: 400 }) } as const;
  return { c, child } as const;
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  const a = await adultFor(body?.childId);
  if ("res" in a) return a.res;
  const abWeeks = !!body?.abWeeks;
  const wake = Number(body?.wakeMinutes);
  const wakeMinutes = WAKE_OPTIONS.includes(wake) && wake > 0 ? wake : null;
  const rules: { weekday: number; week: "" | "A" | "B"; time: string }[] = [];
  const seen = new Set<string>();
  for (const r of Array.isArray(body?.rules) ? body.rules.slice(0, 20) : []) {
    const weekday = Number(r?.weekday);
    const week = r?.week === "A" || r?.week === "B" ? r.week : "";
    if (!Number.isInteger(weekday) || weekday < 1 || weekday > 5 || !isTime(r?.time)) continue;
    if (abWeeks ? week === "" : week !== "") continue;
    const key = `${weekday}${week}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rules.push({ weekday, week, time: r.time });
  }
  try {
    await saveSchedule(a.c.me.householdId, a.child.id, { abWeeks, aIsOdd: body?.aIsOdd !== false, wakeMinutes, rules });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("School start PUT error:", err);
    return NextResponse.json({ error: "Couldn't save" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const a = await adultFor(body?.childId);
  if ("res" in a) return a.res;
  const from = body?.from;
  const to = body?.to || from;
  if (!isYmd(from) || !isYmd(to) || to < from) return NextResponse.json({ error: "Pick a date" }, { status: 400 });
  if (Date.parse(to) - Date.parse(from) > MAX_OVERRIDE_DAYS * 86400000) return NextResponse.json({ error: "Max two months at a time" }, { status: 400 });
  const time = body?.time === null || body?.time === "" ? null : body?.time;
  if (time !== null && !isTime(time)) return NextResponse.json({ error: "Pick a time" }, { status: 400 });
  const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim().slice(0, 60) : null;
  try {
    const days = await addOverride(a.c.me.householdId, a.child.id, from, to, time, note, a.c.uid);
    await notifySoonChange(a.c, a.child, days, time, note).catch((err) => console.error("School start push failed:", err));
    return NextResponse.json({ ok: true, days: days.length });
  } catch (err) {
    console.error("School start POST error:", err);
    return NextResponse.json({ error: "Couldn't save" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const q = new URL(req.url).searchParams;
  const a = await adultFor(q.get("childId"));
  if ("res" in a) return a.res;
  const from = q.get("from");
  const to = q.get("to");
  if (!isYmd(from) || (to && !isYmd(to))) return NextResponse.json({ error: "Pick a date" }, { status: 400 });
  await removeOverride(a.child.id, from, to ?? undefined);
  return NextResponse.json({ ok: true });
}

// A change for today or tomorrow is news: tell the other adults and the child
// (push kind "changes"), so nobody wakes the kids an hour too early.
async function notifySoonChange(
  c: NonNullable<Awaited<ReturnType<typeof ctx>>>, child: { id: string; name: string },
  days: string[], time: string | null, note: string | null,
) {
  const today = stockholmYmd();
  const soon = days.filter((d) => d === today || d === addDays(today, 1));
  if (!soon.length) return;
  const ymd = soon[soon.length - 1];
  const first = child.name.split(" ")[0];
  const targets = c.me.household.members
    .filter((m) => !m.user.deletedAt && m.userId !== c.uid && (ADULT.includes(m.role) || m.userId === child.id))
    .map((m) => m.userId);
  for (const uid of targets) {
    const t = getMessages(await getLocaleForUser(uid)).schoolStart;
    const day = ymd === today ? t.today : t.tomorrow;
    const who = uid === child.id ? t.you : first;
    const bodyText = time ? t.pushStarts(who, day, time, note) : t.pushOff(who, day, note);
    await sendPushToUser(uid, { title: t.pushTitle, body: bodyText, url: "/dashboard#tomorrow", tag: `school-start-${child.id}-${ymd}` }, "changes");
  }
}
