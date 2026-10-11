// 2026-10-11 (Mikael: "nått ännu enklare för användarna"): one input row on
// Home. You just write — the app works out where it goes:
//   "mjölk, bröd"              → the shopping list
//   "mjölk på Hansla-listan"   → the list called Hansla
//   "tandläkare tis 14"        → a reminder Tuesday 14:00
//   "Elsa prov matte fredag"   → a test for Elsa on Friday (School)
//   "Leo match lör 10"         → an activity for Leo
// Nothing is saved until the person taps "Add" on the preview.
//
// Plain shopping words are understood here without AI. Anything with a day,
// a time or a school/activity word goes to Claude Haiku (same key as the
// newsletter scan, lib/intake.ts). Only the typed text and today's date are
// sent — names of the family and lists are matched on OUR server from the
// words the AI points out ("Elsa", "Hansla"), like the scan does.
import { prisma } from "@/lib/prisma";

export type QuickType = "SHOPPING" | "TEST" | "HOMEWORK" | "SCHOOL_OTHER" | "ACTIVITY" | "REMINDER";
export const QUICK_TYPES: QuickType[] = ["SHOPPING", "TEST", "HOMEWORK", "SCHOOL_OTHER", "ACTIVITY", "REMINDER"];
export const QUICK_LIMIT_PER_MONTH = 400; // a cap against abuse, not a product limit

export type QuickItem = {
  type: QuickType;
  title: string;
  date: string | null;       // YYYY-MM-DD (not for SHOPPING)
  startTime: string | null;
  endTime: string | null;
  subject: string | null;
  whoText: string | null;
  listText: string | null;
  personId: string | null;   // matched here
  listId: string | null;     // matched here (SHOPPING)
};

export function quickAiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// ── usage counter ───────────────────────────────────────────────────────────
let ensured: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (!ensured) {
    ensured = prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "quickadd_usage" ("householdId" TEXT NOT NULL, "month" TEXT NOT NULL, "count" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "quickadd_usage_pkey" PRIMARY KEY ("householdId", "month"))`
    ).then(() => undefined).catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}
const monthKey = () => new Date().toISOString().slice(0, 7);
export async function quickUsage(householdId: string): Promise<number> {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<{ count: number }[]>(`SELECT "count" FROM "quickadd_usage" WHERE "householdId" = $1 AND "month" = $2`, householdId, monthKey());
  return rows[0]?.count ?? 0;
}
export async function countQuickUsage(householdId: string) {
  await ensureTable();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "quickadd_usage" ("householdId", "month", "count") VALUES ($1, $2, 1) ON CONFLICT ("householdId", "month") DO UPDATE SET "count" = "quickadd_usage"."count" + 1`,
    householdId, monthKey()
  );
}

// ── without AI: plain shopping words ────────────────────────────────────────
const NEEDS_AI = /\d|\b(i dag|idag|imorgon|i morgon|övermorgon|måndag|tisdag|onsdag|torsdag|fredag|lördag|söndag|mån|tis|ons|tors|tor|fre|lör|sön|nästa|vecka|kl|klockan|prov|förhör|läxa|läxor|inlämning|träning|match|cup|tävling|möte|tandläkare|läkare|frisör|påminn|ring|betala|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun|next|week|test|homework|training|practice|game|meeting|dentist|doctor|remind|call|pay)\b/i;
const LIST_SUFFIX = /\s+(?:på|till|i|on|to|for)\s+(?:the\s+)?([A-Za-zÀ-ÿ\d][A-Za-zÀ-ÿ\d \-']{0,40}?)(?:-?\s*(?:listan|lista|list))?\s*$/i;

export function splitWords(text: string): string[] {
  return text.split(/,|;|\n|\s+och\s+|\s+and\s+|\s+\+\s+/i).map((s) => s.trim()).filter((s) => s.length > 0 && s.length <= 60).slice(0, 20);
}

/** Shopping-only input, or null if it needs the AI. */
export function parseLocally(text: string, splitList = true, allowDigits = false): { items: string[]; listText: string | null } | null {
  let t = text.trim().replace(/^(vi\s+)?(behöver|saknar|köp|köpa|handla|lägg till|need|buy|add)\s+/i, "");
  let listText: string | null = null;
  const m = splitList ? LIST_SUFFIX.exec(t) : null;
  if (m) { listText = m[1].trim(); t = t.slice(0, m.index); }
  if (NEEDS_AI.test(allowDigits ? t.replace(/\d+/g, "") : t)) return null;
  const items = splitWords(t).map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  if (!items.length || items.some((s) => s.split(/\s+/).length > 4)) return null;
  return { items, listText };
}

// ── with AI ─────────────────────────────────────────────────────────────────
const TOOL = {
  name: "save_items",
  description: "Return what the person wants to add to the family app.",
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: QUICK_TYPES, description: "SHOPPING = things to buy (one item per thing); TEST = prov/förhör/glosor; HOMEWORK = läxa/inlämning (date = due date); SCHOOL_OTHER = other school event; ACTIVITY = sport/club training, match, lesson outside school; REMINDER = anything else with a date (appointments, calls, bills)." },
            title: { type: "string", description: "Short title in the person's language, max 60 characters. For SHOPPING just the thing ('Mjölk'). For a test: 'Prov i matte'. Don't include the person's name, the day or the time in the title." },
            date: { type: ["string", "null"], description: "YYYY-MM-DD, resolved against today. A weekday means the next such day (today counts only if a later time today is given). Null for SHOPPING. If no day is given for a non-shopping item, use today." },
            startTime: { type: ["string", "null"], description: "HH:MM 24h. '14' or 'kl 14' = 14:00. Null if no time." },
            endTime: { type: ["string", "null"], description: "HH:MM or null." },
            subject: { type: ["string", "null"], description: "School subject for TEST/HOMEWORK if given (e.g. 'Matte'), else null." },
            whoText: { type: ["string", "null"], description: "The first name it's for, exactly as written, or null." },
            listText: { type: ["string", "null"], description: "For SHOPPING: the list named, e.g. 'Hansla' from 'på Hansla-listan'. Else null." },
          },
          required: ["type", "title"],
        },
      },
    },
    required: ["items"],
  },
} as const;

