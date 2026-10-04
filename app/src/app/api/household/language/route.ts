// 2026-10-04: the family's language (Family → Language). Everyone in the
// family can read it; only family admins (OWNER, or PARENT when there is no
// owner — same rule as removing members) can change it.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LOCALES, LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";
import { getHouseholdLanguage, getRequestLocale, setHouseholdLanguage } from "@/lib/i18n/server";

async function myMembership(userId: string) {
  const me = await prisma.householdMember.findFirst({ where: { userId } });
  if (!me) return null;
  const ownerCount = await prisma.householdMember.count({ where: { householdId: me.householdId, role: "OWNER" } });
  const isAdmin = me.role === "OWNER" || (ownerCount === 0 && me.role === "PARENT");
  return { ...me, isAdmin };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = await myMembership(session.user.id);
  const language = me ? await getHouseholdLanguage(me.householdId) : null;
  return NextResponse.json({
    language,
    effective: language ?? getRequestLocale(),
    available: LOCALES,
    canEdit: !!me?.isAdmin,
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { language } = await req.json().catch(() => ({}));
  if (!isLocale(language)) return NextResponse.json({ error: "Unknown language" }, { status: 400 });
  const me = await myMembership(session.user.id);
  if (!me) return NextResponse.json({ error: "No household found" }, { status: 404 });
  if (!me.isAdmin) return NextResponse.json({ error: "Only the family's admins can change the language" }, { status: 403 });
  await setHouseholdLanguage(me.householdId, language);
  const res = NextResponse.json({ language });
  res.cookies.set(LOCALE_COOKIE, language, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}
