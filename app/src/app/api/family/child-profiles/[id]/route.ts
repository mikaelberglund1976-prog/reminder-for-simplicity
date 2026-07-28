import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const ADULT_ROLES = ["OWNER", "PARENT", "ADULT"];

// PATCH /api/family/child-profiles/[id] — edit an existing child profile's
// name/email/PIN. Added 2026-07-28: the create flow (POST on the parent
// route) was the only way to set these fields — there was no way to fix a
// typo'd email, change the PIN, or rename a child afterwards. A child's PIN
// is stored in `password` (their only credential, see schema comment on
// User.pin), so a PIN change here hashes into that same field, exactly like
// creation does.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await prisma.householdMember.findFirst({ where: { userId: session.user.id } });
    if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });
    if (!ADULT_ROLES.includes(membership.role)) {
      return NextResponse.json({ error: "Only adults can edit a child profile" }, { status: 403 });
    }

    const childId = params.id;
    const targetMembership = await prisma.householdMember.findFirst({
      where: { userId: childId, householdId: membership.householdId },
      include: { user: { select: { isChildProfile: true } } },
    });
    if (!targetMembership || targetMembership.role !== "CHILD" || !targetMembership.user.isChildProfile) {
      return NextResponse.json({ error: "Child profile not found in your household" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, email: emailInput, pin } = body ?? {};

    const data: { name?: string; email?: string; password?: string } = {};

    if (name !== undefined) {
      if (!name?.trim()) return NextResponse.json({ error: "Name can't be empty" }, { status: 400 });
      data.name = name.trim();
    }

    if (emailInput !== undefined) {
      const email = emailInput.trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
      }
      data.email = email;
    }

    if (pin !== undefined && pin !== "") {
      if (!/^[0-9]{4}$/.test(pin)) return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 });
      data.password = await bcrypt.hash(pin, 10);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    let updated;
    try {
      updated = await prisma.user.update({ where: { id: childId }, data });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "P2002") {
        return NextResponse.json({ error: "That email is already used by another account." }, { status: 409 });
      }
      throw err;
    }

    return NextResponse.json({ id: updated.id, name: updated.name, email: updated.email });
  } catch (err) {
    console.error("Child profile PATCH error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}
