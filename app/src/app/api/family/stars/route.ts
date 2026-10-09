import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFamilyAccess } from "@/lib/entitlements";
import { getPerStar, setPerStar, starStats } from "@/lib/choreStars";

// 2026-10-09: chore stars. GET → { perStar, members: [{ userId, week, lastWeek, total, streak }] }
// A child only ever gets their own row. PUT { perStar } (adults) sets the
// optional pocket money per star (0–1000, whole kronor/units).
export const dynamic = "force-dynamic";
const ADULT = ["OWNER", "PARENT", "ADULT"];

async function me() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const membership = await prisma.householdMember.findFirst({
    where: { userId: session.user.id },
    include: { household: { include: { familyTrial: true, members: { select: { userId: true } } } } },
  });
  return membership ? { userId: session.user.id, membership } : null;
}

export async function GET() {
  const m = await me();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasFamilyAccess(m.membership.household)) return NextResponse.json({ perStar: 0, members: [], access: "LOCKED" });
  const isAdult = ADULT.includes(m.membership.role);
  const ids = isAdult ? m.membership.household.members.map((x) => x.userId) : [m.userId];
  const [members, perStar] = await Promise.all([starStats(m.membership.householdId, ids), getPerStar(m.membership.householdId)]);
  return NextResponse.json({ perStar, members, canEdit: isAdult });
}

export async function PUT(req: Request) {
  const m = await me();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ADULT.includes(m.membership.role)) return NextResponse.json({ error: "Only adults can change this" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const v = Math.round(Number(body?.perStar));
  if (!Number.isFinite(v) || v < 0 || v > 1000) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  await setPerStar(m.membership.householdId, v);
  return NextResponse.json({ ok: true, perStar: v });
}
