import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consentsForHousehold, GUARDIAN_ROLES, recordConsent } from "@/lib/consent";

export const dynamic = "force-dynamic";

// GET /api/family/consent — latest guardian consent per child in the family.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const m = await prisma.householdMember.findFirst({ where: { userId: session.user.id } });
  if (!m) return NextResponse.json({ consents: {}, canConsent: false });
  try {
    return NextResponse.json({ consents: await consentsForHousehold(m.householdId), canConsent: GUARDIAN_ROLES.includes(m.role) });
  } catch (err) {
    console.error("Consent GET error:", err);
    return NextResponse.json({ consents: {}, canConsent: false });
  }
}

// POST /api/family/consent { childId } — a parent confirms for a child
// already in the family (children added before 2026-09-29).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const m = await prisma.householdMember.findFirst({ where: { userId: session.user.id } });
  if (!m || !GUARDIAN_ROLES.includes(m.role)) return NextResponse.json({ error: "Only a parent can confirm this." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const childId = typeof body?.childId === "string" ? body.childId : "";
  const child = await prisma.householdMember.findFirst({ where: { userId: childId, householdId: m.householdId, role: "CHILD" } });
  if (!child) return NextResponse.json({ error: "Not a child in your family" }, { status: 404 });
  await recordConsent(childId, m.householdId, session.user.id);
  return NextResponse.json({ success: true });
}
