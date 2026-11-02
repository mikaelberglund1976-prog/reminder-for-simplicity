import { NextResponse } from "next/server";
import { checkRateLimit, recordFailedAttempt } from "@/lib/rateLimit";
import { INVITE_CODE_INVALID_MESSAGE, SIGNUP_CODE_COOKIE, isCodeUsable, normalizeCode } from "@/lib/signupCodes";

export const dynamic = "force-dynamic";

// POST /api/auth/signup-code { code } — 2026-11-02. Checks an invite code
// before "Continue with Google" and keeps it for 30 minutes in an httpOnly
// cookie, which the Google sign-in callback (lib/auth.ts) uses — and only
// then uses up — when it creates a brand-new account.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = normalizeCode(body?.code);
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const key = `signupcode:${ip}`;
  try { await checkRateLimit(key); } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 429 });
  }
  if (!(await isCodeUsable(code).catch(() => false))) {
    await recordFailedAttempt(key);
    return NextResponse.json({ error: INVITE_CODE_INVALID_MESSAGE }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SIGNUP_CODE_COOKIE, code, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 60,
  });
  return res;
}
