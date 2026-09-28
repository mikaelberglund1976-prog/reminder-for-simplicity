import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/household/deletion-requests — 2026-09-27
// For the family admin: members who've asked to delete their account.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = await prisma.householdMember.findFirst({ where: { userId: session.user.id } });
  if (!me || !["OWNER", "PARENT"].includes(me.role)) return NextResponse.json({ requests: [] });

  const members = await prisma.householdMember.findMany({
    where: { householdId: me.householdId, userId: { not: session.user.id }, user: { deletionRequestedAt: { not: null } } },
    include: { user: { select: { id: true, name: true, email: true, deletionRequestedAt: true } } },
  });
  return NextResponse.json({
    requests: members.map((m) => ({ userId: m.userId, name: m.user.name, email: m.user.email, role: m.role, requestedAt: m.user.deletionRequestedAt })),
  });
}
