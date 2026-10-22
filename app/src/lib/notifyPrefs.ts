// 2026-10-22: each person chooses which emails they get (Mikael: "så att man
// själv som användare/barn kan välja detta"), next to the push choices in
// lib/webPush.ts. Account emails (verification, invites, password reset,
// trial ending) always go out — these are only the reminder-type emails.
//
// Self-creating table (OPERATIONS.md §5a):
//   email_prefs — userId → comma-separated kinds turned OFF (default: all on).
//
// Every reminder-type email carries a "Stop emails about …" link: a signed
// token (HMAC with NEXTAUTH_SECRET) for that person and kind, so it works
// without logging in. The link opens a page with a button — mail scanners
// that open links can't turn anything off on their own.
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

export type EmailKind = "reminders" | "school" | "activities" | "birthdays";
export const EMAIL_KINDS: EmailKind[] = ["reminders", "school", "activities", "birthdays"];

const APP_URL = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://assistiq.se";

/** Which email/push kind a reminder belongs to. */
export function kindForCategory(category: string | null | undefined): EmailKind {
  if (category === "SCHOOL") return "school";
  if (category === "TRAINING") return "activities";
  if (category === "BIRTHDAY") return "birthdays";
  return "reminders";
}

let ensured: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (!ensured) {
    ensured = prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "email_prefs" ("userId" TEXT NOT NULL, "off" TEXT NOT NULL DEFAULT '', "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "email_prefs_pkey" PRIMARY KEY ("userId"))`
    ).then(() => undefined).catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}

/** The email kinds this person gets (default: all). */
export async function getEmailKinds(userId: string): Promise<EmailKind[]> {
  await ensureTable();
  const rows = await prisma.$queryRaw<{ off: string }[]>`SELECT "off" FROM "email_prefs" WHERE "userId" = ${userId}`;
  const off = new Set((rows[0]?.off ?? "").split(",").filter(Boolean));
  return EMAIL_KINDS.filter((k) => !off.has(k));
}

export async function setEmailKinds(userId: string, kinds: EmailKind[]) {
  await ensureTable();
  const off = EMAIL_KINDS.filter((k) => !kinds.includes(k)).join(",");
  await prisma.$executeRaw`INSERT INTO "email_prefs" ("userId", "off", "updatedAt") VALUES (${userId}, ${off}, CURRENT_TIMESTAMP)
    ON CONFLICT ("userId") DO UPDATE SET "off" = EXCLUDED."off", "updatedAt" = CURRENT_TIMESTAMP`;
}

export async function turnOffEmail(userId: string, kind: EmailKind) {
  const kinds = await getEmailKinds(userId);
  await setEmailKinds(userId, kinds.filter((k) => k !== kind));
}

/** Never blocks an email because of a database hiccup. */
export async function emailAllowed(userId: string | null | undefined, kind: EmailKind): Promise<boolean> {
  if (!userId) return true;
  try { return (await getEmailKinds(userId)).includes(kind); }
  catch (err) { console.error("emailAllowed failed:", err); return true; }
}

// ── one-click "stop these emails" ────────────────────────────────────────────
function sig(userId: string, kind: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? "dev-secret";
  return createHmac("sha256", secret).update(`email-off:${userId}:${kind}`).digest("base64url").slice(0, 32);
}

export function unsubscribeUrl(userId: string, kind: EmailKind): string {
  return `${APP_URL}/notify/off?u=${encodeURIComponent(userId)}&k=${kind}&s=${sig(userId, kind)}`;
}

export function verifyUnsubscribe(userId: unknown, kind: unknown, s: unknown): { userId: string; kind: EmailKind } | null {
  if (typeof userId !== "string" || typeof kind !== "string" || typeof s !== "string") return null;
  if (!(EMAIL_KINDS as string[]).includes(kind) || userId.length > 100) return null;
  const want = Buffer.from(sig(userId, kind));
  const got = Buffer.from(s);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  return { userId, kind: kind as EmailKind };
}
