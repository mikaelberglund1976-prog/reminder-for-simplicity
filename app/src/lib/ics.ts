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
// Items without a time are all-day events (DTSTART/DTEND with VALUE=DATE);
// items with a time (since 2026-10-07) are timed events, see IcsEvent below.

// 2026-10-07: items can now carry a time of day (lib/reminderTimes.ts). An
// event with `startTime` is written as a timed event in Europe/Stockholm
// (TZID + a VTIMEZONE block, so phones show 17:30 local all year round);
// everything else stays an all-day event exactly as before.
export const ICS_TZID = "Europe/Stockholm";

export interface IcsEvent {
  /** Stable per-occurrence id, e.g. `reminder-abc123-2026-08-14`. */
  uid: string;
  title: string;
  /** The day this occurs on (time-of-day ignored). */
  date: Date;
  description?: string;
  /** "HH:MM" wall-clock start; omitted = all day. */
  startTime?: string | null;
  /** "HH:MM" wall-clock end; omitted = one hour after the start. */
  endTime?: string | null;
}

// Standard CET/CEST rules (EU: last Sunday of March / October).
const VTIMEZONE_STOCKHOLM = [
  "BEGIN:VTIMEZONE",
  `TZID:${ICS_TZID}`,
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "TZNAME:CEST",
  "DTSTART:19700329T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "TZNAME:CET",
  "DTSTART:19701025T030000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

function toIcsLocal(d: Date, hhmm: string): string {
  return `${toIcsDate(d)}T${hhmm.replace(":", "")}00`;
}

function plusOneHour(hhmm: string): { time: string; nextDay: boolean } {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  const total = h * 60 + m + 60;
  return { time: `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`, nextDay: total >= 24 * 60 };
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
    ...VTIMEZONE_STOCKHOLM,
  ];

  for (const ev of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.uid}@reminder-for-simplicity`);
    lines.push(`DTSTAMP:${now}`);
    if (ev.startTime) {
      const end = ev.endTime && ev.endTime > ev.startTime
        ? { time: ev.endTime, nextDay: false }
        : plusOneHour(ev.startTime);
      lines.push(`DTSTART;TZID=${ICS_TZID}:${toIcsLocal(ev.date, ev.startTime)}`);
      lines.push(`DTEND;TZID=${ICS_TZID}:${toIcsLocal(end.nextDay ? addDays(ev.date, 1) : ev.date, end.time)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${toIcsDate(ev.date)}`);
      lines.push(`DTEND;VALUE=DATE:${toIcsDate(addDays(ev.date, 1))}`); // exclusive end, per spec, for an all-day event
    }
    lines.push(foldLine(`SUMMARY:${escapeText(ev.title)}`));
    if (ev.description) lines.push(foldLine(`DESCRIPTION:${escapeText(ev.description)}`));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
