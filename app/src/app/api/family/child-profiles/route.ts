// @ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const ADULT_ROLES = ["OWNER", "PARENT", "ADULT"];

// POST /api/family/child-profiles -- parent creates a child profile (name + PIN)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.householdMember.findFirst({
    where: { userId: session.user.id },
    include: { household: { include: { familyTrial: true } } },
  });

  if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });
  if (!ADULT_ROLES.includes(membership.role)) return NextResponse.json({ error: "Adults only" }, { status: 403 });

  const { name, pin } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (!pin || pin.length !== 4 || !/^[0-9]{4}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 });
  }

  // Trial: max 1 child profile
  const isPro = membership.household.is_pro;
  const trial = membership.household.familyTrial;
  if (!isPro) {
    const existing = await prisma.householdMember.count({
      where: { householdId: membership.householdId, role: "CHILD" },
    });
    if (existing >= 1 && !trial) {
      return NextResponse.json({ error: "Start trial first to add a child profile" }, { status: 403 });
    }
    if (existing >= 1 && trial) {
      return NextResponse.json({ error: "Trial supports 1 child. Upgrade to Pro for more." }, { status: 403 });
    }
  }

  const pinHash = await bcrypt.hash(pin, 10);
  const internalEmail = "child_" + Math.random().toString(36).slice(2) + "@assistiq.internal";

  const user = await prisma.user.create({
    data: {
      email: internalEmail,
      name: name.trim(),
      password: pinHash,
      isChildProfile: true,
    },
  });

  await prisma.householdMember.create({
    data: {
      householdId: membership.householdId,
      userId: user.id,
      role: "CHILD",
    },
  });

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    householdId: membership.householdId,
  }, { status: 201 });
}

// GET /api/family/child-profiles -- list child profiles in my household
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.householdMember.findFirst({
    where: { userId: session.user.id },
    include: {
      household: {
        include: {
          members: {
            where: { role: "CHILD" },
            include: { user: { select: { id: true, name: true, email: true, isChildProfile: true } } },
          },
        },
      },
    },
  });

  if (!membership) return NextResponse.json([]);

  const children = membership.household.members
    .filter(m => m.user.isChildProfile)
    .map(m => ({ id: m.userId, name: m.user.name, householdId: membership.householdId }));

  return NextResponse.json(children);
}
