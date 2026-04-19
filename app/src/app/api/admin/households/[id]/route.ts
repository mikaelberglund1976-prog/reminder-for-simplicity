import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "mikaelberglund1976@gmail.com";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    return null;
  }
  return session;
}

// GET /api/admin/households/[id] — full detail for one household
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const household = await prisma.household.findUnique({
      where: { id: params.id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                isChildProfile: true,
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        invites: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            email: true,
            createdAt: true,
            expiresAt: true,
            usedAt: true,
          },
        },
        familyTrial: true,
        reminders: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            category: true,
            recurrence: true,
            date: true,
            assignedTo: true,
            isActive: true,
            createdAt: true,
            userId: true,
          },
        },
      },
    });

    if (!household) {
      return NextResponse.json({ error: "Household not found" }, { status: 404 });
    }

    return NextResponse.json({ household });
  } catch (err) {
    console.error("Admin household GET error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}

// PATCH /api/admin/households/[id] — update household fields (name, is_pro)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const data: { name?: string | null; is_pro?: boolean } = {};

    if (typeof body?.name === "string") {
      data.name = body.name.trim() === "" ? null : body.name.trim();
    }
    if (typeof body?.is_pro === "boolean") {
      data.is_pro = body.is_pro;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const household = await prisma.household.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ household });
  } catch (err) {
    console.error("Admin household PATCH error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}

// DELETE /api/admin/households/[id] — remove household (cascade removes members, reminders, invites, trial)
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await prisma.household.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin household DELETE error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}
