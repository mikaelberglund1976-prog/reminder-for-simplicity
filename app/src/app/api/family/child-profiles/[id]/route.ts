import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendAccountSetup } from "@/lib/verification";

const ADULT_ROLES = ["OWNER", "PARENT", "ADULT"];

// PATCH /api/family/child-profiles/[id] — edit an existing child profile's
// name/email (PIN removed 2026-09-27). Added 2026-07-28: the create flow (POST on the parent
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
    const { name, email: emailInput } = body ?? {};

    // 2026-09-27: PIN removed. Changing the email resets verification and
    // sends a new setup link to the new address.
    const data: { name?: string; email?: string; emailVerified?: null } = {};

    if (name !== undefined) {
      if (!name?.trim()) return NextResponse.json({ error: "Name can't be empty" }, { status: 400 });
      data.name = name.trim();
    }

    if (emailInput !== undefined) {
      const email = emailInput.trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
      }
      const current = await prisma.user.findUnique({ where: { id: childId }, select: { email: true } });
      if (current?.email !== email) {
        data.email = email;
        data.emailVerified = null;
      }
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

    if (data.email) {
      const parent = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } });
      await sendAccountSetup({ email: updated.email, name: updated.name }, parent?.name ?? null).catch(console.error);
    }

    return NextResponse.json({ id: updated.id, name: updated.name, email: updated.email });
  } catch (err) {
    console.error("Child profile PATCH error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}
