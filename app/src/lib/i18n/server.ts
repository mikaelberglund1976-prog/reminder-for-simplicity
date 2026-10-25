// 2026-10-04: the language on the server — for the root layout, emails and
// anything else rendered outside the browser.
//
// The family's language lives in households.language (set by a family admin
// under Family → Language). The column is created by the app itself on first
// use, like the other tables added since September (no db push needed). It is
// deliberately not in schema.prisma's generated client yet, so nothing breaks
// before the column exists; read and write it only through this file.
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, localeFromAcceptLanguage, type Locale } from "./config";
import { getMessages, type Messages } from "./messages";

let ensured: Promise<void> | null = null;
export function ensureLanguageColumn(): Promise<void> {
  if (!ensured) {
    ensured = prisma
      .$executeRawUnsafe(`ALTER TABLE "households" ADD COLUMN IF NOT EXISTS "language" TEXT`)
      .then(() => undefined)
      .catch((err) => {
        ensured = null;
        throw err;
      });
  }
  return ensured;
}

/** The family's chosen language, or null when nobody has chosen one yet. */
export async function getHouseholdLanguage(householdId: string | null | undefined): Promise<Locale | null> {
  if (!householdId) return null;
  try {
    await ensureLanguageColumn();
    const rows = await prisma.$queryRawUnsafe<{ language: string | null }[]>(
      `SELECT "language" FROM "households" WHERE "id" = $1`,
      householdId
    );
    const l = rows[0]?.language;
    return isLocale(l) ? l : null;
  } catch (err) {
    console.error("getHouseholdLanguage", err);
    return null;
  }
}

export async function setHouseholdLanguage(householdId: string, locale: Locale): Promise<void> {
  await ensureLanguageColumn();
  await prisma.$executeRawUnsafe(`UPDATE "households" SET "language" = $1 WHERE "id" = $2`, locale, householdId);
}

// 2026-10-25 (masterbrief §25, Etapp 0 G4): language per person. users.language
// = the person's own choice; null = follow the family's language (every
// existing user — no row is changed). Created by the app on first use, like
// households.language, and read/written only through this file.
let ensuredUser: Promise<void> | null = null;
export function ensureUserLanguageColumn(): Promise<void> {
  if (!ensuredUser) {
    ensuredUser = prisma
      .$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "language" TEXT`)
      .then(() => undefined)
      .catch((err) => {
        ensuredUser = null;
        throw err;
      });
  }
  return ensuredUser;
}

/** The person's own language, or null when they follow the family. */
export async function getUserOwnLanguage(userId: string | null | undefined): Promise<Locale | null> {
  if (!userId) return null;
  try {
    await ensureUserLanguageColumn();
    const rows = await prisma.$queryRawUnsafe<{ language: string | null }[]>(`SELECT "language" FROM "users" WHERE "id" = $1`, userId);
    const l = rows[0]?.language;
    return isLocale(l) ? l : null;
  } catch (err) {
    console.error("getUserOwnLanguage", err);
    return null;
  }
}

/** null = follow the family again. */
export async function setUserOwnLanguage(userId: string, locale: Locale | null): Promise<void> {
  await ensureUserLanguageColumn();
  await prisma.$executeRawUnsafe(`UPDATE "users" SET "language" = $1 WHERE "id" = $2`, locale, userId);
}

/** The language a person sees: their own choice, else their family's (null = neither chosen). */
export async function getUserLanguage(userId: string | null | undefined): Promise<Locale | null> {
  return (await getUserOwnLanguage(userId)) ?? (await getUserHouseholdLanguage(userId));
}

/** The language of the family a user belongs to (null = not chosen / no family). */
export async function getUserHouseholdLanguage(userId: string | null | undefined): Promise<Locale | null> {
  if (!userId) return null;
  const m = await prisma.householdMember.findFirst({ where: { userId }, select: { householdId: true } });
  return getHouseholdLanguage(m?.householdId);
}

/** Language for this request: the device cookie, else the browser's Accept-Language, else English. */
export function getRequestLocale(): Locale {
  try {
    const c = cookies().get(LOCALE_COOKIE)?.value;
    if (isLocale(c)) return c;
    const fromHeader = localeFromAcceptLanguage(headers().get("accept-language"));
    if (fromHeader) return fromHeader;
  } catch {
    /* outside a request (cron) */
  }
  return DEFAULT_LOCALE;
}

/**
 * Language to write to a person in (emails, push): their own language, else
 * their family's, else the request's language when there is a request, else English.
 */
export async function getLocaleForUser(userId: string | null | undefined, fallback?: Locale): Promise<Locale> {
  const own = await getUserLanguage(userId);
  return own ?? fallback ?? getRequestLocale();
}

export async function getLocaleForEmail(email: string | null | undefined, fallback?: Locale): Promise<Locale> {
  if (email) {
    const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (u) return getLocaleForUser(u.id, fallback);
  }
  return fallback ?? getRequestLocale();
}

export function serverMessages(locale: Locale): Messages {
  return getMessages(locale);
}

/** New families start in the language the founder is using (cookie / browser). */
export async function initHouseholdLanguage(householdId: string): Promise<void> {
  try {
    await setHouseholdLanguage(householdId, getRequestLocale());
  } catch (err) {
    console.error("initHouseholdLanguage", err);
  }
}
