import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
