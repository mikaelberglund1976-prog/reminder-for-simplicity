// Minimal RFC5545 (iCalendar) writer for the outbound "sync with your
// calendar" feed — see /api/calendar/feed/[token] and PRODUCT_SPEC.md 4b.19.
//
// Deliberately hand-rolled rather than a dependency: we only ever need to
// emit a flat list of all-day, non-negotiable events (no recurrence rules,
// no timezones, no attendees) — everything is pre-expanded to concrete
// dates by `lib/recurrence.ts` before it gets here. Free (no external
// service), and small enough that a library would add more surface area
// than it saves.
//
// All-day events are used throughout (DTSTART/DTEND with VALUE=DATE, no
// time-of-day) because nothing in this app stores a meaningful time-of-day
// today — the in-app calendar itself is day-granularity only (see
// dashboard/calendar/page.tsx). This avoids an entire class of timezone bugs.

export interface IcsEvent {
  /** Stable per-occurrence id, e.g. `reminder-abc123-2026-08-14`. */
  uid: string;
  title: string;
  /** The day this occurs on (time-of-day ignored). */
  date: Date;
  description?: string;
}

function foldLine(line: string): string {
  // RFC5545 §3.1: lines over 75 octets should be folded with a leading
  // space on the continuation. Our lines are short (titles/descriptions
  // are already capped elsewhere) so this is a defensive no-op in
  // practice, but keeps us spec-compliant if that ever changes.
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = " " + rest.slice(75);
  }
  parts.push(rest);
  return parts.join("\r\n");
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function toIcsDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function toIcsTimestamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/** Builds a complete VCALENDAR document (as text) from a list of events. */
export function buildIcsFeed(calendarName: string, events: IcsEvent[]): string {
  const now = toIcsTimestamp(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Reminder for Simplicity//Calendar Feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldLine(`X-WR-CALNAME:${escapeText(calendarName)}`),
    // Ask subscribing calendar apps to poll for changes every few hours —
    // most (Google/Apple) treat this as a hint rather than a guarantee, but
    // it's the only "how fresh should this be" signal an ICS feed has.
    "REFRESH-INTERVAL;VALUE=DURATION:PT4H",
    "X-PUBLISHED-TTL:PT4H",
  ];

  for (const ev of events) {
    const dtStart = toIcsDate(ev.date);
    const dtEnd = toIcsDate(addDays(ev.date, 1)); // exclusive end, per spec, for an all-day event
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.uid}@reminder-for-simplicity`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
    lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
    lines.push(foldLine(`SUMMARY:${escapeText(ev.title)}`));
    if (ev.description) lines.push(foldLine(`DESCRIPTION:${escapeText(ev.description)}`));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
