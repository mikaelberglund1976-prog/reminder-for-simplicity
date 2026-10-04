// 2026-10-04: API routes answer with English error texts ({ error: "..." }).
// Instead of threading the language through ~360 server messages, the screen
// that shows the error looks the English text up in the language's
// `serverErrors` table (messages/<lang>.ts) and falls back to the original.
// A new language only has to fill that table.
import type { Locale } from "./config";
import { getMessages } from "./messages";

export function translateError(locale: Locale, msg: unknown): string {
  const text = typeof msg === "string" ? msg : msg == null ? "" : String(msg);
  if (!text || locale === "en") return text;
  const table = getMessages(locale).serverErrors as Record<string, string>;
  const hit = table[text] ?? table[text.trim()];
  if (hit) return hit;
  // Messages with a number in them ("Try again in 5 minutes.") are stored
  // with {n} in place of the number.
  const n = text.match(/\d+/);
  if (n) {
    const templ = table[text.replace(n[0], "{n}")];
    if (templ) return templ.replace("{n}", n[0]);
  }
  return text;
}
