// 2026-10-10: the daily cron's birthday part (PRODUCT_SPEC 4b.33).
//  1. The reminder N days before (default a week) goes to every adult in the
//     family — not only whoever typed it in — by email and push, titled
//     "🎂 Elsa turns 13". For a child: a link to their wishlist (Pro).
//  2. Relatives the child's wishlist is shared with (accepted wishlist
//     guests) get the same reminder with a link to /gifts — the network effect.
//  3. On the day itself: a push to the whole family, children included.
// A birthday "for just one person" (forPerson) goes to that person — and the
// adults too when it's a child. Nobody is reminded of their own birthday.
import { prisma } from "@/lib/prisma";
import { sendBirthdayEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/webPush";
import { hasFamilyAccess } from "@/lib/entitlements";
import { getLocaleForUser } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { birthdayTitle, nextBirthdayDate } from "@/lib/birthdayLabel";
import { ensureBirthdaysTable, getBirthdayRows, wishlistGuestsOf, type BirthdayRow } from "@/lib/birthdays";

const ADULT = ["OWNER", "PARENT", "ADULT"];
const APP_URL = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://assistiq.se";

type Person = { id: string; email: string; name: string | null };

async function familyOf(householdId: string | null) {
  if (!householdId) return null;
  return prisma.household.findUnique({
    where: { id: householdId },
    include: { familyTrial: true, members: { include: { user: { select: { id: true, email: true, name: true, deletedAt: true } } } } },
  });
}

type Family = NonNullable<Awaited<ReturnType<typeof familyOf>>>;

/** Who a birthday concerns: `reminded` get the advance reminder, `everyone` the push on the day. */
function audience(family: Family | null, row: BirthdayRow, creator: Person) {
  if (!family) return { reminded: [creator], everyone: [creator] };
  const live = family.members.filter((m) => !m.user.deletedAt && m.userId !== row.personId);
  const adults = live.filter((m) => ADULT.includes(m.role));
  const target = row.forPerson ? live.find((m) => m.userId === row.forPerson) : null;
  if (target) {
    const list = target.role === "CHILD" ? [target, ...adults] : [target];
    return { reminded: list.map((m) => m.user), everyone: list.map((m) => m.user) };
  }
  return { reminded: adults.map((m) => m.user), everyone: live.map((m) => m.user) };
}

async function titleFor(userId: string, name: string, row: BirthdayRow, occurrence: Date) {
  const m = getMessages(await getLocaleForUser(userId));
  return { m, title: birthdayTitle(name, row.birthYear, occurrence, m.birthdays, row.kind) };
}

/** The reminder N days before. Returns the addresses it went to. */
export async function sendBirthdayReminder(
  reminder: { id: string; name: string; householdId: string | null; user: Person },
  row: BirthdayRow,
  occurrence: Date,
  daysLeft: number,
): Promise<string[]> {
  const family = await familyOf(reminder.householdId);
  const adults: Person[] = audience(family, row, reminder.user).reminded;

  const person = row.personId ? family?.members.find((m) => m.userId === row.personId) : null;
  const childWithWishlist = !!person && person.role === "CHILD" && hasFamilyAccess(family);
  const sentTo: string[] = [];

  for (const a of adults) {
    const { m, title } = await titleFor(a.id, reminder.name, row, occurrence);
    await sendBirthdayEmail({ to: a.email, name: a.name, title, date: occurrence, daysLeft, wishlistUrl: childWithWishlist ? `${APP_URL}/dashboard/wishlist` : null })
      .then(() => sentTo.push(a.email))
      .catch((e) => console.error("Birthday email failed:", e));
    const when = daysLeft <= 0 ? m.push.today : daysLeft === 1 ? m.push.tomorrow : m.push.inDays(daysLeft);
    await sendPushToUser(a.id, { title, body: m.push.dueBody(when, null), url: "/dashboard/birthdays", tag: `birthday-${reminder.id}` }, "reminders").catch(() => 0);
  }

  // Relatives only hear about birthdays the whole family shares.
  if (childWithWishlist && reminder.householdId && !row.forPerson) {
    for (const g of await wishlistGuestsOf(reminder.householdId, row.personId!)) {
      if (adults.some((a) => a.id === g.userId)) continue;
      const { m, title } = await titleFor(g.userId, reminder.name, row, occurrence);
      await sendBirthdayEmail({ to: g.email, name: g.name, title, date: occurrence, daysLeft, wishlistUrl: `${APP_URL}/gifts`, guest: true })
        .then(() => sentTo.push(g.email))
        .catch((e) => console.error("Birthday guest email failed:", e));
      const when = daysLeft <= 0 ? m.push.today : daysLeft === 1 ? m.push.tomorrow : m.push.inDays(daysLeft);
      await sendPushToUser(g.userId, { title, body: m.push.dueBody(when, null), url: "/gifts", tag: `birthday-${reminder.id}` }, "reminders").catch(() => 0);
    }
  }
  return sentTo;
}

/** On the day: "🎂 Elsa turns 13 today!" to everyone in the family. Once per day per birthday. */
export async function sendBirthdayDayPushes(now = new Date()): Promise<string[]> {
  const log: string[] = [];
  await ensureBirthdaysTable();
  const reminders = await prisma.reminder.findMany({
    where: { isActive: true, category: "BIRTHDAY", user: { deletedAt: null } },
    select: { id: true, name: true, householdId: true, userId: true, reminderDaysBefore: true },
  });
  const rows = await getBirthdayRows(reminders.map((r) => r.id));
  const todayStr = now.toISOString().slice(0, 10);
  const startOfToday = new Date(todayStr + "T00:00:00.000Z");

  for (const r of reminders) {
    const row = rows.get(r.id);
    if (!row) continue;
    const occ = nextBirthdayDate(row.birthMonth, row.birthDay, now);
    if (occ.toISOString().slice(0, 10) !== todayStr) continue;
    const done = await prisma.reminderLog.findFirst({ where: { reminderId: r.id, type: "birthday-day", sentAt: { gte: startOfToday } } });
    if (done) continue;

    const family = await familyOf(r.householdId);
    // With "remind on the day" the adults already got the reminder this morning.
    const aud = audience(family, row, { id: r.userId, email: "", name: null });
    // With "remind on the day" those reminded already got it this morning.
    const already = new Set(r.reminderDaysBefore > 0 ? [] : aud.reminded.map((p) => p.id));
    const people = aud.everyone.map((p) => p.id).filter((id) => !already.has(id));
    let reached = 0;
    for (const uid of people) {
      const { m, title } = await titleFor(uid, r.name, row, occ);
      reached += await sendPushToUser(uid, { title: m.birthdays.dayPushTitle(title), body: m.birthdays.dayPushBody, url: "/dashboard/birthdays", tag: `birthday-day-${r.id}` }, "reminders").catch(() => 0);
    }
    await prisma.reminderLog.create({ data: { reminderId: r.id, type: "birthday-day" } });
    log.push(`[${r.name}] birthday today -> push to ${reached} device(s)`);
  }
  return log;
}
