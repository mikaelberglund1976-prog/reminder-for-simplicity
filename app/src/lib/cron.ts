import { prisma } from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/email";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";
import { purgeExpiredAccounts } from "@/lib/accountDeletion";
import { purgeOrphanMedia } from "@/lib/media";

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
    // 2026-09-27: skip reminders owned by soft-deleted accounts.
    where: { isActive: true, user: { deletedAt: null } },
    include: { user: true, assignedUser: true },
  });

  log.push(`Today: ${todayStr}`);
  log.push(`Active reminders: ${reminders.length}`);

  for (const reminder of reminders) {
    const sendDate = addDays(new Date(reminder.date), -reminder.reminderDaysBefore);
    const sendDateStr = toDateStr(sendDate);
    const isToday = sendDateStr === todayStr;

    log.push(`[${reminder.name}] date=${toDateStr(new Date(reminder.date))} daysBefore=${reminder.reminderDaysBefore} sendOn=${sendDateStr} match=${isToday}`);

    if (!isToday) { skipped++; continue; }

    // 2026-09-27: homework/tests already ticked off don't need a reminder.
    if (reminder.category === "SCHOOL" && reminder.completedAt) { skipped++; continue; }

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
      // School items: the person it's assigned to (usually the child) gets the
      // reminder, plus whoever created it if that's someone else (a parent).
      const recipients: { email: string; name: string | null }[] = [{ email: reminder.user.email, name: reminder.user.name }];
      if (reminder.category === "SCHOOL" && reminder.assignedUser && !reminder.assignedUser.deletedAt
          && reminder.assignedUser.email !== reminder.user.email) {
        recipients.unshift({ email: reminder.assignedUser.email, name: reminder.assignedUser.name });
      }
      for (const r of recipients) await sendReminderEmail({
        to: r.email,
        name: r.name,
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

      log.push(`  -> sent to ${recipients.map((r) => r.email).join(", ")}`);
      sent++;
    } catch (err) {
      console.error(`Failed to send reminder ${reminder.id}:`, err);
      log.push(`  -> ERROR: ${String(err)}`);
      errors++;
    }
  }

  // Purchased shopping-list items used to auto-clear ~24h after purchase.
  // Removed 2026-07-27: bought items are reused often enough (same groceries
  // every week) that households wanted them to stick around as a quick
  // reference/re-add list instead of disappearing on a timer. Clearing is
  // now only ever manual, via the "Clear bought items" button.

  // 2026-09-27: accounts soft-deleted more than 60 days ago are removed for real.
  try {
    const purged = await purgeExpiredAccounts();
    if (purged.length) log.push(`Purged deleted accounts: ${purged.length}`);
  } catch (err) {
    console.error("Account purge failed:", err);
    log.push(`Account purge ERROR: ${String(err)}`);
  }

  // 2026-09-29 (GDPR): photos whose person/family is gone are removed, and
  // Google sign-in tokens (never used after login) are not kept.
  try {
    const removed = await purgeOrphanMedia();
    if (removed) log.push(`Removed orphaned photos: ${removed}`);
    const cleared = await prisma.account.updateMany({
      where: { OR: [{ access_token: { not: null } }, { id_token: { not: null } }, { refresh_token: { not: null } }] },
      data: { access_token: null, id_token: null, refresh_token: null },
    });
    if (cleared.count) log.push(`Cleared stored OAuth tokens: ${cleared.count}`);
  } catch (err) {
    console.error("GDPR cleanup failed:", err);
    log.push(`GDPR cleanup ERROR: ${String(err)}`);
  }

  return { success: true, sent, skipped, errors, todayStr, log };
}
