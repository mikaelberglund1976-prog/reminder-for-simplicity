import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/verification";
import { passwordSchema } from "@/lib/passwordSchema";

// POST /api/auth/verify-email — 2026-09-27
// { token, check: true }   → look up the token without using it; tells the
//                             page whether a password must be chosen.
// { token, password? }     → confirm the email (and set the password for an
//                             account created by a parent). One-time use.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token: string | undefined = body?.token;
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing link token." }, { status: 400 });
    }

    const row = await prisma.verificationToken.findUnique({ where: { token: hashToken(token) } });
    if (!row || row.expires < new Date()) {
      return NextResponse.json({ error: "This link has expired or already been used. Request a new one from the login page." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: row.identifier } });
    if (!user || user.deletedAt) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const hasGoogle = (await prisma.account.count({ where: { userId: user.id, provider: "google" } })) > 0;
    const needsPassword = !user.password && !hasGoogle;

    if (body?.check) {
      return NextResponse.json({ email: user.email, name: user.name, needsPassword });
    }

    const data: { emailVerified: Date; password?: string } = { emailVerified: new Date() };
    if (needsPassword) {
      const parsed = passwordSchema.safeParse(body?.password ?? "");
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
      }
      data.password = await bcrypt.hash(parsed.data, 12);
    }

    await prisma.user.update({ where: { id: user.id }, data });
    await prisma.verificationToken.deleteMany({ where: { identifier: row.identifier } });

    return NextResponse.json({ ok: true, email: user.email, pendingApproval: !user.approved });
  } catch (err) {
    console.error("verify-email error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
