import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVerificationOrSetup } from "@/lib/verification";

// POST /api/family/child-profiles/[id]/invite — 2026-09-27
// A parent re-sends the "confirm email & choose password" link to a child
// whose account isn't confirmed yet (lost email, or an old PIN-only profile).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.householdMember.findFirst({ where: { userId: session.user.id } });
  if (!me || !["OWNER", "PARENT", "ADULT"].includes(me.role)) {
    return NextResponse.json({ error: "Only adults can send invites" }, { status: 403 });
  }
  const target = await prisma.householdMember.findFirst({
    where: { userId: params.id, householdId: me.householdId },
    include: { user: true },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.user.emailVerified) return NextResponse.json({ error: "This account is already confirmed." }, { status: 400 });

  try {
    await sendVerificationOrSetup(target.user);
  } catch (err) {
    console.error("Child invite resend failed:", err);
    return NextResponse.json({ error: "Could not send the email. Try again later." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
