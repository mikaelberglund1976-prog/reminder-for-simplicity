import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendPendingApprovalEmail, sendAdminApprovalRequestEmail } from "@/lib/email";
import { passwordSchema } from "@/lib/passwordSchema";

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
        { error: "An account with this email already exists." },
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
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: hashedPassword,
        approved: isAdmin,
        approvedAt: isAdmin ? new Date() : null,
      },
    });

    // Best-effort notification emails — don't block the response on these.
    if (!isAdmin) {
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
        message: isAdmin
          ? "Account created!"
          : "Account created — pending admin approval. You'll get an email once you're approved.",
        userId: user.id,
        pendingApproval: !isAdmin,
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
