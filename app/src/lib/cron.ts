import { prisma } from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/email";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";
import { purgeExpiredAccounts } from "@/lib/accountDeletion";
import { purgeOrphanMedia } from "@/lib/media";
import { importedIds, syncAllFeeds } from "@/lib/schoolFeeds";
import { activityImportInfo, syncAllActivityFeeds } from "@/lib/activityFeeds";

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** Does a reminder starting on `start` with `recurrence` fall on the UTC day `dayStr` (YYYY-MM-DD)? */
function occursOn(start: Date, recurrence: string, dayStr: string): boolean {
  const target = new Date(dayStr + "T23:59:59.999Z");
  if (start > target) return false;
  for (let n = 0; n < 4000; n++) {
    const d = recurrence === "DAILY" ? addDays(start, n)
      : recurrence === "WEEKLY" ? addWeeks(start, n)
      : recurrence === "MONTHLY" ? addMonths(start, n)
      : addYears(start, n);
    if (d > target) return false;
    if (toDateStr(d) === dayStr) return true;
  }
  return false;
}

export async function runReminderCron() {
  const now = new Date();
  const todayStr = toDateStr(now);

  let sent = 0;
  let skipped = 0;
  let errors = 0;
  const log: string[] = [];

  // 2026-10-03: SchoolSoft links, once a day — before the reminders below so a
  // test that just appeared still gets its day-before email.
  try {
    const feeds = await syncAllFeeds();
    if (feeds.synced || feeds.failed) log.push(`SchoolSoft feeds: ${feeds.synced} synced, ${feeds.failed} failed`);
  } catch (err) {
    console.error("SchoolSoft sync failed:", err);
    log.push(`SchoolSoft sync ERROR: ${String(err)}`);
  }

  // 2026-10-09: activity calendar links (up to 3 per child), once a day.
  try {
    const af = await syncAllActivityFeeds();
    if (af.synced || af.failed) log.push(`Activity feeds: ${af.synced} synced, ${af.failed} failed`);
  } catch (err) {
    console.error("Activity feed sync failed:", err);
    log.push(`Activity feed sync ERROR: ${String(err)}`);
  }

  const reminders = await prisma.reminder.findMany({
    // 2026-09-27: skip reminders owned by soft-deleted accounts.
    where: { isActive: true, user: { deletedAt: null } },
    include: { user: true, assignedUser: true },
  });

  // Imported SchoolSoft items email only the child — otherwise the parent who
  // connected the link would get one email per homework for every child.
  const imported = await importedIds(reminders.filter((r) => r.category === "SCHOOL").map((r) => r.id));
  // Imported activities (every training/match from a club calendar) send no
  // emails — that would be one per training to the adult who connected it.
  const importedActivities = await activityImportInfo(reminders.filter((r) => r.category === "TRAINING").map((r) => r.id));

  log.push(`Today: ${todayStr}`);
  log.push(`Active reminders: ${reminders.length}`);

  // 2026-10-04 (phone test, item 5): a recurring reminder whose date is
  // already in the past (created with an old start date, or a missed run)
  // never matched "sendOn === today" again, so it stopped emailing and Home
  // showed it as overdue for ever. Roll it forward to its next occurrence.
  const todayStart = new Date(todayStr + "T00:00:00.000Z");
  for (const reminder of reminders) {
    if (reminder.recurrence === "ONCE" || ["CHORE", "TRAINING", "SCHOOL"].includes(reminder.category as string)) continue;
    const start = new Date(reminder.date);
    if (start >= todayStart) continue;
    let next = start;
    for (let n = 1; n < 4000 && next < todayStart; n++) {
      next = reminder.recurrence === "DAILY" ? addDays(start, n)
        : reminder.recurrence === "WEEKLY" ? addWeeks(start, n)
        : reminder.recurrence === "MONTHLY" ? addMonths(start, n)
        : addYears(start, n);
    }
    if (next >= todayStart) {
      await prisma.reminder.update({ where: { id: reminder.id }, data: { date: next } });
      log.push(`[${reminder.name}] rolled forward ${toDateStr(start)} -> ${toDateStr(next)}`);
      reminder.date = next;
    }
  }

  for (const reminder of reminders) {
    const sendDate = addDays(new Date(reminder.date), -reminder.reminderDaysBefore);
    const sendDateStr = toDateStr(sendDate);
    const isFamilyItem = ["CHORE", "TRAINING", "SCHOOL"].includes(reminder.category as string);
    // 2026-10-04: a recurring reminder matches when the occurrence
    // `daysBefore` days from now is one of its dates (the stored date is now
    // only rolled forward once it has passed, see above).
    const isToday = isFamilyItem || reminder.recurrence === "ONCE"
      ? sendDateStr === todayStr
      : occursOn(new Date(reminder.date), reminder.recurrence, toDateStr(addDays(todayStart, reminder.reminderDaysBefore)));

    log.push(`[${reminder.name}] date=${toDateStr(new Date(reminder.date))} daysBefore=${reminder.reminderDaysBefore} sendOn=${sendDateStr} match=${isToday}`);

    if (!isToday) { skipped++; continue; }
    if (importedActivities.has(reminder.id)) { skipped++; continue; }

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
      const recipients: { email: string; name: string | null }[] = imported.has(reminder.id) ? [] : [{ email: reminder.user.email, name: reminder.user.name }];
      if (reminder.category === "SCHOOL" && reminder.assignedUser && !reminder.assignedUser.deletedAt
          && (imported.has(reminder.id) || reminder.assignedUser.email !== reminder.user.email)) {
        recipients.unshift({ email: reminder.assignedUser.email, name: reminder.assignedUser.name });
      }
      for (const r of recipients) await sendReminderEmail({
        to: r.email,
        name: r.name,
        reminderName: reminder.name,
        date: isFamilyItem || reminder.recurrence === "ONCE" ? reminder.date : addDays(todayStart, reminder.reminderDaysBefore),
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

      // 2026-10-04: reminders no longer jump one period ahead right after the
      // email (that made "due in 3 days" vanish from Home and the calendar);
      // the roll-forward above moves them once the date has passed. Chores,
      // activities and school items keep the old behaviour.
      if (isFamilyItem && reminder.recurrence !== "ONCE") {
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
