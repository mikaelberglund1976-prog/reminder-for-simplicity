import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "mikaelberglund1976@gmail.com";

// POST /api/admin/households/[id]/remove-member
// Body: { userId: string }
// Removes the given user from the household. Does NOT delete the user account.
// If the removed user is a child profile (email ends in @assistiq.internal),
// we also delete the user record since children only exist inside a household.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const userId: string | undefined = body?.userId;
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const member = await prisma.householdMember.findFirst({
      where: { householdId: params.id, userId },
      include: { user: { select: { id: true, email: true, isChildProfile: true } } },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found in this household" }, { status: 404 });
    }

    // Prevent deleting the OWNER this way — the admin should delete the whole household instead.
    if (member.role === "OWNER") {
      return NextResponse.json(
        { error: "Cannot remove the OWNER. Delete the whole household instead." },
        { status: 400 }
      );
    }

    await prisma.householdMember.delete({ where: { id: member.id } });

    // Child profiles have no life outside a household — clean up the user row too.
    if (member.user.isChildProfile) {
      await prisma.user.delete({ where: { id: member.user.id } }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin remove-member error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}
