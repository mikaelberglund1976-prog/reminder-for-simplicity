import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationOrSetup } from "@/lib/verification";
import { checkRateLimit, recordFailedAttempt } from "@/lib/rateLimit";

// POST /api/auth/resend-verification { email } — 2026-09-27
// Always answers the same way, whether or not the account exists, so it
// can't be used to probe which emails are registered. Throttled to 5 sends
// per 15 minutes per address (same limiter as login).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const generic = NextResponse.json({ message: "If that account exists and isn't confirmed yet, we've sent a new link." });
  if (!email) return generic;

  const key = `verify:${email}`;
  try { checkRateLimit(key); } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Too many attempts" }, { status: 429 });
  }
  recordFailedAttempt(key);

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.emailVerified && !user.deletedAt) {
    await sendVerificationOrSetup(user).catch((e) => console.error("Resend verification failed:", e));
  }
  return generic;
}
