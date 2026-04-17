import { prisma } from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/email";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function runReminderCron() {
  const now = new Date();
  const todayStr = toDateStr(now);

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

    log.push(`[${reminder.name}] date=${toDateStr(new Date(reminder.date))} daysBefore=${reminder.reminderDaysBefore} sendOn=${sendDateStr} match=${isToday}`);

    if (!isToday) { skipped++; continue; }

    const startOfToday = new Date(todayStr + "T00:00:00.000Z");
    const alreadySent = await prisma.reminderLog.findFirst({
      where: { reminderId: reminder.id, sentAt: { gte: startOfToday } },
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
        const map: Record<string, Date> = {
          DAILY:   addDays(new Date(reminder.date), 1),
          WEEKLY:  addWeeks(new Date(reminder.date), 1),
          MONTHLY: addMonths(new Date(reminder.date), 1),
          YEARLY:  addYears(new Date(reminder.date), 1),
        };
        if (map[reminder.recurrence]) {
          await prisma.reminder.update({ where: { id: reminder.id }, data: { date: map[reminder.recurrence] } });
        }
      }

      log.push(`  -> sent to ${reminder.user.email}`);
      sent++;
    } catch (err) {
      console.error(`Failed to send reminder ${reminder.id}:`, err);
      log.push(`  -> ERROR: ${String(err)}`);
      errors++;
    }
  }

  return { success: true, sent, skipped, errors, todayStr, log };
}
