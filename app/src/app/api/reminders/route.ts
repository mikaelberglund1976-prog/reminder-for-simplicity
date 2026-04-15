import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const reminderSchema = z.object({
  name: z.string().min(1, "Namn krävs").max(200),
  category: z.enum(["SUBSCRIPTION", "BIRTHDAY", "INSURANCE", "CONTRACT", "HEALTH", "BILL", "OTHER"]),
  date: z.string().datetime(),
  recurrence: z.enum(["ONCE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).default("YEARLY"),
  amount: z.number().positive().optional().nullable(),
  currency: z.string().max(3).optional().default("SEK"),
  note: z.string().max(500).optional().nullable(),
  reminderDaysBefore: z.number().int().min(0).max(30).default(3),
  visibility: z.enum(["PRIVATE", "HOUSEHOLD", "PARENTS"]).default("PRIVATE"),
});

// GET /api/reminders – Hämta reminders för inloggad användare + delade från household
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }

  // Kolla om användaren är i ett hushåll
  const membership = await prisma.householdMember.findFirst({
    where: { userId: session.user.id },
  });

  let reminders;

  if (membership) {
    // Avgör vilka visibility-nivåer användaren kan se
    const isAdultRole = ["OWNER", "PARENT", "ADULT"].includes(membership.role);
    const visibleLevels = isAdultRole
      ? ["HOUSEHOLD", "PARENTS"]
      : ["HOUSEHOLD"]; // barn ser inte PARENTS-only påminnelser

    reminders = await prisma.reminder.findMany({
      where: {
        isActive: true,
        OR: [
          { userId: session.user.id }, // egna påminnelser alltid
          {
            householdId: membership.householdId,
            visibility: { in: visibleLevels as ("HOUSEHOLD" | "PARENTS")[] },
            userId: { not: session.user.id }, // delade från andra
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
      where: { userId: session.user.id, isActive: true },
      orderBy: { date: "asc" },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }

  return NextResponse.json(reminders);
}

// POST /api/reminders – Skapa ny reminder
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = reminderSchema.parse(body);

    // Hämta household om visibility är delad
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
      data: {
        ...data,
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
    return NextResponse.json({ error: "Något gick fel." }, { status: 500 });
  }
}
