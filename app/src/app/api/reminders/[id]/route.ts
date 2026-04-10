import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const reminder = await prisma.reminder.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!reminder) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(reminder);
  } catch (error) {
    console.error("GET /api/reminders/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.reminder.deleteMany({
      where: { id: params.id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/reminders/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const reminder = await prisma.reminder.updateMany({
      where: { id: params.id, userId: user.id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.category !== undefined && { category: parsed.data.category }),
        ...(parsed.data.date !== undefined && { date: new Date(parsed.data.date) }),
        ...(parsed.data.recurrence !== undefined && { recurrence: parsed.data.recurrence }),
        ...(parsed.data.amount !== undefined && { amount: parsed.data.amount }),
        ...(parsed.data.currency !== undefined && { currency: parsed.data.currency }),
        ...(parsed.data.note !== undefined && { note: parsed.data.note }),
        ...(parsed.data.reminderDaysBefore !== undefined && { reminderDaysBefore: parsed.data.reminderDaysBefore }),
      },
    });

    return NextResponse.json(reminder);
  } catch (error) {
    console.error("PATCH /api/reminders/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
