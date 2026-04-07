/**
 * Cron Job – Skicka email-påminnelser
 *
 * Körs dagligen via Vercel Cron (konfigurera i vercel.json)
 * Hitta reminders som ska skickas idag och skicka email.
 *
 * Skyddat med CRON_SECRET för att förhindra obehörig åtkomst.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/email";
import { addDays, startOfDay, endOfDay } from "date-fns";

export async function GET(req: Request) {
  // Verifiera att anropet kommer från Vercel Cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  let sent = 0;
  let errors = 0;

  // Hämta alla aktiva reminders
  const reminders = await prisma.reminder.findMany({
    where: { isActive: true },
    include: { user: true },
  });

  for (const reminder of reminders) {
    // Beräkna när påminnelsen ska skickas (datum - X dagar innan)
    const sendDate = addDays(reminder.date, -reminder.reminderDaysBefore);
    const isToday =
      sendDate >= startOfDay(today) && sendDate <= endOfDay(today);

    if (!isToday) continue;

    // Kolla om vi redan skickat idag
    const alreadySent = await prisma.reminderLog.findFirst({
      where: {
        reminderId: reminder.id,
        sentAt: { gte: startOfDay(today) },
      },
    });

    if (alreadySent) continue;

    try {
      await sendReminderEmail({
        to: reminder.user.email,
        name: reminder.user.name,
        reminderName: reminder.name,
        date: reminder.date,
        amount: reminder.amount,
        currency: reminder.currency,
        note: reminder.note,
        reminderId: reminder.id,
        category: reminder.category,
      });

      // Logga att vi skickat
      await prisma.reminderLog.create({
        data: { reminderId: reminder.id, type: "email" },
      });

      // Hantera återkommande reminders – flytta till nästa datum
      if (reminder.recurrence !== "ONCE") {
        await updateNextDate(reminder.id, reminder.date, reminder.recurrence);
      }

      sent++;
    } catch (err) {
      console.error(`Failed to send reminder ${reminder.id}:`, err);
      errors++;
    }
  }

  return NextResponse.json({
    success: true,
    sent,
    errors,
    timestamp: today.toISOString(),
  });
}

async function updateNextDate(id: string, currentDate: Date, recurrence: string) {
  const { addDays, addWeeks, addMonths, addYears } = await import("date-fns");

  const nextDate = {
    DAILY: addDays(currentDate, 1),
    WEEKLY: addWeeks(currentDate, 1),
    MONTHLY: addMonths(currentDate, 1),
    YEARLY: addYears(currentDate, 1),
  }[recurrence];

  if (nextDate) {
    await prisma.reminder.update({
      where: { id },
      data: { date: nextDate },
    });
  }
}
