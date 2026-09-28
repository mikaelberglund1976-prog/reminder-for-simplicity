import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { softDeleteAccount } from "@/lib/accountDeletion";

// POST /api/household/deletion-requests/[userId] { action } — 2026-09-27
//   approve → soft-delete a member who asked to be deleted
//   decline → clear their request
//   delete  → family admin removes a member directly (e.g. a child account);
//             same soft delete, restorable for 60 days
// Only the family admin (OWNER, or PARENT in households without an OWNER).
export async function POST(req: Request, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.householdMember.findFirst({ where: { userId: session.user.id } });
  if (!me) return NextResponse.json({ error: "No household" }, { status: 400 });
  const ownerCount = await prisma.householdMember.count({ where: { householdId: me.householdId, role: "OWNER" } });
  const isAdmin = me.role === "OWNER" || (ownerCount === 0 && me.role === "PARENT");
  if (!isAdmin) return NextResponse.json({ error: "Only the family admin can do this" }, { status: 403 });

  if (params.userId === session.user.id) {
    return NextResponse.json({ error: "Use Profile → Delete account for your own account" }, { status: 400 });
  }
  const target = await prisma.householdMember.findFirst({
    where: { householdId: me.householdId, userId: params.userId },
    include: { user: { select: { deletionRequestedAt: true } } },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const action = body?.action;
  if (action === "decline") {
    await prisma.user.update({ where: { id: params.userId }, data: { deletionRequestedAt: null } });
    return NextResponse.json({ status: "declined" });
  }
  if (action === "approve" || action === "delete") {
    if (action === "approve" && !target.user.deletionRequestedAt) {
      return NextResponse.json({ error: "No pending request" }, { status: 400 });
    }
    if (target.role === "OWNER") return NextResponse.json({ error: "Can't delete another family admin" }, { status: 403 });
    await softDeleteAccount(params.userId, session.user.id);
    return NextResponse.json({ status: "deleted" });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
