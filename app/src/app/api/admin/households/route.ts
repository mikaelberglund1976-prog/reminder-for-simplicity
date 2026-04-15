import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "mikaelberglund1976@gmail.com";

// GET /api/admin/households — list all households with members and pending invites
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const households = await prisma.household.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { joinedAt: "asc" },
        },
        invites: {
          where: { usedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
          select: { id: true, email: true, createdAt: true, expiresAt: true },
        },
      },
    });

    return NextResponse.json({ households });
  } catch (err) {
    console.error("Admin households error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
