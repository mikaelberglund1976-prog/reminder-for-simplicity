// 2026-10-03: SchoolSoft calendar subscription per child (Mikael: "prenumerera
// på alla uppgifter per barn", sync max once a day, an adult connects it and
// picks the child, one tap removes everything imported so you can re-sync with
// another scope — and things added by hand must stay).
//
// Storage — two self-creating tables (same pattern as media_images and
// parental_consents, so a deploy needs no manual database step):
//   school_feeds   — one row per child: the subscription link (secret, never
//                    sent to the browser), who connected it, last sync result.
//   school_imports — links an imported reminder (category SCHOOL) to the
//                    calendar entry's UID. `edited` = someone changed it in the
//                    app, so a sync no longer overwrites it; `hidden` = someone
//                    removed it, so a sync doesn't bring it back.
// Imported items are ordinary school items otherwise — they show up for the
// child, on School and on Home exactly like hand-made ones.
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getTimes, setTime } from "@/lib/reminderTimes";
import { parseWall } from "@/lib/activityFeeds";

export const SYNC_EVERY_MS = 20 * 60 * 60 * 1000; // daily cron; 20h so a slightly early run still syncs
export const MANUAL_SYNC_MIN_MS = 10 * 60 * 1000; // "Sync now" at most every 10 minutes
const PAST_DAYS = 14;
const FUTURE_DAYS = 120;
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_ITEMS = 400;

let ensured: Promise<void> | null = null;
export function ensureSchoolFeedTables(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "school_feeds" ("id" TEXT NOT NULL, "householdId" TEXT NOT NULL, "childId" TEXT NOT NULL, "url" TEXT NOT NULL, "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastSyncAt" TIMESTAMP(3), "lastStatus" TEXT, "lastCount" INTEGER, CONSTRAINT "school_feeds_pkey" PRIMARY KEY ("id"))`
      );
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "school_feeds_childId_key" ON "school_feeds"("childId")`);
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "school_imports" ("reminderId" TEXT NOT NULL, "childId" TEXT NOT NULL, "uid" TEXT NOT NULL, "edited" BOOLEAN NOT NULL DEFAULT false, "hidden" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "school_imports_pkey" PRIMARY KEY ("reminderId"))`
      );
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "school_imports_child_uid_key" ON "school_imports"("childId", "uid")`);
    })().catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}

export type FeedRow = {
  id: string; householdId: string; childId: string; url: string; createdById: string;
  createdAt: Date; lastSyncAt: Date | null; lastStatus: string | null; lastCount: number | null;
};
type ImportRow = { reminderId: string; childId: string; uid: string; edited: boolean; hidden: boolean };

// ── Link validation ─────────────────────────────────────────────────────────
// Only SchoolSoft links are fetched (the server fetches whatever is pasted,
// so an open URL would let anyone make our server call arbitrary addresses).
export function normalizeFeedUrl(raw: unknown): { url: string } | { error: string } {
  if (typeof raw !== "string" || !raw.trim()) return { error: "Paste the link from SchoolSoft" };
  let s = raw.trim();
  if (s.toLowerCase().startsWith("webcal://")) s = "https://" + s.slice(9);
  let u: URL;
  try { u = new URL(s); } catch { return { error: "That doesn't look like a link" }; }
  if (u.protocol !== "https:") return { error: "The link must start with https://" };
  const host = u.hostname.toLowerCase();
  if (host !== "schoolsoft.se" && !host.endsWith(".schoolsoft.se")) {
    return { error: "Only SchoolSoft links (…schoolsoft.se) can be connected for now" };
  }
  if (s.length > 2000) return { error: "The link is too long" };
  return { url: u.toString() };
}

export function maskUrl(url: string) {
  try { return new URL(url).hostname; } catch { return "schoolsoft.se"; }
}

