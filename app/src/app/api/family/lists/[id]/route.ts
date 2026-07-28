import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditListAccess, getListMemberIds, type HouseholdRoleStr } from "@/lib/lists";

// PATCH /api/family/lists/[id] — body: { name?, visibleToAll?, memberIds? }
// Renaming is allowed by the list's creator or an OWNER/PARENT. Changing
// who else can see it (visibleToAll / memberIds) is OWNER/PARENT only.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await prisma.householdMember.findFirst({ where: { userId: session.user.id } });
    if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });

    const list = await prisma.list.findUnique({ where: { id: params.id } });
    if (!list || list.householdId !== membership.householdId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const role = membership.role as HouseholdRoleStr;
    const isCreator = list.createdBy === session.user.id;
    const canEditAccess = canEditListAccess(role);

    const body = await req.json().catch(() => ({}));
    const { name, visibleToAll, memberIds } = body ?? {};

    if (typeof name === "string" && name.trim()) {
      if (!isCreator && !canEditAccess) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
      await prisma.list.update({ where: { id: params.id }, data: { name: name.trim() } });
    }

    if (typeof visibleToAll === "boolean") {
      if (!canEditAccess) return NextResponse.json({ error: "Only an OWNER/PARENT can change who sees this list" }, { status: 403 });
      await prisma.list.update({ where: { id: params.id }, data: { visibleToAll } });
    }

    if (Array.isArray(memberIds)) {
      if (!canEditAccess) return NextResponse.json({ error: "Only an OWNER/PARENT can change who sees this list" }, { status: 403 });
      const validMembers = await prisma.householdMember.findMany({
        where: { householdId: membership.householdId, userId: { in: memberIds } },
        select: { userId: true },
      });
      const validIds = validMembers.map((m) => m.userId);
      await prisma.$transaction([
        prisma.listMember.deleteMany({ where: { listId: params.id } }),
        prisma.listMember.createMany({ data: validIds.map((userId) => ({ listId: params.id, userId })) }),
      ]);
    }

    const updated = await prisma.list.findUnique({ where: { id: params.id } });
    return NextResponse.json({ ...updated, memberIds: await getListMemberIds(params.id) });
  } catch (err) {
    console.error("List PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/family/lists/[id]
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await prisma.householdMember.findFirst({ where: { userId: session.user.id } });
    if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });

    const list = await prisma.list.findUnique({ where: { id: params.id } });
    if (!list || list.householdId !== membership.householdId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const role = membership.role as HouseholdRoleStr;
    const canDelete = list.createdBy === session.user.id || list.ownerId === session.user.id || canEditListAccess(role);
    if (!canDelete) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

    await prisma.list.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("List DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
