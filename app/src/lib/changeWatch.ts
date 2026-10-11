// 2026-10-11 (Mikael: "man ska känna det som en livsviktig app"): the change
// watch. The school and club calendars are already synced every day — when a
// sync sees that something coming up soon has changed (the match moved from
// 10:00 to 08:30, a new test appeared, a training was cancelled), it is saved
// here and the family gets one push right away: "Leo: Match moved to 08:30".
// Home shows the same list ("Det här har ändrats") for a few days.
//
// Rules, so it never becomes noise:
//  - Only things in the next WATCH_DAYS days (a change in December doesn't
//    need a ping in October).
//  - The very first sync of a link records nothing (everything is "new").
//  - A link whose calendar changed a lot in one go (a new schedule) gets ONE
//    summary line instead of one per item.
//  - Things the family declined (MyClub "[Nej]") are not "cancelled".
//
// Storage: self-creating tables (same pattern as push_subscriptions), so a
// deploy needs no database step.
//   change_alerts — one row per change. notifiedAt = the push has gone out.
//   change_seen   — per person, when they last closed the Home card.
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/webPush";
import { getLocaleForUser } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { DATE_LOCALES } from "@/lib/i18n/config";

export const WATCH_DAYS = 14;
export const NEW_ACTIVITY_DAYS = 7;
const SUMMARY_OVER = 6;
const SHOW_ON_HOME_DAYS = 3;
const ADULT = ["OWNER", "PARENT", "ADULT"];

export type ChangeKind = "MOVED" | "TIME" | "CANCELLED" | "NEW_TEST" | "NEW" | "MANY";
export type ChangeAlert = {
  id: string; householdId: string; childId: string; reminderId: string | null; kind: ChangeKind;
  title: string; oldYmd: string | null; newYmd: string | null; oldTime: string | null; newTime: string | null;
  count: number | null; createdAt: Date; notifiedAt: Date | null;
};

let ensured: Promise<void> | null = null;
export function ensureChangeTables(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "change_alerts" ("id" TEXT NOT NULL, "householdId" TEXT NOT NULL, "childId" TEXT NOT NULL, "reminderId" TEXT, "kind" TEXT NOT NULL, "title" TEXT NOT NULL, "oldYmd" TEXT, "newYmd" TEXT, "oldTime" TEXT, "newTime" TEXT, "count" INTEGER, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "notifiedAt" TIMESTAMP(3), CONSTRAINT "change_alerts_pkey" PRIMARY KEY ("id"))`
      );
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "change_alerts_household_idx" ON "change_alerts"("householdId", "createdAt")`);
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "change_seen" ("userId" TEXT NOT NULL, "seenAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "change_seen_pkey" PRIMARY KEY ("userId"))`
      );
    })().catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}

// ── collecting during one sync ──────────────────────────────────────────────
type Pending = Omit<ChangeAlert, "id" | "householdId" | "childId" | "createdAt" | "notifiedAt" | "count">;

const stockholmYmd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const addDaysYmd = (ymd: string, n: number) => new Date(Date.parse(ymd + "T12:00:00Z") + n * 86400000).toISOString().slice(0, 10);

/** One per sync of one link. `firstSync` = the link had imported nothing yet. */
export class ChangeCollector {
  private items: Pending[] = [];
  private today = stockholmYmd(new Date());
  constructor(private householdId: string, private childId: string, private label: string, private firstSync: boolean) {}

  private soon(ymd: string | null, days = WATCH_DAYS) {
    return !!ymd && ymd >= this.today && ymd <= addDaysYmd(this.today, days);
  }

  /** An item already imported got a new date and/or time. */
  changed(reminderId: string, title: string, oldYmd: string, newYmd: string, oldTime: string | null, newTime: string | null) {
    if (this.firstSync) return;
    if (!this.soon(oldYmd) && !this.soon(newYmd)) return;
    if (oldYmd !== newYmd) this.items.push({ reminderId, kind: "MOVED", title, oldYmd, newYmd, oldTime, newTime });
    else if (oldTime !== newTime && newTime) this.items.push({ reminderId, kind: "TIME", title, oldYmd, newYmd, oldTime, newTime });
  }
  added(reminderId: string, title: string, ymd: string, time: string | null, isTest: boolean) {
    if (this.firstSync) return;
    if (isTest ? !this.soon(ymd) : !this.soon(ymd, NEW_ACTIVITY_DAYS)) return;
    this.items.push({ reminderId, kind: isTest ? "NEW_TEST" : "NEW", title, oldYmd: null, newYmd: ymd, oldTime: null, newTime: time });
  }
  removed(reminderId: string, title: string, ymd: string, time: string | null) {
    if (this.firstSync || !this.soon(ymd, NEW_ACTIVITY_DAYS)) return;
    this.items.push({ reminderId, kind: "CANCELLED", title, oldYmd: ymd, newYmd: null, oldTime: time, newTime: null });
  }

