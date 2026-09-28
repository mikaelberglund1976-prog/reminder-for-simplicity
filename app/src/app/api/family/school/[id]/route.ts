import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function loadAllowed(id: string, userId: string) {
  const item = await prisma.reminder.findUnique({ where: { id } });
  if (!item || item.category !== "SCHOOL" || !item.householdId || !item.isActive) return { error: 404 as const };
  const membership = await prisma.householdMember.findFirst({
    where: { userId, householdId: item.householdId },
  });
  if (!membership) return { error: 404 as const };
  // A child may only touch items assigned to themselves; any non-child
  // household member may manage the household's school items.
  if (membership.role === "CHILD" && item.assignedTo !== userId) return { error: 403 as const };
  return { item };
}

// DELETE /api/family/school/[id] — soft-deactivates (same as /api/reminders
// DELETE), but also allowed for a parent removing a child-created item and a
// child removing a parent-created one assigned to them.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const res = await loadAllowed(params.id, session.user.id);
  if ("error" in res) return NextResponse.json({ error: res.error === 403 ? "Not allowed" : "Not found" }, { status: res.error });
  await prisma.reminder.update({ where: { id: res.item.id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}

// PATCH /api/family/school/[id] — 2026-09-27
// Tick a homework/test off as done (or undo), or toggle whether it shows in
// the calendar view / outbound ICS feed. Allowed for the person the item is
// assigned to, the person who created it, and any adult in the household.
// A child can only touch items assigned to themselves.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const res = await loadAllowed(params.id, session.user.id);
    if ("error" in res) return NextResponse.json({ error: res.error === 403 ? "Not allowed" : "Not found" }, { status: res.error });
    const item = res.item;

    const body = await req.json().catch(() => ({}));
    const data: { completedAt?: Date | null; showInCalendar?: boolean } = {};
    if (typeof body?.completed === "boolean") data.completedAt = body.completed ? new Date() : null;
    if (typeof body?.showInCalendar === "boolean") data.showInCalendar = body.showInCalendar;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const updated = await prisma.reminder.update({ where: { id: item.id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("School PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
