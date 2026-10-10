import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFamilyAccess } from "@/lib/entitlements";
import { normalizeFamilyColors, EMPTY_FAMILY_COLORS } from "@/lib/familyColors";
import { getFamilyColors, saveFamilyColors } from "@/lib/familyColorsStore";

export const dynamic = "force-dynamic";

const ADULT_ROLES = ["OWNER", "PARENT", "ADULT"];

async function load(userId: string) {
  return prisma.householdMember.findFirst({
    where: { userId },
    include: { household: { include: { familyTrial: true, members: { select: { userId: true } } } } },
  });
}

// GET /api/household/colors — the family's colours (everyone in the family
// sees them) + whether the caller may change them (adult in a Pro/trial family).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await load(session.user.id);
  if (!membership) return NextResponse.json({ colors: EMPTY_FAMILY_COLORS, canEdit: false, isAdult: true, pro: false });
  const pro = hasFamilyAccess(membership.household);
  const isAdult = ADULT_ROLES.includes(membership.role);
  // Colours are a Pro feature: a family that drops back to Free keeps them
  // stored (they return with Pro) but the app shows the built-in colours.
  const colors = pro ? await getFamilyColors(membership.householdId) : EMPTY_FAMILY_COLORS;
  return NextResponse.json({ colors, canEdit: pro && isAdult, isAdult, pro });
}

// PUT /api/household/colors { colors } — saves the whole set.
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await load(session.user.id);
  if (!membership) return NextResponse.json({ error: "No household found" }, { status: 404 });
  if (!ADULT_ROLES.includes(membership.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!hasFamilyAccess(membership.household)) return NextResponse.json({ error: "Pro required" }, { status: 402 });
  const body = await req.json().catch(() => ({}));
  const colors = normalizeFamilyColors(body?.colors);
  // Only keep colours for people who are actually in the family.
  const ids = new Set(membership.household.members.map((m: { userId: string }) => m.userId));
  for (const id of Object.keys(colors.members)) if (!ids.has(id)) delete colors.members[id];
  try {
    await saveFamilyColors(membership.householdId, colors);
    return NextResponse.json({ colors });
  } catch (err) {
    console.error("household colors PUT error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
