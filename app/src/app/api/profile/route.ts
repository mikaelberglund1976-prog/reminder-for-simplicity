import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Accepts E.164 format: + followed by 7–15 digits.
// Empty string is allowed (user clearing the field).
const phoneSchema = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || /^\+[1-9]\d{6,14}$/.test(v),
    "Enter a valid phone number in international format (e.g. +46701234567)"
  )
  .optional();

const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: phoneSchema,
  preferredCurrency: z.enum(["SEK", "EUR", "USD", "GBP", "NOK", "DKK"]).optional(),
  timezone: z.string().max(100).optional(),
});

// GET /api/profile — fetch current user profile
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      preferredCurrency: true,
      timezone: true,
      createdAt: true,
      isChildProfile: true,
      pin: true,
      password: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // hasPassword tells the UI whether this account has a real password set.
  // Google-only accounts are created with password: null (see auth.ts signIn
  // callback) — used instead of checking session.user.image, which is only
  // populated on the session that actually came from the Google OAuth flow
  // and is missing (falsely showing "Change password") after logging in via
  // the "pin" or "credentials" provider on a Google-linked account.
  const { pin, password, ...rest } = user;
  return NextResponse.json({ ...rest, hasPin: !!pin, hasPassword: !!password });
}

// PUT /api/profile — update user profile
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = profileSchema.parse(body);

    // Normalize empty phone to null so the column can be cleared.
    const data: {
      name?: string;
      phone?: string | null;
      preferredCurrency?: "SEK" | "EUR" | "USD" | "GBP" | "NOK" | "DKK";
      timezone?: string;
    } = {
      name: parsed.name,
      preferredCurrency: parsed.preferredCurrency,
      timezone: parsed.timezone,
    };
    if (parsed.phone !== undefined) {
      data.phone = parsed.phone === "" ? null : parsed.phone;
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        preferredCurrency: true,
        timezone: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
