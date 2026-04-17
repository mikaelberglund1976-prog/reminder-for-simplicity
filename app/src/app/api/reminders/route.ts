import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const reminderSchema = z.object({
  name: z.string().min(1, "Namn kravs").max(200),
  category: z.enum(["SUBSCRIPTION", "BIRTHDAY", "INSURANCE", "CONTRACT", "HEALTH", "BILL", "CHORE", "OTHER"]),
  date: z.string().datetime(),
  recurrence: z.enum(["ONCE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).default("YEARLY"),
  amount: z.number().positive().optional().nullable(),
  currency: z.string().max(3).optional().default("SEK"),
  note: z.string().max(500).optional().nullable(),
  reminderDaysBefore: z.number().int().min(0).max(30).default(3),
  visibility: z.enum(["PRIVATE", "HOUSEHOLD", "PARENTS"]).default("PRIVATE"),
});

// GET /api/reminders
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }

  const membership = await prisma.householdMember.findFirst({
    where: { userId: session.user.id },
  });

  let reminders;

  if (membership) {
    const isAdultRole = ["OWNER", "PARENT", "ADULT"].includes(membership.role);
    const visibleLevels = isAdultRole
      ? ["HOUSEHOLD", "PARENTS"]
      : ["HOUSEHOLD"];

    reminders = await prisma.reminder.findMany({
      where: {
        isActive: true,
        category: { not: "CHORE" as never },
        OR: [
          { userId: session.user.id },
          {
            householdId: membership.householdId,
            visibility: { in: visibleLevels as ("HOUSEHOLD" | "PARENTS")[] },
            userId: { not: session.user.id },
          },
        ],
      },
      orderBy: { date: "asc" },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  } else {
    reminders = await prisma.reminder.findMany({
      where: { userId: session.user.id, isActive: true, category: { not: "CHORE" as never } },
      orderBy: { date: "asc" },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }

  return NextResponse.json(reminders);
}

// POST /api/reminders
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = reminderSchema.parse(body);

    let householdId: string | null = null;
    if (data.visibility !== "PRIVATE") {
      const membership = await prisma.householdMember.findFirst({
        where: { userId: session.user.id },
        include: { household: { select: { is_pro: true } } },
      });
      if (membership?.household?.is_pro) {
        householdId = membership.householdId;
      }
    }

    const reminder = await prisma.reminder.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: {
        ...(data as any),
        date: new Date(data.date),
        userId: session.user.id,
        householdId,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Create reminder error:", error);
    return NextResponse.json({ error: "Nagot gick fel." }, { status: 500 });
  }
}
