// 2026-10-24 (launch list row 63): imported activity titles are long —
// "Friidrott: Träning i Ursvik (Filip Berglund-Födda 2013) [JA]". On Home
// (adult and child, the same title in both places) they're shortened to
// "Friidrott · Träning · Ursvik". The time is shown in its own column, and
// the raw title stays untouched in the detail view (only the display changes).
// Client-safe, no imports.

const TAG = /\s*\[[^\]]{1,15}\]\s*/g;             // "[JA]", "[Ja]", "[Nej]"
const PARENS = /\s*\([^)]{0,80}\)\s*/g;           // "(Filip Berglund-Födda 2013)"
const KIND_AT = /^(träning|match|matcher|tävling|cup|läger|samling|möte|training|game|practice)\s+(?:i|på|vid|in|at)\s+(.+)$/i;

export function shortTitle(raw: string): string {
  if (!raw) return raw;
  let s = raw.replace(TAG, " ").replace(PARENS, " ").replace(/\s*(…|\.\.\.)\s*/g, " ").replace(/\s+/g, " ").trim();
  // "Label: rest" → keep both parts, joined the same way as the rest.
  let label: string | null = null;
  const colon = /^([^:]{2,40}):\s+(.+)$/.exec(s);
  if (colon) { label = colon[1].trim(); s = colon[2].trim(); }
  const at = KIND_AT.exec(s);
  if (at) s = `${cap(at[1])} · ${at[2].trim()}`;
  s = s.replace(/\s*[-–—,]\s*$/, "").trim();
  const out = label && !s.toLowerCase().startsWith(label.toLowerCase()) ? `${label} · ${s}` : s;
  return out || raw.trim();
}

function cap(w: string) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }
