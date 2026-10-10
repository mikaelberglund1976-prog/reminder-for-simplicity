// 2026-10-09/10: AI intake — a photo/screenshot/PDF of a school newsletter
// ("veckobrev"), a note from the club or a school email becomes SUGGESTED
// items that a parent reviews before anything is saved (utredning
// "AI-intag av veckobrev och skolmejl", 9 okt 2026).
//
// Privacy by design:
//  - Only the picture/PDF is sent to the AI — never names, accounts or other
//    family data. Which child an item is for is matched HERE, on our server,
//    from the words the AI read off the page (e.g. "Ella", "klass 2B").
//  - The file is not stored: it lives in memory for the one request.
//  - Off until ANTHROPIC_API_KEY is set in Vercel (the route answers 503).
// Model: Claude Haiku 5.5 by default (ANTHROPIC_MODEL overrides).
import { prisma } from "@/lib/prisma";

export type IntakeKind = "TEST" | "HOMEWORK" | "SCHOOL_OTHER" | "ACTIVITY" | "REMINDER";
export const INTAKE_KINDS: IntakeKind[] = ["TEST", "HOMEWORK", "SCHOOL_OTHER", "ACTIVITY", "REMINDER"];

export type IntakeSuggestion = {
  title: string;
  date: string;            // YYYY-MM-DD
  startTime: string | null; // HH:MM
  endTime: string | null;
  kind: IntakeKind;
  subject: string | null;
  note: string | null;      // incl. "bring: …"
  whoText: string | null;   // as written on the page ("Ella", "2B", "alla")
  childId: string | null;   // matched on our server
};

export const INTAKE_LIMIT_PER_MONTH = 100; // Pro/trial — a cap against abuse, not a product limit
export const MAX_BYTES = 3_500_000;        // after base64 decoding; Vercel's request limit is ~4.5 MB

export function intakeConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// ── usage counter (self-creating table, no DB step) ─────────────────────────
let ensured: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (!ensured) {
    ensured = prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "intake_usage" ("householdId" TEXT NOT NULL, "month" TEXT NOT NULL, "count" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "intake_usage_pkey" PRIMARY KEY ("householdId", "month"))`
    ).then(() => undefined).catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}
const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);

export async function usageThisMonth(householdId: string): Promise<number> {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<{ count: number }[]>(`SELECT "count" FROM "intake_usage" WHERE "householdId" = $1 AND "month" = $2`, householdId, monthKey());
  return rows[0]?.count ?? 0;
}
export async function countUsage(householdId: string) {
  await ensureTable();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "intake_usage" ("householdId", "month", "count") VALUES ($1, $2, 1) ON CONFLICT ("householdId", "month") DO UPDATE SET "count" = "intake_usage"."count" + 1`,
    householdId, monthKey()
  );
}

// ── the AI call ──────────────────────────────────────────────────────────────
const TOOL = {
  name: "save_suggestions",
  description: "Return every dated thing a family needs to remember from the document.",
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Short title in the document's language, max 60 characters, e.g. 'Utflykt till Skansen' or 'Prov i engelska'." },
            date: { type: "string", description: "YYYY-MM-DD. Resolve weekdays and 'nästa vecka' against today's date. For homework: the due date." },
            startTime: { type: ["string", "null"], description: "HH:MM 24h, or null if no time is given." },
            endTime: { type: ["string", "null"], description: "HH:MM 24h, or null." },
            kind: { type: "string", enum: ["TEST", "HOMEWORK", "SCHOOL_OTHER", "ACTIVITY", "REMINDER"], description: "TEST = prov/förhör/glosor; HOMEWORK = läxa/inlämning; SCHOOL_OTHER = other school event (utflykt, studiedag, föräldramöte, utvecklingssamtal, lov); ACTIVITY = sport/club training, match, cup, lesson outside school; REMINDER = anything else to remember (betala, anmälan senast, ta med pengar)." },
            subject: { type: ["string", "null"], description: "School subject if stated (e.g. 'Engelska'), else null." },
            note: { type: ["string", "null"], description: "One short line of useful detail, e.g. 'Ta med matsäck och regnkläder' or 'Kapitel 3, s. 40–52'. Null if nothing." },
            whoText: { type: ["string", "null"], description: "Who it applies to, exactly as written (a first name, a class like '2B', a team like 'P13'), or null if it applies to everyone the document is for." },
          },
          required: ["title", "date", "kind"],
        },
      },
    },
    required: ["items"],
  },
} as const;

function systemPrompt(today: string) {
  return [
    `Today is ${today} (Europe/Stockholm).`,
    "You read school newsletters (veckobrev), school emails, notes from sports clubs and similar documents for a Swedish family app.",
    "Extract every concrete, dated thing a parent or child needs to remember: tests, homework, excursions, days off, meetings, things to bring, deadlines, trainings and matches.",
    "Rules: only what the document actually states — never invent dates or times. Skip greetings, general information and anything with no date. If a weekday is mentioned without a date, use the next such day from today (or the week the document is about if it says so). Write titles in the document's language. Return at most 25 items.",
    "Always answer by calling save_suggestions.",
  ].join("\n");
}

type RawItem = { title?: unknown; date?: unknown; startTime?: unknown; endTime?: unknown; kind?: unknown; subject?: unknown; note?: unknown; whoText?: unknown };

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const hhmm = (v: unknown) => {
  const s = str(v, 5);
  const m = s && /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
};

export async function readDocument(file: { data: string; mediaType: string }, today: string): Promise<RawItem[]> {
  const isPdf = file.mediaType === "application/pdf";
  const block = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: file.data } }
    : { type: "image", source: { type: "base64", media_type: file.mediaType, data: file.data } };
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
      max_tokens: 2000,
      system: systemPrompt(today),
      tools: [TOOL],
      tool_choice: { type: "tool", name: TOOL.name },
      messages: [{ role: "user", content: [block, { type: "text", text: "Extract the dated items from this document." }] }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Intake: AI call failed", res.status, detail.slice(0, 500));
    throw new Error(res.status === 429 || res.status === 529 ? "The AI is busy right now — try again in a minute." : "Couldn't read the document. Try a sharper photo.");
  }
  const data = await res.json();
  const tool = (data.content ?? []).find((c: { type: string }) => c.type === "tool_use");
  const items = tool?.input?.items;
  return Array.isArray(items) ? items.slice(0, 25) : [];
}

/** Clean the AI's items and match "who" against the family's children — on our server. */
export function toSuggestions(raw: RawItem[], children: { id: string; name: string | null }[]): IntakeSuggestion[] {
  const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
  const out: IntakeSuggestion[] = [];
  for (const r of raw) {
    const title = str(r.title, 80);
    const date = str(r.date, 10);
    if (!title || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) continue;
    const kind = (INTAKE_KINDS as string[]).includes(String(r.kind)) ? (r.kind as IntakeKind) : "REMINDER";
    const whoText = str(r.whoText, 60);
    let childId: string | null = null;
    if (whoText) {
      const w = norm(whoText);
      const hit = children.filter((c) => c.name && w.split(/[\s,/&+]+/).includes(norm(c.name.split(" ")[0])));
      if (hit.length === 1) childId = hit[0].id;
    }
    if (!childId && children.length === 1 && kind !== "REMINDER") childId = children[0].id;
    let startTime = hhmm(r.startTime), endTime = hhmm(r.endTime);
    if (!startTime) endTime = null;
    if (startTime && endTime && endTime <= startTime) endTime = null;
    out.push({ title, date, startTime, endTime, kind, subject: str(r.subject, 40), note: str(r.note, 300), whoText, childId });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "").localeCompare(b.startTime ?? ""));
}
