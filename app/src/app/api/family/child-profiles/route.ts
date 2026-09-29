import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPro } from "@/lib/entitlements";
import { sendAccountSetup } from "@/lib/verification";
import { sendHouseholdInviteEmail } from "@/lib/email";
import { recordConsent } from "@/lib/consent";

const ADULT_ROLES = ["OWNER", "PARENT", "ADULT"];

// POST /api/family/child-profiles -- parent creates a child profile (name + email)
// 2026-09-27: no more PIN. The child gets an email to confirm the address and
// choose a password (or they can sign in with Google if it's a Google address).
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const name: string | undefined = body?.name;
    const emailInput: string | undefined = body?.email;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }
    const email = emailInput?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email is required — the child gets a link there to confirm it and choose a password." }, { status: 400 });
    }

    // 2026-09-29 (GDPR, launch list row 18): the adult confirms they're the
    // child's parent/guardian and accept the privacy notice for the child.
    if (body?.guardianConsent !== true) {
      return NextResponse.json({ error: "Please confirm that you're the child's parent or guardian." }, { status: 400 });
    }

    const membership = await prisma.householdMember.findFirst({
      where: { userId: session.user.id },
      include: { household: { include: { familyTrial: true } } },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You need to create a household before adding a child." },
        { status: 400 }
      );
    }
    if (!ADULT_ROLES.includes(membership.role)) {
      return NextResponse.json({ error: "Only adults can add children." }, { status: 403 });
    }

    // Trial / Pro gating (2026-09-28): child profiles are a Pro feature.
    // During the 14-day trial or with Pro there's no limit on children.
    const isPro = hasPro(membership.household);
    const trial = membership.household.familyTrial;
    const trialActive = !!trial && trial.expiresAt > new Date();
    if (!isPro && !trialActive) {
      return NextResponse.json(
        { error: trial ? "Your trial has ended — upgrade to Pro to add children." : "Child accounts are part of Pro. Start the free 14-day trial to add your children.", upgrade: true },
        { status: 403 }
      );
    }

    // 2026-09-29: the child may already have an account (signed up
    // themselves, or tapped "Continue with Google" before a parent added
    // them). Instead of failing with "email already used", invite that
    // account into the family as a child — it joins, and becomes a child
    // account, the next time they sign in (lib/invites.ts).
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { householdMembers: { include: { household: { include: { _count: { select: { members: true } } } } } } },
    });
    if (existingUser) {
      if (existingUser.deletedAt) {
        return NextResponse.json({ error: "That email belongs to a deleted account. Contact support to restore it." }, { status: 409 });
      }
      if (existingUser.householdMembers.some((m) => m.householdId === membership.householdId)) {
        return NextResponse.json({ error: "That person is already in your family." }, { status: 409 });
      }
      // Don't pull someone out of a family they share with other people.
      if (existingUser.householdMembers.some((m) => m.household._count.members > 1)) {
        return NextResponse.json({ error: "That email already belongs to someone in another family. Ask them to leave it first." }, { status: 409 });
      }
      await prisma.householdInvite.deleteMany({ where: { email, householdId: membership.householdId, usedAt: null } });
      const invite = await prisma.householdInvite.create({
        data: {
          householdId: membership.householdId,
          email,
          role: "CHILD",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      if (!existingUser.name && name.trim()) {
        await prisma.user.update({ where: { id: existingUser.id }, data: { name: name.trim() } });
      }
      const APP_URL = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const parentUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } });
      let inviteSent = true;
      try {
        await sendHouseholdInviteEmail({
          to: email,
          fromName: parentUser?.name ?? parentUser?.email ?? "Your parent",
          householdName: membership.household.name ?? "your family",
          joinUrl: `${APP_URL}/join-household?token=${invite.token}`,
          expiresText: "7 days",
          asChild: true,
        });
      } catch (err) {
        console.error("Child profile: invite email failed", err);
        inviteSent = false;
      }
      await recordConsent(existingUser.id, membership.householdId, session.user.id).catch((e) => console.error("Consent record failed:", e));
      return NextResponse.json({ existingAccount: true, inviteSent, email, householdId: membership.householdId }, { status: 201 });
    }

    // Create the child user without a password; it's set by the child via the
    // setup link (see lib/verification.ts), which also confirms the email.
    let createdUser;
    try {
      createdUser = await prisma.user.create({
        data: {
          email,
          name: name.trim(),
          isChildProfile: true,
        },
      });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "P2002") {
        return NextResponse.json({ error: "That email is already used by another account." }, { status: 409 });
      }
      console.error("Child profile: user.create failed", err);
      return NextResponse.json(
        {
          error:
            "Could not create child user. The database schema may be out of date — run `npx prisma db push` and try again.",
        },
        { status: 500 }
      );
    }

    try {
      await prisma.householdMember.create({
        data: {
          householdId: membership.householdId,
          userId: createdUser.id,
          role: "CHILD",
        },
      });
    } catch (err) {
      // Rollback the user we just made so we don't leak a dangling row
      console.error("Child profile: householdMember.create failed", err);
      await prisma.user.delete({ where: { id: createdUser.id } }).catch(() => {});
      return NextResponse.json(
        { error: "Could not link child to household." },
        { status: 500 }
      );
    }

    await recordConsent(createdUser.id, membership.householdId, session.user.id).catch((e) => console.error("Consent record failed:", e));

    const parent = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } });
    let setupSent = true;
    try {
      await sendAccountSetup({ email: createdUser.email, name: createdUser.name }, parent?.name ?? null);
    } catch (err) {
      console.error("Child profile: setup email failed", err);
      setupSent = false;
    }

    return NextResponse.json(
      {
        setupSent,
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        householdId: membership.householdId,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Child profile POST error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    );
  }
}

// GET /api/family/child-profiles -- list child profiles in my household
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.householdMember.findFirst({
      where: { userId: session.user.id },
      include: {
        household: {
          include: {
            members: {
              where: { role: "CHILD" },
              include: {
                user: {
                  select: { id: true, name: true, email: true, isChildProfile: true, emailVerified: true },
                },
              },
            },
          },
        },
      },
    });

    if (!membership) return NextResponse.json([]);

    const children = membership.household.members
      .filter((m) => m.user.isChildProfile)
      .map((m) => ({
        id: m.userId,
        name: m.user.name,
        email: m.user.email,
        emailVerified: !!m.user.emailVerified,
        householdId: membership.householdId,
      }));

    return NextResponse.json(children);
  } catch (err) {
    console.error("Child profile GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
