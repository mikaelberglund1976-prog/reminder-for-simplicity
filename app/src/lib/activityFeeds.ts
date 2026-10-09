// 2026-10-09 (Mikael: "per barn lägga upp synkningar från kalender också som
// skola … varje barn kunna lägga upp 3 stycken"): subscribe to up to three
// calendar links per child for activities — the football club's calendar in
// Laget.se / Spond / SportAdmin / IdrottOnline, a Google or Outlook calendar
// the coach shares, etc. Every training and match in the feed becomes an
// activity (category TRAINING) for that child, with its time and place.
//
// Works like the SchoolSoft import (lib/schoolFeeds.ts): an adult connects
// it, it syncs once a day (plus "Sync now"), imported items can be edited or
// removed without a sync bringing the old version back, and one tap removes
// everything a link imported. Things added by hand are never touched.
//
// Storage — two self-creating tables (no manual database step on deploy):
//   activity_feeds   — one row per link (max 3 per child). The link itself is
//                      a secret and is never sent to the browser.
//   activity_imports — imported reminder ↔ feed + entry UID. `edited` /
//                      `hidden` as in school_imports.
//
// Unlike SchoolSoft any calendar host is allowed, so the fetch is guarded:
// http(s) only, and the host (and every redirect) must resolve to a public
// address — the server must not be usable to reach internal addresses.
import { randomUUID } from "crypto";
import { lookup } from "dns/promises";
import net from "net";
import { prisma } from "@/lib/prisma";
import { getTimes, setTime } from "@/lib/reminderTimes";

export const MAX_FEEDS_PER_CHILD = 3;
export const SYNC_EVERY_MS = 20 * 60 * 60 * 1000;
export const MANUAL_SYNC_MIN_MS = 10 * 60 * 1000;
const PAST_DAYS = 1;
const FUTURE_DAYS = 70;
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_ITEMS = 300;
const TZ = "Europe/Stockholm";

let ensured: Promise<void> | null = null;
export function ensureActivityFeedTables(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "activity_feeds" ("id" TEXT NOT NULL, "householdId" TEXT NOT NULL, "childId" TEXT NOT NULL, "url" TEXT NOT NULL, "label" TEXT, "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastSyncAt" TIMESTAMP(3), "lastStatus" TEXT, "lastCount" INTEGER, CONSTRAINT "activity_feeds_pkey" PRIMARY KEY ("id"))`
      );
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "activity_feeds_childId_idx" ON "activity_feeds"("childId")`);
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "activity_imports" ("reminderId" TEXT NOT NULL, "feedId" TEXT NOT NULL, "childId" TEXT NOT NULL, "uid" TEXT NOT NULL, "edited" BOOLEAN NOT NULL DEFAULT false, "hidden" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "activity_imports_pkey" PRIMARY KEY ("reminderId"))`
      );
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "activity_imports_feed_uid_key" ON "activity_imports"("feedId", "uid")`);
    })().catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}

export type ActivityFeedRow = {
  id: string; householdId: string; childId: string; url: string; label: string | null; createdById: string;
  createdAt: Date; lastSyncAt: Date | null; lastStatus: string | null; lastCount: number | null;
};
type ImportRow = { reminderId: string; feedId: string; uid: string; edited: boolean; hidden: boolean };

// ── Link validation ─────────────────────────────────────────────────────────
export function normalizeActivityUrl(raw: unknown): { url: string } | { error: string } {
  if (typeof raw !== "string" || !raw.trim()) return { error: "Paste the calendar link" };
  let s = raw.trim();
  if (s.toLowerCase().startsWith("webcals://")) s = "https://" + s.slice(10);
  else if (s.toLowerCase().startsWith("webcal://")) s = "https://" + s.slice(9);
  let u: URL;
  try { u = new URL(s); } catch { return { error: "That doesn't look like a link" }; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { error: "The link must start with https://" };
  if (u.username || u.password) return { error: "That doesn't look like a link" };
  const host = u.hostname.toLowerCase();
  if (!host.includes(".") || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return { error: "That doesn't look like a link" };
  }
  if (net.isIP(host.replace(/^\[|\]$/g, ""))) return { error: "That doesn't look like a link" };
  if (s.length > 2000) return { error: "The link is too long" };
  return { url: u.toString() };
}

export function maskActivityUrl(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "calendar"; }
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map((n) => parseInt(n, 10));
    return a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 192 && b === 0)
      || (a === 198 && (b === 18 || b === 19));
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateIp(v6.slice(7));
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe8") || v6.startsWith("fe9") || v6.startsWith("fea") || v6.startsWith("feb") || v6.startsWith("ff");
}

