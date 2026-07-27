import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const ADULT_ROLES = ["OWNER", "PARENT", "ADULT"];

// POST /api/family/child-profiles -- parent creates a child profile (name + PIN)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const name: string | undefined = body?.name;
    const pin: string | undefined = body?.pin;
    const emailInput: string | undefined = body?.email;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }
    if (!pin || pin.length !== 4 || !/^[0-9]{4}$/.test(pin)) {
      return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 });
    }
    const email = emailInput?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email is required — every account needs one, even if the child mostly logs in with their PIN." }, { status: 400 });
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

    // Trial / Pro gating: free households without a trial can't add a child
    const isPro = membership.household.is_pro;
    const trial = membership.household.familyTrial;
    if (!isPro) {
      const existing = await prisma.householdMember.count({
        where: { householdId: membership.householdId, role: "CHILD" },
      });
      if (existing >= 1 && !trial) {
        return NextResponse.json(
          { error: "Start a trial first to add a child profile." },
          { status: 403 }
        );
      }
      if (existing >= 1 && trial) {
        return NextResponse.json(
          { error: "Trial supports 1 child. Upgrade to Pro for more." },
          { status: 403 }
        );
      }
    }

    // Create the child user. Every account needs a real email now — see
    // TODO.md 4j (2026-07-27): a parent supplies it (their own address, an
    // alias like "parent+childname@gmail.com", or the child's own email if
    // they have one). The child still logs in day-to-day via PIN, not this
    // email — it exists so the account is a real, ownable identity (e.g. if
    // the child later wants to switch to full email+password login), not so
    // it becomes another login step for a kid.
    const pinHash = await bcrypt.hash(pin, 10);

    let createdUser;
    try {
      createdUser = await prisma.user.create({
        data: {
          email,
          name: name.trim(),
          password: pinHash,
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

    return NextResponse.json(
      {
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
                  select: { id: true, name: true, email: true, isChildProfile: true },
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
        householdId: membership.householdId,
      }));

    return NextResponse.json(children);
  } catch (err) {
    console.error("Child profile GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
