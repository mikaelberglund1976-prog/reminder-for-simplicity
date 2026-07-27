import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

const APP_URL = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Always returns a generic success response, whether or not the email exists
// or the account uses Google sign-in — this avoids leaking which emails are
// registered (account enumeration).
export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Only send a reset email if the account exists AND uses a password
    // (Google-only accounts have no password to reset).
    if (user?.password) {
      const token = await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      const resetUrl = `${APP_URL}/reset-password?token=${token.token}`;

      try {
        await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
      } catch (err) {
        console.error("Failed to send password reset email:", err);
        // Don't leak the failure to the client — still return generic success.
      }
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists for that email, we've sent a reset link.",
    });
  } catch (err) {
    console.error("Forgot-password error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