  /** Saves what was collected. Never throws — a sync must not fail because of this. */
  async save(): Promise<number> {
    if (!this.items.length) return 0;
    try {
      await ensureChangeTables();
      if (this.items.length > SUMMARY_OVER) {
        await prisma.$executeRaw`INSERT INTO "change_alerts" ("id", "householdId", "childId", "kind", "title", "count") VALUES (${randomUUID()}, ${this.householdId}, ${this.childId}, ${"MANY"}, ${this.label.slice(0, 200)}, ${this.items.length})`;
        return 1;
      }
      for (const it of this.items) {
        // Same change already recorded and not yet sent (e.g. "Sync now" twice) → skip.
        const dup = await prisma.$queryRaw<{ id: string }[]>`SELECT "id" FROM "change_alerts" WHERE "reminderId" = ${it.reminderId} AND "kind" = ${it.kind} AND COALESCE("newYmd", '') = ${it.newYmd ?? ""} AND COALESCE("newTime", '') = ${it.newTime ?? ""} AND "createdAt" > NOW() - INTERVAL '3 days' LIMIT 1`;
        if (dup.length) continue;
        await prisma.$executeRaw`INSERT INTO "change_alerts" ("id", "householdId", "childId", "reminderId", "kind", "title", "oldYmd", "newYmd", "oldTime", "newTime") VALUES (${randomUUID()}, ${this.householdId}, ${this.childId}, ${it.reminderId}, ${it.kind}, ${it.title.slice(0, 200)}, ${it.oldYmd}, ${it.newYmd}, ${it.oldTime}, ${it.newTime})`;
      }
      return this.items.length;
    } catch (err) {
      console.error("Change watch save failed:", err);
      return 0;
    }
  }
}

// ── text ────────────────────────────────────────────────────────────────────
type AssistMsgs = ReturnType<typeof getMessages>["assist"];
export function changeLine(a: Pick<ChangeAlert, "kind" | "title" | "oldYmd" | "newYmd" | "oldTime" | "newTime" | "count">, t: AssistMsgs, dateLocale: string): string {
  const day = (ymd: string | null) => ymd ? new Date(ymd + "T12:00:00Z").toLocaleDateString(dateLocale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) : "";
  switch (a.kind) {
    case "TIME": return t.chTime(a.title, a.newTime ?? "", a.oldTime, day(a.newYmd));
    case "MOVED": return t.chMoved(a.title, day(a.newYmd), a.newTime);
    case "CANCELLED": return t.chCancelled(a.title, day(a.oldYmd));
    case "NEW_TEST": return t.chNewTest(a.title, day(a.newYmd));
    case "NEW": return t.chNew(a.title, day(a.newYmd), a.newTime);
    case "MANY": return t.chMany(a.title, a.count ?? 0);
  }
}

// ── sending ─────────────────────────────────────────────────────────────────
/**
 * Push every change not yet sent. Adults get all of their family's changes,
 * a child gets their own. `householdId` limits it to one family (after
 * "Sync now"); `skipUserId` is the person who pressed it (they see the result).
 */
