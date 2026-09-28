// 2026-09-27: email verification + account setup tokens.
// Every account needs a verified email (Mikael: "Alla konton behöver epost,
// för att skapa epost skickas en verifiering till användaren"). Reuses the
// NextAuth `VerificationToken` table (identifier = email). Only a SHA-256
// hash of the token is stored, so a database leak doesn't leak usable links.
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendAccountSetupEmail, sendVerifyEmail } from "@/lib/email";

const APP_URL = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const EMAIL_NOT_VERIFIED_MESSAGE = "Please confirm your email first — check your inbox for the link.";
export const ACCOUNT_DELETED_MESSAGE = "This account has been deleted.";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function createToken(email: string, hours: number) {
  const identifier = email.toLowerCase();
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  const token = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: { identifier, token: hashToken(token), expires: new Date(Date.now() + hours * 3600 * 1000) },
  });
  return token;
}

// Normal signup: confirm the address (password already chosen).
export async function sendVerification(user: { email: string; name: string | null }) {
  const token = await createToken(user.email, 48);
  await sendVerifyEmail({ to: user.email, name: user.name, verifyUrl: `${APP_URL}/verify-email?token=${token}` });
}

// Account created by someone else (a parent adding a child): confirm the
// address AND choose a password in one step.
export async function sendAccountSetup(user: { email: string; name: string | null }, invitedBy: string | null) {
  const token = await createToken(user.email, 24 * 7);
  await sendAccountSetupEmail({ to: user.email, name: user.name, invitedBy, setupUrl: `${APP_URL}/verify-email?token=${token}` });
}

// Picks the right email for an unverified account.
export async function sendVerificationOrSetup(user: { id: string; email: string; name: string | null; password: string | null }) {
  if (user.password) return sendVerification(user);
  const hasGoogle = await prisma.account.count({ where: { userId: user.id, provider: "google" } });
  if (hasGoogle) return sendVerification(user);
  return sendAccountSetup(user, null);
}
