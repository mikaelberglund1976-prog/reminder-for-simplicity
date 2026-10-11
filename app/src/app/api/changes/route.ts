import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markChangesSeen, recentChangesFor } from "@/lib/changeWatch";

// 2026-10-11: the change watch on Home (lib/changeWatch.ts).
// GET  → { alerts: [...], names: { userId: firstName } } — the last few days, since last "Seen"
// POST → marks them seen (the card closes)
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const uid = session?.user?.id;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { alerts } = await recentChangesFor(uid);
    const ids = Array.from(new Set(alerts.map((a) => a.childId)));
    const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
    return NextResponse.json({
      alerts: alerts.map((a) => ({ id: a.id, childId: a.childId, kind: a.kind, title: a.title, oldYmd: a.oldYmd, newYmd: a.newYmd, oldTime: a.oldTime, newTime: a.newTime, count: a.count, createdAt: a.createdAt })),
      names: Object.fromEntries(users.map((u) => [u.id, (u.name ?? "").split(" ")[0]])),
      me: uid,
    });
  } catch (err) {
    console.error("Changes GET error:", err);
    return NextResponse.json({ alerts: [], names: {}, me: uid });
  }
}

export async function POST() {
  const session = await getServerSession(authOptions);
  const uid = session?.user?.id;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await markChangesSeen(uid);
  return NextResponse.json({ ok: true });
}