export async function notifyChanges(opts: { householdId?: string; skipUserId?: string } = {}): Promise<number> {
  let pushed = 0;
  try {
    await ensureChangeTables();
    const pending = opts.householdId
      ? await prisma.$queryRaw<ChangeAlert[]>`SELECT * FROM "change_alerts" WHERE "notifiedAt" IS NULL AND "householdId" = ${opts.householdId} ORDER BY "createdAt" ASC`
      : await prisma.$queryRaw<ChangeAlert[]>`SELECT * FROM "change_alerts" WHERE "notifiedAt" IS NULL ORDER BY "createdAt" ASC LIMIT 500`;
    if (!pending.length) return 0;
    const byHousehold = new Map<string, ChangeAlert[]>();
    for (const a of pending) byHousehold.set(a.householdId, [...(byHousehold.get(a.householdId) ?? []), a]);

    for (const [householdId, alerts] of Array.from(byHousehold.entries())) {
      const members = await prisma.householdMember.findMany({ where: { householdId }, include: { user: { select: { id: true, name: true, deletedAt: true } } } });
      const live = members.filter((m) => !m.user.deletedAt);
      const first = new Map(live.map((m) => [m.userId, (m.user.name ?? "").split(" ")[0]]));
      for (const m of live) {
        if (m.userId === opts.skipUserId) continue;
        const isAdult = ADULT.includes(m.role);
        const mine = alerts.filter((a) => isAdult || a.childId === m.userId);
        if (!mine.length) continue;
        const locale = await getLocaleForUser(m.userId);
        const t = getMessages(locale).assist;
        const lines = mine.map((a) => {
          const who = isAdult && a.childId !== m.userId ? `${first.get(a.childId) || "?"}: ` : "";
          return who + changeLine(a, t, DATE_LOCALES[locale]);
        });
        const shown = lines.slice(0, 4);
        if (lines.length > 4) shown.push(getMessages(locale).push.more(lines.length - 4));
        const reached = await sendPushToUser(m.userId, { title: t.changesPushTitle(mine.length), body: shown.join("\n"), url: "/dashboard#changes", tag: `changes-${alerts[alerts.length - 1].id}` }, "changes");
        if (reached) pushed++;
      }
      const ids = alerts.map((a) => a.id);
      await prisma.$executeRaw`UPDATE "change_alerts" SET "notifiedAt" = NOW() WHERE "id" = ANY(${ids}::text[])`;
    }
    // Old rows aren't needed after a month.
    await prisma.$executeRawUnsafe(`DELETE FROM "change_alerts" WHERE "createdAt" < NOW() - INTERVAL '30 days'`);
  } catch (err) {
    console.error("Change watch notify failed:", err);
  }
  return pushed;
}

// ── Home card ───────────────────────────────────────────────────────────────
export async function recentChangesFor(userId: string): Promise<{ alerts: ChangeAlert[]; seenAt: Date | null }> {
  await ensureChangeTables();
  const m = await prisma.householdMember.findFirst({ where: { userId }, select: { householdId: true, role: true } });
  if (!m) return { alerts: [], seenAt: null };
  const isAdult = ADULT.includes(m.role);
  const since = new Date(Date.now() - SHOW_ON_HOME_DAYS * 86400000);
  const seen = await prisma.$queryRaw<{ seenAt: Date }[]>`SELECT "seenAt" FROM "change_seen" WHERE "userId" = ${userId}`;
  const seenAt = seen[0]?.seenAt ?? null;
  const after = seenAt && seenAt > since ? seenAt : since;
  const alerts = isAdult
    ? await prisma.$queryRaw<ChangeAlert[]>`SELECT * FROM "change_alerts" WHERE "householdId" = ${m.householdId} AND "createdAt" > ${after} ORDER BY "createdAt" DESC LIMIT 20`
    : await prisma.$queryRaw<ChangeAlert[]>`SELECT * FROM "change_alerts" WHERE "householdId" = ${m.householdId} AND "childId" = ${userId} AND "createdAt" > ${after} ORDER BY "createdAt" DESC LIMIT 20`;
  return { alerts, seenAt };
}

export async function markChangesSeen(userId: string) {
  await ensureChangeTables();
  await prisma.$executeRaw`INSERT INTO "change_seen" ("userId", "seenAt") VALUES (${userId}, NOW()) ON CONFLICT ("userId") DO UPDATE SET "seenAt" = NOW()`;
}

/** GDPR: account deletion / export helpers. */
export async function deleteChangeDataForUser(userId: string) {
  try {
    await ensureChangeTables();
    await prisma.$executeRaw`DELETE FROM "change_alerts" WHERE "childId" = ${userId}`;
    await prisma.$executeRaw`DELETE FROM "change_seen" WHERE "userId" = ${userId}`;
  } catch (err) { console.error("deleteChangeDataForUser failed:", err); }
}
