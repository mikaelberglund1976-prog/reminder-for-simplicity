import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendPendingApprovalEmail, sendAdminApprovalRequestEmail } from "@/lib/email";
import { passwordSchema } from "@/lib/passwordSchema";
import { sendVerification } from "@/lib/verification";
import { findPendingInvite } from "@/lib/invites";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "mikaelberglund1976@gmail.com";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    // Check if the email is already taken
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: existing.deletedAt
            ? "This account was recently deleted. Contact us if you want it restored."
            : "An account with this email already exists." },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create user — pending admin approval. We're in a testing phase and
    // want to control who gets in, so new accounts can't log in until an
    // admin approves them (see auth.ts credentials provider + /admin UI).
    // Approved defaults to true in the schema (so existing accounts aren't
    // retroactively locked out); this is the one place that overrides it
    // for a fresh signup.
    const isAdmin = data.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    // 2026-09-29: someone a family has invited (child or adult) doesn't need
    // admin approval — they join that family at their first sign-in.
    const invited = !!(await findPendingInvite(data.email));
    const preApproved = isAdmin || invited;
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: hashedPassword,
        approved: preApproved,
        approvedAt: preApproved ? new Date() : null,
      },
    });

    // 2026-09-27: every new account must confirm its email before logging in.
    // Awaited (not fire-and-forget) so a send failure is visible in logs and
    // the user can use "Resend" on the login page.
    await sendVerification({ email: user.email, name: user.name }).catch((e) =>
      console.error("Verification email failed:", e)
    );

    // Best-effort notification emails — don't block the response on these.
    if (!preApproved) {
      sendPendingApprovalEmail({ to: user.email, name: user.name }).catch(console.error);
      sendAdminApprovalRequestEmail({
        adminEmail: ADMIN_EMAIL,
        userEmail: user.email,
        userName: user.name,
        via: "email",
      }).catch(console.error);
    }

    return NextResponse.json(
      {
        message: preApproved
          ? invited
            ? "Account created! Confirm your email, then log in — you'll join your family automatically."
            : "Account created! Check your inbox to confirm your email."
          : "Account created — check your inbox to confirm your email. Your account also needs admin approval; you'll get an email once you're approved.",
        verificationSent: true,
        userId: user.id,
        pendingApproval: !preApproved,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
