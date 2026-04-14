import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/email";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";

// Formats a Date to "YYYY-MM-DD" using UTC — safe for all timezones
function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayStr = toDateStr(now); // e.g. "2026-04-14"

  let sent = 0;
  let skipped = 0;
  let errors = 0;
  const log: string[] = [];

  const reminders = await prisma.reminder.findMany({
    where: { isActive: true },
    include: { user: true },
  });

  log.push(`Today: ${todayStr}`);
  log.push(`Active reminders: ${reminders.length}`);

  for (const reminder of reminders) {
    const sendDate = addDays(new Date(reminder.date), -reminder.reminderDaysBefore);
    const sendDateStr = toDateStr(sendDate);
    const isToday = sendDateStr === todayStr;

    log.push(`[${reminder.name}] reminderDate=${toDateStr(new Date(reminder.date))} daysBefore=${reminder.reminderDaysBefore} sendOn=${sendDateStr} matchesToday=${isToday}`);

    if (!isToday) { skipped++; continue; }

    // Already sent today?
    const startOfToday = new Date(todayStr + "T00:00:00.000Z");
    const alreadySent = await prisma.reminderLog.findFirst({
      where: {
        reminderId: reminder.id,
        sentAt: { gte: startOfToday },
      },
    });

    if (alreadySent) {
      log.push(`  -> already sent today`);
      skipped++;
      continue;
    }

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

      await prisma.reminderLog.create({
        data: { reminderId: reminder.id, type: "email" },
      });

      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { lastSentAt: now },
      });

      if (reminder.recurrence !== "ONCE") {
        await updateNextDate(reminder.id, new Date(reminder.date), reminder.recurrence);
      }

      log.push(`  -> sent to ${reminder.user.email}`);
      sent++;
    } catch (err) {
      console.error(`Failed to send reminder ${reminder.id}:`, err);
      log.push(`  -> ERROR: ${String(err)}`);
      errors++;
    }
  }

  return NextResponse.json({ success: true, sent, skipped, errors, todayStr, log });
}

async function updateNextDate(id: string, currentDate: Date, recurrence: string) {
  const map: Record<string, Date> = {
    DAILY:   addDays(currentDate, 1),
    WEEKLY:  addWeeks(currentDate, 1),
    MONTHLY: addMonths(currentDate, 1),
    YEARLY:  addYears(currentDate, 1),
  };
  if (map[recurrence]) {
    await prisma.reminder.update({ where: { id }, data: { date: map[recurrence] } });
  }
}
