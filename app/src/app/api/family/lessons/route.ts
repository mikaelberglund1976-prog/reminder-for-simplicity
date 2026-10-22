import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPro } from "@/lib/entitlements";
import { lessonsFor } from "@/lib/schoolLessons";

// 2026-10-22: the timetable from the school links — this week and the next
// two. An adult sees every child in the family, a child only themself.
// GET → { children: [{ id, lessons: [{ day, start, end, code, room }] }] }
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
    if (!hasPro(h) && !trialActive) return NextResponse.json({ children: [] });

    const ids = membership.role === "CHILD"
      ? [session.user.id]
      : h.members.filter((m) => m.role === "CHILD").map((m) => m.userId);
    const today = ymd(new Date());
    const d = new Date(today + "T12:00:00Z");
    const monday = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86400000);
    const to = new Date(monday.getTime() + 20 * 86400000);
    const map = await lessonsFor(ids, monday.toISOString().slice(0, 10), to.toISOString().slice(0, 10));
    return NextResponse.json({ children: ids.map((id) => ({ id, lessons: map.get(id) ?? [] })) });
  } catch (err) {
    console.error("Lessons GET error:", err);
    return NextResponse.json({ children: [] });
  }
}