type Raw = { type?: unknown; title?: unknown; date?: unknown; startTime?: unknown; endTime?: unknown; subject?: unknown; whoText?: unknown; listText?: unknown };

export async function parseWithAi(text: string, today: string): Promise<Raw[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
      max_tokens: 800,
      system: [
        `Today is ${today} (Europe/Stockholm).`,
        "A parent or child in a Swedish family app typed a quick note. Turn it into items to add. Usually Swedish, sometimes English.",
        "Only what the note says — never invent items, days or times. At most 15 items.",
        "Always answer by calling save_items.",
      ].join("\n"),
      tools: [TOOL],
      tool_choice: { type: "tool", name: TOOL.name },
      messages: [{ role: "user", content: text.slice(0, 500) }],
    }),
  });
  if (!res.ok) {
    console.error("Quick add: AI call failed", res.status, (await res.text().catch(() => "")).slice(0, 300));
    throw new Error(res.status === 429 || res.status === 529 ? "The AI is busy right now — try again in a minute." : "Couldn't understand that — try fewer words.");
  }
  const data = await res.json();
  const tool = (data.content ?? []).find((c: { type: string }) => c.type === "tool_use");
  return Array.isArray(tool?.input?.items) ? tool.input.items.slice(0, 15) : [];
}

// ── matching on our server ──────────────────────────────────────────────────
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/(-?listan|-?lista|-?list)$/, "").trim();
const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const hhmm = (v: unknown) => {
  const s = str(v, 5);
  const m = s && /^(\d{1,2})(?::(\d{2}))?$/.exec(s);
  if (!m || +m[1] > 23 || +(m[2] ?? 0) > 59) return null;
  return `${m[1].padStart(2, "0")}:${m[2] ?? "00"}`;
};

export function matchPerson(whoText: string | null, people: { id: string; name: string | null }[]): string | null {
  if (!whoText) return null;
  const w = norm(whoText);
  const hit = people.filter((p) => p.name && norm(p.name.split(" ")[0]) === w);
  return hit.length === 1 ? hit[0].id : null;
}
export function matchList(listText: string | null, lists: { id: string; name: string }[], fallback: string | null): string | null {
  if (listText) {
    const w = norm(listText);
    const exact = lists.find((l) => norm(l.name) === w);
    if (exact) return exact.id;
    const part = lists.filter((l) => norm(l.name).includes(w) || w.includes(norm(l.name)));
    if (part.length === 1) return part[0].id;
  }
  return fallback;
}

export function toItems(raw: Raw[], people: { id: string; name: string | null }[], lists: { id: string; name: string }[], defaultListId: string | null, today: string): QuickItem[] {
  const out: QuickItem[] = [];
  for (const r of raw) {
    const type = (QUICK_TYPES as string[]).includes(String(r.type)) ? (r.type as QuickType) : "REMINDER";
    const title = str(r.title, 80);
    if (!title) continue;
    let date = type === "SHOPPING" ? null : str(r.date, 10);
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)))) date = null;
    if (type !== "SHOPPING" && !date) date = today;
    let startTime = type === "SHOPPING" ? null : hhmm(r.startTime);
    let endTime = startTime ? hhmm(r.endTime) : null;
    if (type === "TEST" || type === "HOMEWORK") endTime = null;
    if (startTime && endTime && endTime <= startTime) endTime = null;
    if (!startTime) { startTime = null; endTime = null; }
    const whoText = str(r.whoText, 40);
    const listText = str(r.listText, 40);
    out.push({
      type, title: title.charAt(0).toUpperCase() + title.slice(1), date, startTime, endTime,
      subject: str(r.subject, 40), whoText, listText,
      personId: matchPerson(whoText, people),
      listId: type === "SHOPPING" ? matchList(listText, lists, defaultListId) : null,
    });
  }
  return out;
}
