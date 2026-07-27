// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/family/children?h=<householdId>
// Public endpoint -- returns everyone in the household who can log in via
// the PIN numpad: child profiles (always) plus any adult who's opted into
// PIN login from their profile page (see /api/profile/pin). Returns each
// person's email since that's what the "pin" NextAuth provider needs to
// look up the account — never the PIN/password hash itself.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const householdId = searchParams.get("h");
  if (!householdId) return NextResponse.json({ error: "h param required" }, { status: 400 });

  const members = await prisma.householdMember.findMany({
    where: { householdId },
    include: { user: { select: { id: true, name: true, email: true, isChildProfile: true, pin: true } } },
  });

  const children = members
    .filter(m => m.user.isChildProfile || !!m.user.pin)
    .map(m => ({
      id: m.userId,
      name: m.user.name ?? "Member",
      email: m.user.email,
      isChildProfile: m.user.isChildProfile,
    }));

  const household = await prisma.household.findUnique({
    where: { id: householdId },
    select: { name: true },
  });

  return NextResponse.json({ children, householdName: household?.name ?? "Family" });
}
