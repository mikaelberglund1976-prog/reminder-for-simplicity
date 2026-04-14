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
});

// GET /api/reminders – Hämta alla reminders för inloggad användare
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }

  const reminders = await prisma.reminder.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: { date: "asc" },
  });

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

    const reminder = await prisma.reminder.create({
      data: {
        ...data,
        date: new Date(data.date),
        userId: session.user.id,
      },
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