async function assertPublicHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) throw new Error("The link points to an address we can't fetch");
  let addrs: { address: string }[];
  try { addrs = await lookup(host, { all: true }); } catch { throw new Error("Couldn't find that calendar address"); }
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error("The link points to an address we can't fetch");
}

async function fetchCalendar(url: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);
  try {
    let current = url;
    for (let hop = 0; hop < 5; hop++) {
      const u = new URL(current);
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("The link redirected somewhere we can't follow");
      await assertPublicHost(u.hostname);
      const res = await fetch(current, { signal: ctrl.signal, redirect: "manual", headers: { Accept: "text/calendar, */*", "User-Agent": "ReminderForSimplicity/1.0 (calendar sync)" }, cache: "no-store" });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) throw new Error("The calendar answered {n}".replace("{n}", String(res.status)));
        current = new URL(loc, current).toString();
        continue;
      }
      if (!res.ok) {
        if (res.status === 404 || res.status === 410) throw new Error("The calendar link no longer exists — get a new one");
        if (res.status === 401 || res.status === 403) throw new Error("The calendar is private — get a link that can be shared");
        throw new Error(`The calendar answered ${res.status}`);
      }
      const len = Number(res.headers.get("content-length") ?? 0);
      if (len > MAX_BYTES) throw new Error("The calendar is too big");
      const text = await res.text();
      if (text.length > MAX_BYTES) throw new Error("The calendar is too big");
      if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error("The link didn't return a calendar");
      return text;
    }
    throw new Error("The link redirected too many times");
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw new Error("The calendar didn't answer in time");
    throw err;
  } finally { clearTimeout(t); }
}

// ── iCalendar parsing with times + simple recurrence ───────────────────────
type Ymd = string; // "2026-10-09"
type WallTime = { ymd: Ymd; time: string | null }; // time "HH:MM", null = all day
type Prop = { value: string; params: string };

export type ActivityEntry = {
  uid: string; summary: string; location: string | null;
  ymd: Ymd; startTime: string | null; endTime: string | null;
};

function unescapeText(v: string) {
  return v.replace(/\\n/gi, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").replace(/\s+/g, " ").trim();
}

function stockholmWall(d: Date): WallTime {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const g = (k: string) => parts.find((p) => p.type === k)?.value ?? "00";
  return { ymd: `${g("year")}-${g("month")}-${g("day")}`, time: `${g("hour")}:${g("minute")}` };
}

/** DTSTART/DTEND value → wall-clock date + time in the family's time zone. */
export function parseWall(value: string): WallTime | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, hh, mi, ss, z] = m;
  if (!hh) return { ymd: `${y}-${mo}-${d}`, time: null };
  if (z) return stockholmWall(new Date(`${y}-${mo}-${d}T${hh}:${mi}:${ss ?? "00"}Z`));
  // TZID=… or floating: the time as written is the local time.
  return { ymd: `${y}-${mo}-${d}`, time: `${hh}:${mi}` };
}

function ymdToUtc(ymd: Ymd): number { return Date.parse(ymd + "T00:00:00Z"); }
function utcToYmd(ms: number): Ymd { return new Date(ms).toISOString().slice(0, 10); }
const DAY = 86400000;
const BYDAY_NUM: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

function addMinutes(time: string, minutes: number): string | null {
  const [h, m] = time.split(":").map((n) => parseInt(n, 10));
  const total = h * 60 + m + minutes;
  if (total >= 24 * 60 || total <= h * 60 + m) return null;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function durationMinutes(v: string | undefined): number | null {
  if (!v) return null;
  const m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:\d+S)?)?$/.exec(v.trim());
  if (!m) return null;
  return (parseInt(m[1] ?? "0") * 7 * 24 * 60) + (parseInt(m[2] ?? "0") * 24 * 60) + (parseInt(m[3] ?? "0") * 60) + parseInt(m[4] ?? "0");
}