// ── iCalendar parsing (VEVENT + VTODO) ──────────────────────────────────────
export type ParsedEntry = {
  uid: string; summary: string; description: string | null; categories: string[];
  date: Date; kind: "HOMEWORK" | "TEST" | "OTHER"; subject: string | null; isTodo: boolean;
  /** 2026-10-09: wall-clock start "HH:MM" in Stockholm, null = all day. */
  time: string | null;
};

// 2026-10-09: keep the lesson time for tests and events (e.g. "Prov 08:20").
// Deadlines at 00:00/23:59 and to-dos carry no useful time.
function entryTime(prop: { value: string } | undefined, isTodo: boolean): string | null {
  if (!prop || isTodo) return null;
  const w = parseWall(prop.value);
  if (!w?.time || w.time === "00:00" || w.time === "23:59") return null;
  return w.time;
}

function unescapeText(v: string) {
  return v.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
}

// Stockholm calendar date of a moment → stored as 10:00 UTC that day (school
// items only care about the day; 10:00 UTC is the same date in all of Europe).
function stockholmDay(d: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return new Date(parts + "T10:00:00.000Z");
}

function parseIcsDate(value: string, params: string): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, hh, mi, ss, z] = m;
  void params;
  if (!hh) return new Date(`${y}-${mo}-${d}T10:00:00.000Z`);
  if (z) return stockholmDay(new Date(`${y}-${mo}-${d}T${hh}:${mi}:${ss ?? "00"}Z`));
  // Local time (TZID or floating) — the date as written is the school's date.
  return new Date(`${y}-${mo}-${d}T10:00:00.000Z`);
}

const TEST_RE = /\b(prov(et)?|delprov|test(et)?|förhör(et)?|läxförhör|glosförhör|diagnos(en)?|nationella\s+prov|np|examination|tentamen|skrivning(en)?|exam|quiz)\b/i;
const HOMEWORK_RE = /\b(läxa|läxan|läxor|hemläxa|uppgift(en)?|inlämning(en)?|inlämningsuppgift|assignment|homework)\b/i;

// SchoolSoft subject names (Swedish) → the app's subject list.
const SUBJECT_MAP: [RegExp, string][] = [
  [/\b(matematik|matte)\b/i, "Maths"],
  [/\b(svenska som andraspråk|svenska)\b/i, "Swedish"],
  [/\bengelska\b/i, "English"],
  [/\b(biologi|fysik|kemi|naturorientering|teknik)\b/i, "Science"], [/\bNO\b/, "Science"],
  [/\bhistoria\b/i, "History"],
  [/\bgeografi\b/i, "Geography"],
  [/\breligion(skunskap)?\b/i, "Religion"],
  [/\b(samhällskunskap|samhällsorientering)\b/i, "Civics"], [/\bSO\b/, "Civics"],
  [/\bmusik\b/i, "Music"],
  [/\b(bild|slöjd)\b/i, "Art"],
  [/\b(idrott( och hälsa)?|idh)\b/i, "PE"],
  [/\bspanska\b/i, "Spanish"],
  [/\bfranska\b/i, "French"],
  [/\btyska\b/i, "German"],
];

export function guessSubject(...texts: (string | null | undefined)[]): string | null {
  const t = texts.filter(Boolean).join(" \n ");
  for (const [re, s] of SUBJECT_MAP) if (re.test(t)) return s;
  return null;
}

