import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mediaVersions } from "@/lib/media";

export const dynamic = "force-dynamic";

const ADULT_ROLES = ["OWNER", "PARENT", "ADULT"];
const PARENT_ROLES = ["OWNER", "PARENT"];

// GET /api/media — which family photos exist (versions only, no bytes) and
// what the caller may change. 2026-09-28 (row 40).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const membership = await prisma.householdMember.findFirst({ where: { userId: session.user.id } });
    const members = membership
      ? await prisma.householdMember.findMany({ where: { householdId: membership.householdId }, select: { userId: true, role: true } })
      : [];
    const ids = members.length ? members.map((m) => m.userId) : [session.user.id];
    const versions = await mediaVersions(membership?.householdId ?? null, ids);
    const isParent = !!membership && PARENT_ROLES.includes(membership.role);
    return NextResponse.json({
      ...versions,
      canEditHeader: !!membership && ADULT_ROLES.includes(membership.role),
      // yourself always; a parent also for the children in the family
      canEditAvatarFor: [session.user.id, ...(isParent ? members.filter((m) => m.role === "CHILD").map((m) => m.userId) : [])],
    });
  } catch (err) {
    console.error("Media GET error:", err);
    return NextResponse.json({ header: null, avatars: {}, canEditHeader: false, canEditAvatarFor: [] });
  }
}
