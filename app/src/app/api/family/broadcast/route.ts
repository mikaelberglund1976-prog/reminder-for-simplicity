import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendBroadcastEmail } from "@/lib/email";

// Only OWNER/PARENT can send a household-wide update — matches the
// Best4Family-analysis idea (COMPETITOR_ANALYSIS_BEST4FAMILY.md §3/§6):
// "Skicka familjeuppdatering" from an admin/parent to everyone in the
// household. Reuses the existing Resend email infra rather than inventing a
// new notification channel — there's no in-app/push notification system yet
// (see ROADMAP.md Fas 2, push notifications still not built).
const ADMIN_ROLES = ["OWNER", "PARENT"];

const bodySchema = z.object({
  message: z.string().trim().min(1, "Message can't be empty").max(2000, "Message is too long"),
});

// POST /api/family/broadcast — email every household member (except the
// sender) with a short update from an OWNER/PARENT.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { message } = bodySchema.parse(await req.json());

    const membership = await prisma.householdMember.findFirst({
      where: { userId: session.user.id },
      include: {
        household: {
          include: {
            members: { include: { user: { select: { id: true, name: true, email: true, isChildProfile: true } } } },
          },
        },
      },
    });
    if (!membership) return NextResponse.json({ error: "No household found" }, { status: 404 });
    if (!ADMIN_ROLES.includes(membership.role)) {
      return NextResponse.json({ error: "Only an owner or parent can send a family update" }, { status: 403 });
    }

    const senderName = session.user.name ?? "A family member";

    // Child profiles get an internal/alias email (see 4j in TODO.md) — sending
    // them a real email is often pointless (parent's own inbox, or an alias
    // no one checks day to day), so we only email adult members.
    const recipients = membership.household.members.filter(
      (m) => m.userId !== session.user.id && !m.user.isChildProfile
    );

    const results = await Promise.allSettled(
      recipients.map((m) =>
        sendBroadcastEmail({ to: m.user.email, name: m.user.name, senderName, message })
      )
    );
    const sent = results.filter((r) => r.status === "fulfilled").length;

    return NextResponse.json({ sent, total: recipients.length });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("Broadcast error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
