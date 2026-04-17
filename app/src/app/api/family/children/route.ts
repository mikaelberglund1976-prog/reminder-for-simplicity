// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/family/children?h=<householdId>
// Public endpoint -- returns child profiles for a household (name + internal email for PIN login)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const householdId = searchParams.get("h");
  if (!householdId) return NextResponse.json({ error: "h param required" }, { status: 400 });

  const members = await prisma.householdMember.findMany({
    where: { householdId, role: "CHILD" },
    include: { user: { select: { id: true, name: true, email: true, isChildProfile: true } } },
  });

  const children = members
    .filter(m => m.user.isChildProfile)
    .map(m => ({
      id: m.userId,
      name: m.user.name ?? "Child",
      email: m.user.email,
    }));

  const household = await prisma.household.findUnique({
    where: { id: householdId },
    select: { name: true },
  });

  return NextResponse.json({ children, householdName: household?.name ?? "Family" });
}
