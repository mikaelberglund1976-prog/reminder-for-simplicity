// 2026-10-11: pushes before a trip (lib/trips.ts), from the daily cron.
//  - 60, 30 and 14 days before: a passport is missing a date, expires before
//    the trip ends, or has less than 6 months left → adults.
//  - 42 days before, if vaccination is ticked and not done → adults.
//  - The day before a flight that isn't checked in → adults.
//  - 2 days before, if things are left to pack → everyone travelling.
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/webPush";
import { getLocaleForUser } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { ADULT, addDays, addMonths, daysBetween, ensureTripTables, flightTitle, parseFlight, passportDates, stockholmToday, travellersOf, tripItems, type TripRow } from "@/lib/trips";

export async function runTripNudges(): Promise<number> {
  let sent = 0;
  try {
    await ensureTripTables();
    const today = stockholmToday();
    const trips = await prisma.$queryRaw<TripRow[]>`SELECT * FROM "trips" WHERE "startYmd" >= ${today} AND "startYmd" <= ${addDays(today, 61)}`;
    for (const trip of trips) {
      const daysTo = daysBetween(today, trip.startYmd);
      const members = await prisma.householdMember.findMany({ where: { householdId: trip.householdId }, include: { user: { select: { deletedAt: true } } } });
      const people = members.filter((x) => !x.user.deletedAt).map((x) => ({ id: x.userId, role: x.role as string }));
      const adults = people.filter((p) => ADULT.includes(p.role)).map((p) => p.id);
      const going = travellersOf(trip, people);
      const items = await tripItems(trip.id);
      const send = async (to: string[], body: (t: ReturnType<typeof getMessages>["trips"]) => string, tag: string) => {
        for (const uid of to) {
          const t = getMessages(await getLocaleForUser(uid)).trips;
          if (await sendPushToUser(uid, { title: t.pushTitle(trip.name), body: body(t), url: `/dashboard/trips/${trip.id}`, tag: `${tag}-${trip.id}` }, "reminders")) sent++;
        }
      };

      if ([60, 30, 14].includes(daysTo)) {
        const pass = await passportDates(going);
        const issues = going.filter((id) => { const e = pass.get(id); return !e || e < addMonths(trip.endYmd, 6); }).length;
        if (issues) await send(adults, (t) => t.pushPassport(issues), "trip-pass");
      }
      if (trip.vaccine && daysTo === 42) {
        const todo = items.find((i) => i.kind === "TODO" && /vacc/i.test(i.label));
        if (!todo?.checked) await send(adults, (t) => t.pushVaccine, "trip-vaccine");
      }
      for (const f of items.filter((i) => i.kind === "FLIGHT" && !i.checked)) {
        const d = parseFlight(f);
        if (d && d.depYmd === addDays(today, 1)) await send(adults, (t) => t.pushCheckIn(flightTitle(d)), `trip-checkin-${f.id}`);
      }
      if (daysTo === 2) {
        const left = items.filter((i) => i.kind === "PACK" && !i.checked).length;
        if (left) await send(going, (t) => t.pushPack(left), "trip-pack");
      }
    }
  } catch (err) {
    console.error("Trip nudges failed:", err);
  }
  return sent;
}
