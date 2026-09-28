import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPro } from "@/lib/entitlements";
import { sendProRequestEmail } from "@/lib/email";
import { ADMIN_EMAIL } from "@/lib/adminConfig";

const ADULT_ROLES = ["OWNER", "PARENT", "ADULT", "MEMBER"];
const APP_URL = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// POST /api/billing/request — 2026-09-28. No payments yet: "Upgrade" sends
// the admin a Pro request, and the admin grants Pro for N days in /admin.
// When Stripe is added this route is replaced by a checkout session.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.householdMember.findFirst({
    where: { userId: session.user.id },
    include: { household: true, user: { select: { name: true, email: true } } },
  });
  if (!membership) return NextResponse.json({ error: "Create or join a family first." }, { status: 400 });
  if (!ADULT_ROLES.includes(membership.role)) return NextResponse.json({ error: "Ask a parent to upgrade." }, { status: 403 });
  if (hasPro(membership.household)) return NextResponse.json({ ok: true, alreadyPro: true });

  // One email per day per family is plenty.
  const last = membership.household.proRequestedAt;
  const recentlyAsked = !!last && Date.now() - new Date(last).getTime() < 24 * 3600 * 1000;

  await prisma.household.update({ where: { id: membership.householdId }, data: { proRequestedAt: new Date() } });

  if (!recentlyAsked) {
    await sendProRequestEmail({
      to: ADMIN_EMAIL,
      familyName: membership.household.name,
      requesterName: membership.user.name,
      requesterEmail: membership.user.email,
      adminUrl: `${APP_URL}/admin/families/${membership.householdId}`,
    }).catch((e) => console.error("Pro request email failed:", e));
  }

  return NextResponse.json({ ok: true });
}
