// 2026-10-25 (masterbrief §25, Etapp 0 G4): the person's own language. Anyone
// signed in (adults and children) can choose it for themselves; null = follow
// the family's language. Affects the app, emails and push for that person only.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LOCALES, LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";
import { getHouseholdLanguage, getRequestLocale, getUserOwnLanguage, setUserOwnLanguage } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

async function familyLanguage(userId: string) {
  const me = await prisma.householdMember.findFirst({ where: { userId }, select: { householdId: true } });
  return me ? getHouseholdLanguage(me.householdId) : null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [own, family] = await Promise.all([getUserOwnLanguage(session.user.id), familyLanguage(session.user.id)]);
  return NextResponse.json({ own, family, effective: own ?? family ?? getRequestLocale(), available: LOCALES });
}

// PATCH { language: "sv" | "en" | null }  (null = follow the family)
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const language = body?.language ?? null;
  if (language !== null && !isLocale(language)) return NextResponse.json({ error: "Unknown language" }, { status: 400 });
  await setUserOwnLanguage(session.user.id, language);
  const effective = language ?? (await familyLanguage(session.user.id)) ?? getRequestLocale();
  const res = NextResponse.json({ own: language, effective });
  res.cookies.set(LOCALE_COOKIE, effective, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}