export function parseIcs(text: string): ParsedEntry[] {
  // Unfold continuation lines (RFC 5545 §3.1).
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const out: ParsedEntry[] = [];
  let cur: Record<string, { value: string; params: string }> | null = null;
  let type: "VEVENT" | "VTODO" | null = null;
  for (const line of lines) {
    if (/^BEGIN:(VEVENT|VTODO)$/i.test(line)) { cur = {}; type = line.toUpperCase().endsWith("VTODO") ? "VTODO" : "VEVENT"; continue; }
    if (/^END:(VEVENT|VTODO)$/i.test(line)) {
      if (cur && type) {
        const get = (k: string) => cur![k]?.value;
        const uid = get("UID");
        const summary = unescapeText(get("SUMMARY") ?? "");
        const dateProp = (type === "VTODO" && cur["DUE"]) ? cur["DUE"] : (cur["DUE"] ?? cur["DTSTART"]);
        const date = dateProp ? parseIcsDate(dateProp.value, dateProp.params) : null;
        const status = (get("STATUS") ?? "").toUpperCase();
        if (uid && summary && date && status !== "CANCELLED") {
          const description = get("DESCRIPTION") ? unescapeText(get("DESCRIPTION")!) : null;
          const categories = (get("CATEGORIES") ?? "").split(",").map((c) => unescapeText(c)).filter(Boolean);
          const hay = [summary, categories.join(" ")].join(" ");
          const kind: ParsedEntry["kind"] = TEST_RE.test(hay) ? "TEST"
            : (type === "VTODO" || HOMEWORK_RE.test(hay) || HOMEWORK_RE.test(description ?? "")) ? "HOMEWORK" : "OTHER";
          out.push({ uid: uid.trim().slice(0, 500), summary: summary.slice(0, 200), description: description ? description.slice(0, 1000) : null, categories, date, kind, subject: guessSubject(summary, categories.join(" "), description), isTodo: type === "VTODO", time: entryTime(dateProp, type === "VTODO") });
        }
      }
      cur = null; type = null; continue;
    }
    if (!cur) continue;
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const left = line.slice(0, idx);
    const [name, ...params] = left.split(";");
    const key = name.toUpperCase();
    if (!(key in cur)) cur[key] = { value: line.slice(idx + 1), params: params.join(";") };
  }
  return out;
}

// ── Fetch + sync ────────────────────────────────────────────────────────────
async function fetchFeed(url: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: { Accept: "text/calendar, */*" }, cache: "no-store" });
    if (!res.ok) throw new Error(res.status === 404 || res.status === 410 ? "SchoolSoft says the link no longer exists — create a new one" : `SchoolSoft answered ${res.status}`);
    const finalHost = new URL(res.url || url).hostname.toLowerCase();
    if (finalHost !== "schoolsoft.se" && !finalHost.endsWith(".schoolsoft.se")) throw new Error("The link redirected away from SchoolSoft");
    const text = await res.text();
    if (text.length > MAX_BYTES) throw new Error("The calendar is too big");
    if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error("The link didn't return a calendar");
    return text;
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw new Error("SchoolSoft didn't answer in time");
    throw err;
  } finally { clearTimeout(t); }
}

export type SyncResult = { ok: boolean; added: number; updated: number; removed: number; total: number; status: string };

