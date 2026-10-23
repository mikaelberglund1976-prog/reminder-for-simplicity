import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPro } from "@/lib/entitlements";
import { lessonsFor } from "@/lib/schoolLessons";
import { startsInRange } from "@/lib/schoolStart";

// 2026-10-22: the timetable from the school links — this week and the next
// two. An adult sees every child in the family, a child only themself.
// GET → { children: [{ id, lessons: [{ day, start, end, code, room }], starts: [{ day, time, off, note, code, wake }] }] }
// 2026-10-23: `starts` = when the child starts each day for the next two
// weeks (lib/schoolStart.ts: sovmorgon/ledig > typed-in time > first lesson).
// Lessons need Pro (they come from the school links); starts are on every plan.
export const dynamic = "force-dynamic";

function ymd(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const membership = await prisma.householdMember.findFirst({
      where: { userId: session.user.id },
      include: { household: { include: { familyTrial: true, members: { select: { userId: true, role: true } } } } },
    });
    if (!membership) return NextResponse.json({ children: [] });
    const h = membership.household;
    const trialActive = h.familyTrial ? h.familyTrial.expiresAt > new Date() : false;
    const pro = hasPro(h) || trialActive;

    const ids = membership.role === "CHILD"
      ? [session.user.id]
      : h.members.filter((m) => m.role === "CHILD").map((m) => m.userId);
    const today = ymd(new Date());
    const d = new Date(today + "T12:00:00Z");
    const monday = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86400000);
    const to = new Date(monday.getTime() + 20 * 86400000);
    const [map, starts] = await Promise.all([
      pro ? lessonsFor(ids, monday.toISOString().slice(0, 10), to.toISOString().slice(0, 10)) : Promise.resolve(new Map()),
      startsInRange(ids, today, new Date(d.getTime() + 14 * 86400000).toISOString().slice(0, 10)).catch(() => new Map()),
    ]);
    return NextResponse.json({
      children: ids.map((id) => ({
        id,
        lessons: map.get(id) ?? [],
        starts: (starts.get(id) ?? []).map((s: { day: string; time: string | null; off: boolean; note: string | null; code: string | null; wake: string | null }) => ({ day: s.day, time: s.time, off: s.off, note: s.note, code: s.code, wake: s.wake })),
      })),
    });
  } catch (err) {
    console.error("Lessons GET error:", err);
    return NextResponse.json({ children: [] });
  }
}
