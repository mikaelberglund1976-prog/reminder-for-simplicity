// 2026-10-09: evening push "Tomorrow: Leo football 17:30 · Maja test English"
// (persona review: Jonas misses tomorrow's 09:00 match, Leo misses the test).
// Runs from /api/cron/evening once a day. Only people with push turned on and
// the "tomorrow" kind selected get one, and only when there is something.
//  - Adults: every child's tests/homework due tomorrow + everyone's activities.
//  - Children: their own.
//  - 2026-10-10: tomorrow's birthdays the person can see ("🎂 Elsa turns 13").
//  - 2026-10-16: school start first ("🏫 Elsa 08:20 · Leo 09:10"), see lib/schoolStart.ts.
import { prisma } from "@/lib/prisma";
import { getOccurrencesInRange, type RecurrenceRule } from "@/lib/recurrence";
import { getTimes } from "@/lib/reminderTimes";
import { ensurePushTables, getPushKinds, sendPushToUser } from "@/lib/webPush";
import { getLocaleForUser } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { DATE_LOCALES } from "@/lib/i18n/config";
import { getBirthdayRows } from "@/lib/birthdays";
import { birthdayTitle, nextBirthdayDate } from "@/lib/birthdayLabel";
import { buildPlan, cleanupPlanTables, stockholmYmd } from "@/lib/tomorrowPlan";
import { addDays, cleanupOverrides } from "@/lib/schoolStart";
import { busyOnlyImportIds } from "@/lib/activityFeeds";

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
      const dueAll = items.filter((r) => {
        if (r.category === "SCHOOL") return !r.completedAt && dayStr(r.date) === tKey;
        return getOccurrencesInRange({ date: r.date.toISOString(), recurrence: r.recurrence as RecurrenceRule, choreRecurrenceDays: r.choreRecurrenceDays }, tomorrow, tomorrow).length > 0;
      });
      // 2026-10-16: "Busy" blocks from an adult's work calendar aren't news.
      const busyOnly = await busyOnlyImportIds(dueAll.filter((r) => r.category === "TRAINING").map((r) => r.id));
      const due = dueAll.filter((r) => !busyOnly.has(r.id));
      // Birthdays tomorrow that this person sees (same rule as GET /api/reminders).
      const bdayCandidates = await prisma.reminder.findMany({
        where: {
          householdId: member.householdId, isActive: true, category: "BIRTHDAY",
          OR: [
            { userId }, { assignedTo: userId },
            { visibility: { in: (isAdult ? ["HOUSEHOLD", "PARENTS"] : ["HOUSEHOLD"]) as ("HOUSEHOLD" | "PARENTS")[] } },
          ],
        },
        select: { id: true, name: true },
      });
      const bdayRows = await getBirthdayRows(bdayCandidates.map((b) => b.id)).catch(() => new Map() as Awaited<ReturnType<typeof getBirthdayRows>>);
      const bdays = bdayCandidates.filter((b) => {
        const row = bdayRows.get(b.id);
        return row && row.personId !== userId && dayStr(nextBirthdayDate(row.birthMonth, row.birthDay, tomorrow)) === tKey;
      });
      const locale = await getLocaleForUser(userId);
      const m = getMessages(locale);
      // 2026-10-16: the plan gives clashes (adults) and school start (everyone).
      const plan = await buildPlan(userId, m.assist).catch(() => null);
      const starts = plan?.starts ?? [];
      if (due.length === 0 && bdays.length === 0 && starts.length === 0) continue;

      const times = await getTimes(due.map((r) => r.id));
      const lines = due
        .map((r) => {
          const time = times.get(r.id)?.startTime ?? null;
          const kind = r.category === "SCHOOL" ? (r.schoolKind === "TEST" ? `${m.push.test}: ` : r.schoolKind === "HOMEWORK" ? `${m.push.homework}: ` : "") : "";
          const label = `${kind}${r.name}${r.subject && !r.name.includes(r.subject) ? ` (${r.subject})` : ""}${time ? ` ${time}` : ""}`;
          const who = isAdult && r.assignedTo && r.assignedTo !== userId ? `${nameOf.get(r.assignedTo) || "?"}: ` : "";
          return { sort: time ?? "99:99", text: who + label };
        })
        .concat(bdays.map((b) => {
          const row = bdayRows.get(b.id)!;
          return { sort: "00:00", text: birthdayTitle(b.name, row.birthYear, tomorrow, m.birthdays, row.kind) };
        }))
        .sort((a, b) => a.sort.localeCompare(b.sort));
      // 2026-10-11: a clash ("Leo and Elsa at the same time — no ride") goes first.
      const clashes = isAdult ? (plan?.clashes ?? []) : [];
      // "🏫 Elsa 08:20 · Leo off (Study day)" — a child just gets their own time.
      const startLine = starts.length
        ? m.push.starts(starts.map((s) => `${s.who ? `${s.who} ` : ""}${s.off ? m.assist.tmOff : s.time}${s.note ? ` (${s.note})` : ""}${s.wake && !s.who ? ` · ⏰ ${m.assist.tmWake(s.wake)}` : ""}`).join(" · "))
        : null;
      const shown = [...clashes.slice(0, 2).map((c) => `⚠️ ${c}`), ...(startLine ? [startLine] : []), ...lines.slice(0, 4).map((l) => l.text)];
      if (lines.length > 4) shown.push(m.push.more(lines.length - 4));
      const day = tomorrow.toLocaleDateString(DATE_LOCALES[locale], { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
      const reached = await sendPushToUser(userId, { title: m.push.tomorrowTitle(day), body: shown.join("\n"), url: "/dashboard#tomorrow", tag: `tomorrow-${tKey}` }, "tomorrow");
      if (reached) sent++;
    } catch (err) {
      console.error("Tomorrow digest failed for a user:", err);
      log.push(`ERROR ${String(err)}`);
    }
  }
  await cleanupPlanTables();
  await cleanupOverrides(addDays(stockholmYmd(), -7));
  log.push(`Tomorrow digest ${tKey}: ${sent} of ${users.length} people with push`);
  return { success: true, sent, log };
}
