import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/profile/pin — set or change the current user's optional PIN
// login. This is additive: it doesn't touch `password`, so email+password
// login keeps working exactly as before. See auth.ts's "pin" provider.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const pin: string | undefined = body?.pin;
  if (!pin || !/^[0-9]{4}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 });
  }

  const pinHash = await bcrypt.hash(pin, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { pin: pinHash },
  });

  return NextResponse.json({ success: true });
}

// DELETE /api/profile/pin — turn off PIN login for the current user.
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { pin: null },
  });

  return NextResponse.json({ success: true });
}