/** Occurrence dates (wall-clock) of an RRULE between `from` and `to` (inclusive). */
function expandRule(rule: string, start: Ymd, from: Ymd, to: Ymd): Ymd[] {
  const parts = Object.fromEntries(rule.split(";").map((p) => { const [k, v] = p.split("="); return [k.toUpperCase(), (v ?? "").toUpperCase()]; }));
  const freq = parts.FREQ;
  if (!["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq)) return [];
  const interval = Math.max(1, parseInt(parts.INTERVAL ?? "1", 10) || 1);
  const count = parts.COUNT ? parseInt(parts.COUNT, 10) : null;
  const untilWall = parts.UNTIL ? parseWall(parts.UNTIL) : null;
  const startMs = ymdToUtc(start);
  const fromMs = ymdToUtc(from);
  let endMs = ymdToUtc(to);
  if (untilWall) endMs = Math.min(endMs, ymdToUtc(untilWall.ymd));
  const startDate = new Date(startMs);
  const byDay = (parts.BYDAY ?? "").split(",").map((d) => d.trim()).filter(Boolean);
  // Monthly/yearly "2nd Saturday"-style rules aren't supported — only the first date.
  if ((freq === "MONTHLY" || freq === "YEARLY") && byDay.length) return startMs >= fromMs && startMs <= endMs ? [start] : [];
  const weekDays = freq === "WEEKLY"
    ? (byDay.length ? byDay.map((d) => BYDAY_NUM[d.replace(/^[+-]?\d+/, "")]).filter((n) => n !== undefined) : [startDate.getUTCDay()])
    : [];
  const startMonday = startMs - ((startDate.getUTCDay() + 6) % 7) * DAY;
  const out: Ymd[] = [];
  let n = 0;
  for (let ms = startMs, i = 0; ms <= endMs && i < 4000; ms += DAY, i++) {
    const d = new Date(ms);
    let hit = false;
    const diffDays = Math.round((ms - startMs) / DAY);
    if (freq === "DAILY") hit = diffDays % interval === 0;
    else if (freq === "WEEKLY") hit = weekDays.includes(d.getUTCDay()) && Math.floor(Math.round((ms - startMonday) / DAY) / 7) % interval === 0;
    else if (freq === "MONTHLY") {
      const months = (d.getUTCFullYear() - startDate.getUTCFullYear()) * 12 + d.getUTCMonth() - startDate.getUTCMonth();
      hit = d.getUTCDate() === startDate.getUTCDate() && months % interval === 0;
    } else {
      hit = d.getUTCMonth() === startDate.getUTCMonth() && d.getUTCDate() === startDate.getUTCDate() && (d.getUTCFullYear() - startDate.getUTCFullYear()) % interval === 0;
    }
    if (!hit) continue;
    n++;
    if (count !== null && n > count) break;
    if (ms >= fromMs) out.push(utcToYmd(ms));
  }
  return out;
}

/** Every activity in the calendar that falls between `from` and `to`. */
export function parseActivities(text: string, from: Ymd, to: Ymd): ActivityEntry[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const events: { props: Record<string, Prop>; exdates: Ymd[] }[] = [];
  let cur: { props: Record<string, Prop>; exdates: Ymd[] } | null = null;
  let depth = 0; // ignore nested VALARM etc.
  for (const line of lines) {
    if (/^BEGIN:VEVENT$/i.test(line)) { cur = { props: {}, exdates: [] }; depth = 0; continue; }
    if (/^END:VEVENT$/i.test(line)) { if (cur) events.push(cur); cur = null; continue; }
    if (!cur) continue;
    if (/^BEGIN:/i.test(line)) { depth++; continue; }
    if (/^END:/i.test(line)) { depth = Math.max(0, depth - 1); continue; }
    if (depth > 0) continue;
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const [name, ...params] = line.slice(0, idx).split(";");
    const key = name.toUpperCase();
    const value = line.slice(idx + 1);
    if (key === "EXDATE") {
      for (const v of value.split(",")) { const w = parseWall(v); if (w) cur.exdates.push(w.ymd); }
      continue;
    }
    if (!(key in cur.props)) cur.props[key] = { value, params: params.join(";") };
  }

  // Moved/cancelled single occurrences of a recurring event (RECURRENCE-ID).
  const overridden = new Map<string, Set<Ymd>>();
  for (const e of events) {
    const rid = e.props["RECURRENCE-ID"];
    const uid = e.props.UID?.value?.trim();
    if (!rid || !uid) continue;
    const w = parseWall(rid.value);
    if (!w) continue;
    if (!overridden.has(uid)) overridden.set(uid, new Set());
    overridden.get(uid)!.add(w.ymd);
  }

  const out: ActivityEntry[] = [];
  for (const e of events) {
    const p = e.props;
    const uid = p.UID?.value?.trim();
    const summary = unescapeText(p.SUMMARY?.value ?? "");
    const start = p.DTSTART ? parseWall(p.DTSTART.value) : null;
    if (!uid || !summary || !start) continue;
    if ((p.STATUS?.value ?? "").toUpperCase() === "CANCELLED") continue;
    if ((p.TRANSP?.value ?? "").toUpperCase() === "TRANSPARENT" && !start.time && /^(v\.|vecka|week)\s*\d+$/i.test(summary)) continue;
    const location = p.LOCATION ? unescapeText(p.LOCATION.value).slice(0, 200) || null : null;

    let endTime: string | null = null;
    if (start.time) {
      const end = p.DTEND ? parseWall(p.DTEND.value) : null;
      if (end?.time && end.ymd === start.ymd && end.time > start.time) endTime = end.time;
      else if (!p.DTEND) { const mins = durationMinutes(p.DURATION?.value); if (mins) endTime = addMinutes(start.time, mins); }
    }

    const base = { summary: summary.slice(0, 200), location, startTime: start.time, endTime };
    const rid = p["RECURRENCE-ID"] ? parseWall(p["RECURRENCE-ID"].value) : null;
    if (rid) {
      if (start.ymd >= from && start.ymd <= to) out.push({ ...base, uid: `${uid}@${rid.ymd}`.slice(0, 500), ymd: start.ymd });
      continue;
    }
    const rrule = p.RRULE?.value;
    if (!rrule) {
      if (start.ymd >= from && start.ymd <= to) out.push({ ...base, uid: uid.slice(0, 500), ymd: start.ymd });
      continue;
    }
    const skip = new Set([...e.exdates, ...Array.from(overridden.get(uid) ?? [])]);
    for (const ymd of expandRule(rrule, start.ymd, from, to)) {
      if (skip.has(ymd)) continue;
      out.push({ ...base, uid: `${uid}@${ymd}`.slice(0, 500), ymd });
    }
  }
  out.sort((a, b) => a.ymd.localeCompare(b.ymd) || (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  return out;
}

function calendarName(text: string): string | null {
  const m = /^X-WR-CALNAME(?:;[^:]*)?:(.+)$/im.exec(text.replace(/\r\n/g, "\n"));
  return m ? unescapeText(m[1]).slice(0, 40) || null : null;
}

// ── Sync ────────────────────────────────────────────────────────────────────
export type ActivitySyncResult = { ok: boolean; added: number; updated: number; removed: number; total: number; status: string };

function displayName(summary: string, label: string | null): string {
  if (!label) return summary;
  return summary.toLowerCase().includes(label.toLowerCase()) ? summary : `${label}: ${summary}`.slice(0, 200);
}
const dayDate = (ymd: Ymd) => new Date(ymd + "T10:00:00.000Z");

export async function syncActivityFeed(feed: ActivityFeedRow): Promise<ActivitySyncResult> {
  await ensureActivityFeedTables();
  const now = new Date();
  let result: ActivitySyncResult;
  try {
    const [child, creator] = await Promise.all([
      prisma.householdMember.findFirst({ where: { householdId: feed.householdId, userId: feed.childId } }),
      prisma.user.findFirst({ where: { id: feed.createdById, deletedAt: null }, select: { id: true } }),
    ]);
    if (!child) {
      await prisma.$executeRaw`DELETE FROM "activity_feeds" WHERE "id" = ${feed.id}`;
      return { ok: false, added: 0, updated: 0, removed: 0, total: 0, status: "Child no longer in the family — link removed" };
    }
    const ownerId = creator?.id
      ?? (await prisma.householdMember.findFirst({ where: { householdId: feed.householdId, role: { in: ["OWNER", "PARENT"] } }, select: { userId: true } }))?.userId
      ?? feed.createdById;

    const text = await fetchCalendar(feed.url);
    if (!feed.label) {
      const name = calendarName(text);
      if (name) { feed.label = name; await prisma.$executeRaw`UPDATE "activity_feeds" SET "label" = ${name} WHERE "id" = ${feed.id}`; }
    }
    const todayYmd = stockholmWall(now).ymd;
    const from = utcToYmd(ymdToUtc(todayYmd) - PAST_DAYS * DAY);
    const to = utcToYmd(ymdToUtc(todayYmd) + FUTURE_DAYS * DAY);
    const entries = parseActivities(text, from, to).slice(0, MAX_ITEMS);

    const existing = await prisma.$queryRaw<ImportRow[]>`SELECT "reminderId", "feedId", "uid", "edited", "hidden" FROM "activity_imports" WHERE "feedId" = ${feed.id}`;
    const byUid = new Map(existing.map((r) => [r.uid, r]));
    const ids = existing.map((r) => r.reminderId);
    const [reminders, times] = await Promise.all([
      ids.length ? prisma.reminder.findMany({ where: { id: { in: ids } }, select: { id: true, isActive: true, name: true, date: true, note: true, assignedTo: true } }) : Promise.resolve([]),
      getTimes(ids),
    ]);
    const rById = new Map(reminders.map((r) => [r.id, r]));
    const seen = new Set<string>();
    let added = 0, updated = 0, removed = 0;

    for (const e of entries) {
      if (seen.has(e.uid)) continue;
      seen.add(e.uid);
      const name = displayName(e.summary, feed.label);
      const note = e.location ? `📍 ${e.location}` : null;
      const date = dayDate(e.ymd);
      const imp = byUid.get(e.uid);
      if (imp) {
        if (imp.hidden || imp.edited) continue;
        const r = rById.get(imp.reminderId);
        if (!r || !r.isActive) continue;
        const t = times.get(r.id);
        const changed = r.name !== name || r.date.getTime() !== date.getTime() || (r.note ?? null) !== note || r.assignedTo !== feed.childId;
        const timeChanged = (t?.startTime ?? null) !== e.startTime || (t?.endTime ?? null) !== e.endTime;
        if (changed) await prisma.reminder.update({ where: { id: r.id }, data: { name, date, note, assignedTo: feed.childId } });
        if (timeChanged) await setTime(r.id, { startTime: e.startTime, endTime: e.endTime });
        if (changed || timeChanged) updated++;
        continue;
      }
      const created = await prisma.reminder.create({
        data: {
          name, category: "TRAINING", userId: ownerId, householdId: feed.householdId, assignedTo: feed.childId,
          recurrence: "ONCE", date, visibility: "HOUSEHOLD", requiresApproval: false, note, reminderDaysBefore: 0,
        },
        select: { id: true },
      });
      if (e.startTime) await setTime(created.id, { startTime: e.startTime, endTime: e.endTime });
      await prisma.$executeRaw`INSERT INTO "activity_imports" ("reminderId", "feedId", "childId", "uid") VALUES (${created.id}, ${feed.id}, ${feed.childId}, ${e.uid}) ON CONFLICT DO NOTHING`;
      added++;
    }

    // Gone from the calendar (cancelled / moved out of range) → removed here
    // too, unless edited in the app or already in the past.
    for (const imp of existing) {
      if (seen.has(imp.uid) || imp.edited || imp.hidden) continue;
      const r = rById.get(imp.reminderId);
      if (!r || !r.isActive) continue;
      const ymd = r.date.toISOString().slice(0, 10);
      if (ymd < todayYmd || ymd > to) continue;
      await prisma.reminder.update({ where: { id: r.id }, data: { isActive: false } });
      removed++;
    }

    const total = await activityImportedCount(feed.id);
    result = { ok: true, added, updated, removed, total, status: "ok" };
  } catch (err) {
    console.error("Activity feed sync failed:", feed.id, err);
    result = { ok: false, added: 0, updated: 0, removed: 0, total: await activityImportedCount(feed.id).catch(() => 0), status: err instanceof Error ? err.message : "Sync failed" };
  }
  await prisma.$executeRaw`UPDATE "activity_feeds" SET "lastSyncAt" = ${now}, "lastStatus" = ${result.status}, "lastCount" = ${result.total} WHERE "id" = ${feed.id}`;
  return result;
}

/** Upcoming imported activities still active for a link. */
export async function activityImportedCount(feedId: string): Promise<number> {
  const today = new Date(stockholmWall(new Date()).ymd + "T00:00:00.000Z");
  const rows = await prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*)::bigint AS n FROM "activity_imports" i JOIN "reminders" r ON r."id" = i."reminderId" WHERE i."feedId" = ${feedId} AND i."hidden" = false AND r."isActive" = true AND r."date" >= ${today}`;
  return Number(rows[0]?.n ?? 0);
}

export async function syncAllActivityFeeds(): Promise<{ synced: number; failed: number }> {
  await ensureActivityFeedTables();
  const cutoff = new Date(Date.now() - SYNC_EVERY_MS);
  const feeds = await prisma.$queryRaw<ActivityFeedRow[]>`SELECT * FROM "activity_feeds" WHERE "lastSyncAt" IS NULL OR "lastSyncAt" < ${cutoff} ORDER BY "lastSyncAt" ASC NULLS FIRST LIMIT 200`;
  let synced = 0, failed = 0;
  for (const f of feeds) {
    const r = await syncActivityFeed(f);
    if (r.ok) synced++; else failed++;
  }
  return { synced, failed };
}

export async function listActivityFeeds(householdId: string): Promise<ActivityFeedRow[]> {
  await ensureActivityFeedTables();
  return prisma.$queryRaw<ActivityFeedRow[]>`SELECT * FROM "activity_feeds" WHERE "householdId" = ${householdId} ORDER BY "createdAt" ASC`;
}

export async function getActivityFeed(id: string): Promise<ActivityFeedRow | null> {
  await ensureActivityFeedTables();
  const rows = await prisma.$queryRaw<ActivityFeedRow[]>`SELECT * FROM "activity_feeds" WHERE "id" = ${id} LIMIT 1`;
  return rows[0] ?? null;
}

export async function countFeedsForChild(childId: string): Promise<number> {
  await ensureActivityFeedTables();
  const rows = await prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*)::bigint AS n FROM "activity_feeds" WHERE "childId" = ${childId}`;
  return Number(rows[0]?.n ?? 0);
}

export async function createActivityFeed(householdId: string, childId: string, url: string, label: string | null, createdById: string): Promise<ActivityFeedRow> {
  await ensureActivityFeedTables();
  const id = randomUUID();
  await prisma.$executeRaw`INSERT INTO "activity_feeds" ("id", "householdId", "childId", "url", "label", "createdById") VALUES (${id}, ${householdId}, ${childId}, ${url}, ${label}, ${createdById})`;
  return (await getActivityFeed(id))!;
}

export async function updateActivityFeed(id: string, patch: { url?: string; label?: string | null }) {
  await ensureActivityFeedTables();
  if (patch.url !== undefined) await prisma.$executeRaw`UPDATE "activity_feeds" SET "url" = ${patch.url}, "lastSyncAt" = NULL, "lastStatus" = NULL WHERE "id" = ${id}`;
  if (patch.label !== undefined) await prisma.$executeRaw`UPDATE "activity_feeds" SET "label" = ${patch.label} WHERE "id" = ${id}`;
}

/** Remove everything a link imported — hand-made activities are untouched. */
export async function clearActivityImports(feedId: string): Promise<number> {
  await ensureActivityFeedTables();
  const n = await prisma.$executeRaw`UPDATE "reminders" SET "isActive" = false WHERE "id" IN (SELECT "reminderId" FROM "activity_imports" WHERE "feedId" = ${feedId}) AND "isActive" = true`;
  await prisma.$executeRaw`DELETE FROM "activity_imports" WHERE "feedId" = ${feedId}`;
  await prisma.$executeRaw`UPDATE "activity_feeds" SET "lastSyncAt" = NULL, "lastCount" = 0 WHERE "id" = ${feedId}`;
  return n;
}

export async function deleteActivityFeed(feedId: string) {
  await ensureActivityFeedTables();
  await prisma.$executeRaw`DELETE FROM "activity_imports" WHERE "feedId" = ${feedId}`;
  await prisma.$executeRaw`DELETE FROM "activity_feeds" WHERE "id" = ${feedId}`;
}

// ── Helpers for the activity routes / cron ─────────────────────────────────
/** id → label of the link it came from ("" when the link has no label). */
export async function activityImportInfo(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!ids.length) return map;
  try {
    await ensureActivityFeedTables();
    const rows = await prisma.$queryRaw<{ reminderId: string; label: string | null; url: string }[]>`SELECT i."reminderId", f."label", f."url" FROM "activity_imports" i JOIN "activity_feeds" f ON f."id" = i."feedId" WHERE i."reminderId" = ANY(${ids}::text[])`;
    for (const r of rows) map.set(r.reminderId, r.label || maskActivityUrl(r.url));
  } catch (err) { console.error("activityImportInfo failed:", err); }
  return map;
}

export async function markActivityImport(reminderId: string, field: "edited" | "hidden") {
  try {
    await ensureActivityFeedTables();
    if (field === "edited") await prisma.$executeRaw`UPDATE "activity_imports" SET "edited" = true WHERE "reminderId" = ${reminderId}`;
    else await prisma.$executeRaw`UPDATE "activity_imports" SET "hidden" = true WHERE "reminderId" = ${reminderId}`;
  } catch (err) { console.error("markActivityImport failed:", err); }
}
