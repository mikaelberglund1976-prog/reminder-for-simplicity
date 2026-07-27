import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/family/shopping-list/categories/[id]
// Body: { label?: string } to rename, or { move: "up" | "down" } to reorder
// by swapping sortOrder with the adjacent category.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await prisma.householdMember.findFirst({ where: { userId: session.user.id } });
    if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });

    const category = await prisma.shoppingCategoryDef.findUnique({ where: { id: params.id } });
    if (!category || category.householdId !== membership.householdId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { label, move } = body ?? {};

    if (typeof label === "string" && label.trim()) {
      const updated = await prisma.shoppingCategoryDef.update({
        where: { id: params.id },
        data: { label: label.trim() },
      });
      return NextResponse.json(updated);
    }

    if (move === "up" || move === "down") {
      const siblings = await prisma.shoppingCategoryDef.findMany({
        where: { householdId: membership.householdId },
        orderBy: { sortOrder: "asc" },
      });
      const index = siblings.findIndex((c) => c.id === params.id);
      const swapIndex = move === "up" ? index - 1 : index + 1;
      if (index === -1 || swapIndex < 0 || swapIndex >= siblings.length) {
        return NextResponse.json({ categories: siblings });
      }
      const a = siblings[index];
      const b = siblings[swapIndex];
      await prisma.$transaction([
        prisma.shoppingCategoryDef.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
        prisma.shoppingCategoryDef.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
      ]);
      const categories = await prisma.shoppingCategoryDef.findMany({
        where: { householdId: membership.householdId },
        orderBy: { sortOrder: "asc" },
      });
      return NextResponse.json({ categories });
    }

    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  } catch (err) {
    console.error("Shopping category PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