export async function syncFeed(feed: FeedRow): Promise<SyncResult> {
  await ensureSchoolFeedTables();
  const now = new Date();
  let result: SyncResult;
  try {
    // The child must still be a child in this family, and the adult who
    // connected it must still exist (imported items are created as theirs).
    const [child, creator] = await Promise.all([
      prisma.householdMember.findFirst({ where: { householdId: feed.householdId, userId: feed.childId } }),
      prisma.user.findFirst({ where: { id: feed.createdById, deletedAt: null }, select: { id: true } }),
    ]);
    if (!child) {
      await prisma.$executeRaw`DELETE FROM "school_feeds" WHERE "id" = ${feed.id}`;
      return { ok: false, added: 0, updated: 0, removed: 0, total: 0, status: "Child no longer in the family — link removed" };
    }
    const ownerId = creator?.id
      ?? (await prisma.householdMember.findFirst({ where: { householdId: feed.householdId, role: { in: ["OWNER", "PARENT"] } }, select: { userId: true } }))?.userId
      ?? feed.createdById;

    const entries = parseIcs(await fetchFeed(feed.url));
    const from = new Date(now.getTime() - PAST_DAYS * 86400000);
    const to = new Date(now.getTime() + FUTURE_DAYS * 86400000);
    const inWindow = entries.filter((e) => e.date >= from && e.date <= to).slice(0, MAX_ITEMS);

    const existing = await prisma.$queryRaw<ImportRow[]>`SELECT "reminderId", "childId", "uid", "edited", "hidden" FROM "school_imports" WHERE "childId" = ${feed.childId}`;
    const byUid = new Map(existing.map((r) => [r.uid, r]));
    const seen = new Set<string>();
    let added = 0, updated = 0, removed = 0;

    for (const e of inWindow) {
      if (seen.has(e.uid)) continue;
      seen.add(e.uid);
      const imp = byUid.get(e.uid);
      if (imp) {
        if (imp.hidden || imp.edited) continue;
        const r = await prisma.reminder.findUnique({ where: { id: imp.reminderId }, select: { id: true, isActive: true, name: true, date: true, schoolKind: true, subject: true, note: true } });
        if (!r || !r.isActive) continue;
        const changed = r.name !== e.summary || r.date.getTime() !== e.date.getTime() || r.schoolKind !== e.kind || r.subject !== e.subject || (r.note ?? null) !== e.description;
        const oldTime = (await getTimes([r.id])).get(r.id)?.startTime ?? null;
        if (oldTime !== e.time) await setTime(r.id, { startTime: e.time });
        if (changed) {
          await prisma.reminder.update({ where: { id: r.id }, data: { name: e.summary, date: e.date, schoolKind: e.kind, subject: e.subject, note: e.description } });
          updated++;
        } else if (oldTime !== e.time) updated++;
        continue;
      }
      const created = await prisma.reminder.create({
        data: {
          name: e.summary, category: "SCHOOL", userId: ownerId, householdId: feed.householdId, assignedTo: feed.childId,
          recurrence: "ONCE", date: e.date, visibility: "HOUSEHOLD", requiresApproval: false, note: e.description,
          schoolKind: e.kind, subject: e.subject, showInCalendar: true, reminderDaysBefore: 1,
        },
        select: { id: true },
      });
      await prisma.$executeRaw`INSERT INTO "school_imports" ("reminderId", "childId", "uid") VALUES (${created.id}, ${feed.childId}, ${e.uid}) ON CONFLICT DO NOTHING`;
      if (e.time) await setTime(created.id, { startTime: e.time });
      added++;
    }

    // Gone from SchoolSoft (cancelled or moved out) → remove it here too, unless
    // someone edited it in the app, ticked it off, or it's already in the past.
    for (const imp of existing) {
      if (seen.has(imp.uid) || imp.edited || imp.hidden) continue;
      const r = await prisma.reminder.findUnique({ where: { id: imp.reminderId }, select: { id: true, isActive: true, date: true, completedAt: true } });
      if (!r || !r.isActive || r.completedAt || r.date < now || r.date > to) continue;
      await prisma.reminder.update({ where: { id: r.id }, data: { isActive: false } });
      removed++;
    }

    const total = await importedCount(feed.childId);
    result = { ok: true, added, updated, removed, total, status: "ok" };
  } catch (err) {
    console.error("School feed sync failed:", feed.id, err);
    result = { ok: false, added: 0, updated: 0, removed: 0, total: await importedCount(feed.childId).catch(() => 0), status: err instanceof Error ? err.message : "Sync failed" };
  }
  await prisma.$executeRaw`UPDATE "school_feeds" SET "lastSyncAt" = ${now}, "lastStatus" = ${result.status}, "lastCount" = ${result.total} WHERE "id" = ${feed.id}`;
  return result;
}

