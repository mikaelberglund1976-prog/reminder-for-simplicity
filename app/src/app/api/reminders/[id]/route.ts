import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.enum(["SUBSCRIPTION", "BIRTHDAY", "INSURANCE", "CONTRACT", "HEALTH", "BILL", "OTHER"]).optional(),
  date: z.string().datetime().optional(),
  recurrence: z.enum(["ONCE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).optional(),
  amount: z.number().positive().optional().nullable(),
  currency: z.string().max(3).optional(),
  note: z.string().max(500).optional().nullable(),
  reminderDaysBefore: z.number().int().min(0).max(30).optional(),
});

// GET /api/reminders/[id] – Hämta en specifik reminder
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }

  const reminder = await prisma.reminder.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
      isActive: true,
    },
  });

  if (!reminder) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  return NextResponse.json(reminder);
}

// DELETE /api/reminders/[id] – Ta bort en reminder (soft delete)
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }

  // Kontrollera att reminderns tillhör inloggad användare
  const existing = await prisma.reminder.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  // Soft delete – sätter isActive till false
  await prisma.reminder.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}

// PATCH /api/reminders/[id] – Uppdatera en reminder
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }

  const existing = await prisma.reminder.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
      isActive: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const updated = await prisma.reminder.update({
      where: { id: params.id },
      data: {
        ...data,
        ...(data.date ? { date: new Date(data.date) } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Update reminder error:", error);
    return NextResponse.json({ error: "Något gick fel." }, { status: 500 });
  }
}
