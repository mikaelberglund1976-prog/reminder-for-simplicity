// 2026-10-09: evening push "Tomorrow: Leo football 17:30 · Maja test English"
// (persona review: Jonas misses tomorrow's 09:00 match, Leo misses the test).
// Runs from /api/cron/evening once a day. Only people with push turned on and
// the "tomorrow" kind selected get one, and only when there is something.
//  - Adults: every child's tests/homework due tomorrow + everyone's activities.
//  - Children: their own.
import { prisma } from "@/lib/prisma";
import { getOccurrencesInRange, type RecurrenceRule } from "@/lib/recurrence";
import { getTimes } from "@/lib/reminderTimes";
import { ensurePushTables, getPushKinds, sendPushToUser } from "@/lib/webPush";
import { getLocaleForUser } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { DATE_LOCALES } from "@/lib/i18n/config";

const ADULT = ["OWNER", "PARENT", "ADULT"];

function dayStr(d: Date) { return d.toISOString().slice(0, 10); }

export async function runTomorrowDigest(now = new Date()) {
  const log: string[] = [];
  await ensurePushTables();
  const users = await prisma.$queryRawUnsafe<{ userId: string }[]>(`SELECT DISTINCT "userId" FROM "push_subscriptions"`);
  // Runs 17:00 UTC (evening in Sweden) — tomorrow in UTC is tomorrow in Sweden.
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const tKey = dayStr(tomorrow);
  let sent = 0;

  for (const { userId } of users) {
    try {
      if (!(await getPushKinds(userId)).includes("tomorrow")) continue;
      const member = await prisma.householdMember.findFirst({
        where: { userId },
        include: { household: { include: { members: { include: { user: { select: { id: true, name: true, deletedAt: true } } } } } } },
      });
      if (!member) continue;
      const isAdult = ADULT.includes(member.role);
      const people = member.household.members.filter((m) => !m.user.deletedAt);
      const nameOf = new Map(people.map((m) => [m.userId, (m.user.name ?? "").split(" ")[0]]));
      const scope = isAdult ? people.map((m) => m.userId) : [userId];

      const items = await prisma.reminder.findMany({
        where: {
          householdId: member.householdId,
          isActive: true,
          category: { in: ["SCHOOL", "TRAINING"] },
          assignedTo: { in: scope },
        },
        select: { id: true, name: true, category: true, date: true, recurrence: true, choreRecurrenceDays: true, schoolKind: true, subject: true, completedAt: true, assignedTo: true },
      });
      const due = items.filter((r) => {
        if (r.category === "SCHOOL") return !r.completedAt && dayStr(r.date) === tKey;
        return getOccurrencesInRange({ date: r.date.toISOString(), recurrence: r.recurrence as RecurrenceRule, choreRecurrenceDays: r.choreRecurrenceDays }, tomorrow, tomorrow).length > 0;
      });
      if (due.length === 0) continue;

      const locale = await getLocaleForUser(userId);
      const m = getMessages(locale);
      const times = await getTimes(due.map((r) => r.id));
      const lines = due
        .map((r) => {
          const time = times.get(r.id)?.startTime ?? null;
          const kind = r.category === "SCHOOL" ? (r.schoolKind === "TEST" ? `${m.push.test}: ` : r.schoolKind === "HOMEWORK" ? `${m.push.homework}: ` : "") : "";
          const label = `${kind}${r.name}${r.subject && !r.name.includes(r.subject) ? ` (${r.subject})` : ""}${time ? ` ${time}` : ""}`;
          const who = isAdult && r.assignedTo && r.assignedTo !== userId ? `${nameOf.get(r.assignedTo) || "?"}: ` : "";
          return { sort: time ?? "99:99", text: who + label };
        })
        .sort((a, b) => a.sort.localeCompare(b.sort));
      const shown = lines.slice(0, 4).map((l) => l.text);
      if (lines.length > 4) shown.push(m.push.more(lines.length - 4));
      const day = tomorrow.toLocaleDateString(DATE_LOCALES[locale], { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
      const reached = await sendPushToUser(userId, { title: m.push.tomorrowTitle(day), body: shown.join("\n"), url: "/dashboard/calendar", tag: `tomorrow-${tKey}` }, "tomorrow");
      if (reached) sent++;
    } catch (err) {
      console.error("Tomorrow digest failed for a user:", err);
      log.push(`ERROR ${String(err)}`);
    }
  }
  log.push(`Tomorrow digest ${tKey}: ${sent} of ${users.length} people with push`);
  return { success: true, sent, log };
}