export async function importedCount(childId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*)::bigint AS n FROM "school_imports" i JOIN "reminders" r ON r."id" = i."reminderId" WHERE i."childId" = ${childId} AND i."hidden" = false AND r."isActive" = true`;
  return Number(rows[0]?.n ?? 0);
}

/** Daily, from lib/cron.ts — every feed not synced in the last ~day. */
export async function syncAllFeeds(): Promise<{ synced: number; failed: number }> {
  await ensureSchoolFeedTables();
  const cutoff = new Date(Date.now() - SYNC_EVERY_MS);
  const feeds = await prisma.$queryRaw<FeedRow[]>`SELECT * FROM "school_feeds" WHERE "lastSyncAt" IS NULL OR "lastSyncAt" < ${cutoff} ORDER BY "lastSyncAt" ASC NULLS FIRST LIMIT 200`;
  let synced = 0, failed = 0;
  for (const f of feeds) {
    const r = await syncFeed(f);
    if (r.ok) synced++; else failed++;
  }
  return { synced, failed };
}

export async function getFeedForChild(childId: string): Promise<FeedRow | null> {
  await ensureSchoolFeedTables();
  const rows = await prisma.$queryRaw<FeedRow[]>`SELECT * FROM "school_feeds" WHERE "childId" = ${childId} LIMIT 1`;
  return rows[0] ?? null;
}

export async function listFeeds(householdId: string): Promise<FeedRow[]> {
  await ensureSchoolFeedTables();
  return prisma.$queryRaw<FeedRow[]>`SELECT * FROM "school_feeds" WHERE "householdId" = ${householdId}`;
}

export async function saveFeed(householdId: string, childId: string, url: string, createdById: string): Promise<FeedRow> {
  await ensureSchoolFeedTables();
  const id = randomUUID();
  await prisma.$executeRaw`INSERT INTO "school_feeds" ("id", "householdId", "childId", "url", "createdById") VALUES (${id}, ${householdId}, ${childId}, ${url}, ${createdById})
    ON CONFLICT ("childId") DO UPDATE SET "url" = EXCLUDED."url", "householdId" = EXCLUDED."householdId", "createdById" = EXCLUDED."createdById", "lastSyncAt" = NULL, "lastStatus" = NULL`;
  return (await getFeedForChild(childId))!;
}

/** "Remove everything imported" — hand-made items are untouched. */
export async function clearImported(childId: string): Promise<number> {
  await ensureSchoolFeedTables();
  const n = await prisma.$executeRaw`UPDATE "reminders" SET "isActive" = false WHERE "id" IN (SELECT "reminderId" FROM "school_imports" WHERE "childId" = ${childId}) AND "isActive" = true`;
  await prisma.$executeRaw`DELETE FROM "school_imports" WHERE "childId" = ${childId}`;
  // Next "Sync now" should run right away after a reset.
  await prisma.$executeRaw`UPDATE "school_feeds" SET "lastSyncAt" = NULL, "lastCount" = 0 WHERE "childId" = ${childId}`;
  return n;
}

export async function deleteFeed(childId: string) {
  await ensureSchoolFeedTables();
  await prisma.$executeRaw`DELETE FROM "school_feeds" WHERE "childId" = ${childId}`;
}

// ── Helpers used by the school item routes ─────────────────────────────────
export async function importedIds(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  try {
    await ensureSchoolFeedTables();
    const rows = await prisma.$queryRaw<{ reminderId: string }[]>`SELECT "reminderId" FROM "school_imports" WHERE "reminderId" = ANY(${ids}::text[])`;
    return new Set(rows.map((r) => r.reminderId));
  } catch (err) {
    console.error("importedIds failed:", err);
    return new Set();
  }
}

export async function markImport(reminderId: string, field: "edited" | "hidden") {
  try {
    await ensureSchoolFeedTables();
    if (field === "edited") await prisma.$executeRaw`UPDATE "school_imports" SET "edited" = true WHERE "reminderId" = ${reminderId}`;
    else await prisma.$executeRaw`UPDATE "school_imports" SET "hidden" = true WHERE "reminderId" = ${reminderId}`;
  } catch (err) { console.error("markImport failed:", err); }
}
