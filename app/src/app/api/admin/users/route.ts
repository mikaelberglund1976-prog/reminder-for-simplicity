import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "mikaelberglund1976@gmail.com";

// GET /api/admin/users — list all users with reminder count
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        preferredCurrency: true,
        _count: { select: { reminders: { where: { isActive: true } } } },
        householdMembers: {
          select: {
            role: true,
            household: { select: { id: true, name: true, is_pro: true } },
          },
          take: 1,
        },
      },
    });

    // Stats
    const totalReminders = await prisma.reminder.count({ where: { isActive: true } });
    const emailsSent = await prisma.reminderLog.count({
      where: { sentAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    });
    const lastLog = await prisma.reminderLog.findFirst({ orderBy: { sentAt: "desc" } });

    return NextResponse.json({
      users,
      stats: {
        totalUsers: users.length,
        totalReminders,
        emailsSent30Days: emailsSent,
        lastEmailSent: lastLog?.sentAt ?? null,
      },
    });
  } catch (err) {
    console.error("Admin users error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
