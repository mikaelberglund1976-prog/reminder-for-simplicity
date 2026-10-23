"use client";

// 2026-10-22: each child's timetable from the school links. Two things only
// (Mikael): the first lesson of the next school day — "08:20 Matte" — and,
// one tap away, the week's timetable. Lessons never show up anywhere else.
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import Avatar from "@/components/Avatar";
import { addDaysYmd, countsAsLesson, lessonName, mondayOf, nextFirstLesson, nextStart, type Lesson, type NextStart, type StartDay } from "@/lib/lessonPlan";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

/** childId → that child's lessons (this week and the next two) and day starts (next two weeks). */
export type Timetables = { lessons: Map<string, Lesson[]>; starts: Map<string, StartDay[]> };
export function useLessons(enabled = true): Timetables {
  const [data, setData] = useState<Timetables>({ lessons: new Map(), starts: new Map() });
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetch("/api/family/lessons")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d?.children) return;
        const kids = d.children as { id: string; lessons: Lesson[]; starts?: StartDay[] }[];
        setData({
          lessons: new Map(kids.filter((c) => c.lessons.length > 0).map((c) => [c.id, c.lessons])),
          starts: new Map(kids.filter((c) => (c.starts ?? []).length > 0).map((c) => [c.id, c.starts!])),
        });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [enabled]);
  return data;
}

function ymdLocal(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "I morgon", "I dag" or "Mån" for a day start (`short` = always the weekday, for under a photo). */
export function useStartLabel() {
  const { m, locale, dateLocale } = useI18n();
  const weekday = (day: string) => cap(new Date(day + "T12:00:00").toLocaleDateString(dateLocale, { weekday: "short" }).replace(".", ""), locale);
  return (f: NextStart, short = false) => short ? weekday(f.start.day)
    : f.when === "today" ? m.timetable.today
    : f.when === "tomorrow" ? m.timetable.tomorrow
    : weekday(f.start.day);
}

function cap(s: string, _l: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

/** The next school start for a child, or null. */
export function useNextStart(days: StartDay[] | undefined): NextStart | null {
  return useMemo(() => nextStart(days), [days]);
}

/**
 * Two short centred lines under a photo on Home: "Mån 08:20" / "Matte"
 * (2026-10-23, rows 54–55: the same format for every child — day, time,
 * lesson — and centred under the photo). A day off reads "Mån" / "Ledig".
 */
export function FirstLessonMini({ days }: { days: StartDay[] | undefined }) {
  const { locale, m } = useI18n();
  const label = useStartLabel();
  const f = useNextStart(days);
  if (!f) return null;
  const lang = locale === "sv" ? "sv" : "en";
  const second = f.start.off ? m.timetable.off : f.start.code ? lessonName(f.start.code, lang, true) : f.start.note ?? "";
  return (
    <span style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", width: "100%", lineHeight: 1.2, marginTop: -2 }}
      title={`${label(f)} ${f.start.off ? m.timetable.off : f.start.time}${f.start.code ? ` ${lessonName(f.start.code, lang)}` : ""}${f.start.note ? ` (${f.start.note})` : ""}`}>
      <span style={{ fontSize: 11, fontWeight: 800, color: "var(--fg)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
        {label(f, true)}{f.start.off ? "" : ` ${f.start.time}`}
      </span>
      {second && (
        <span style={{ fontSize: 10.5, fontWeight: 600, color: f.start.off ? "var(--success)" : "var(--muted)", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {second}
        </span>
      )}
    </span>
  );
}

/** One row: "🏫 I morgon 08:20 · Matte · ⏰ 07:20" — tap opens the week (when there is a timetable). */
export function FirstLessonRow({ days, onOpen, borderTop = true }: { days: StartDay[] | undefined; onOpen?: () => void; borderTop?: boolean }) {
  const { locale, m } = useI18n();
  const label = useStartLabel();
  const f = useNextStart(days);
  if (!f) return null;
  const lang = locale === "sv" ? "sv" : "en";
  const s = f.start;
  const text = [
    `${label(f)} ${s.off ? m.timetable.off.toLowerCase() : s.time}`,
    s.code && !s.off ? lessonName(s.code, lang) : null,
    s.note,
    s.wake && !s.off ? `⏰ ${s.wake}` : null,
  ].filter(Boolean).join(" · ");
  const inner = (
    <>
      <span aria-label={m.timetable.firstLesson} title={m.timetable.firstLesson} style={{ fontSize: 13, padding: "2px 7px", borderRadius: 50, flexShrink: 0, background: "var(--tint-school)" }}>🏫</span>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{text}</span>
      {onOpen && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", flexShrink: 0 }}>›</span>}
    </>
  );
  const style: React.CSSProperties = {
    boxSizing: "border-box", width: "100%", display: "flex", alignItems: "center", gap: 8,
    padding: "7px 0", borderTop: borderTop ? "1px solid var(--border-soft)" : "none", fontFamily: FONT,
  };
  if (!onOpen) return <div style={style}>{inner}</div>;
  return <button type="button" onClick={onOpen} aria-label={m.timetable.week} style={{ all: "unset", cursor: "pointer", ...style }}>{inner}</button>;
}

/** The week's timetable as a sheet: weekday chips, that day's lessons. */
export function WeekSheet({ childId, name, lessons, onClose }: { childId: string; name: string; lessons: Lesson[]; onClose: () => void }) {
  const { m, locale, dateLocale } = useI18n();
  const lang = locale === "sv" ? "sv" : "en";
  const today = ymdLocal();
  const first = nextFirstLesson(lessons);
  const [day, setDay] = useState<string>(() => first?.lesson.day ?? today);
  const monday = mondayOf(day);
  const days = Array.from({ length: 5 }, (_, i) => addDaysYmd(monday, i));
  const thisMonday = mondayOf(today);
  const hasLessons = new Set(lessons.map((l) => l.day));
  const list = lessons.filter((l) => l.day === day).sort((a, b) => a.start.localeCompare(b.start));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const weekBtn = (target: string, text: string) => (
    <button type="button" onClick={() => setDay(target === thisMonday && today >= thisMonday && today <= addDaysYmd(thisMonday, 4) ? today : target)} style={{
      border: "none", borderRadius: 50, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
      background: monday === target ? "var(--ink)" : "var(--surface-3)", color: monday === target ? "var(--surface)" : "var(--fg-2)",
    }}>{text}</button>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label={`${m.timetable.week} · ${name}`} onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(20,43,58,0.45)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center", fontFamily: FONT,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--surface)", width: "100%", maxWidth: "var(--content-max-width)", borderRadius: "22px 22px 0 0",
        padding: "14px 18px calc(22px + env(safe-area-inset-bottom))", maxHeight: "85vh", overflowY: "auto", boxSizing: "border-box",
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 12px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Avatar userId={childId} name={name} size={32} />
          <span style={{ fontSize: 17, fontWeight: 800, color: "var(--fg)", flex: 1 }}>{m.timetable.week} · {name}</span>
          <button type="button" onClick={onClose} aria-label={m.timetable.close} style={{ border: "none", background: "var(--surface-3)", color: "var(--fg-2)", width: 32, height: 32, borderRadius: "50%", fontSize: 16, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {weekBtn(thisMonday, m.timetable.thisWeek)}
          {weekBtn(addDaysYmd(thisMonday, 7), m.timetable.nextWeek)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 6, marginBottom: 14 }}>
          {days.map((d) => {
            const dt = new Date(d + "T12:00:00");
            const active = d === day;
            return (
              <button key={d} type="button" onClick={() => setDay(d)} style={{
                border: active ? "none" : "1px solid var(--border)", borderRadius: 12, padding: "7px 0", cursor: "pointer", fontFamily: FONT,
                background: active ? "var(--accent-bg)" : d === today ? "var(--tint-accent)" : "var(--surface)", color: active ? "var(--on-accent)" : "var(--fg)",
                opacity: hasLessons.has(d) || active ? 1 : 0.5,
              }}>
                <span style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{dt.toLocaleDateString(dateLocale, { weekday: "short" }).replace(".", "")}</span>
                <span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{dt.getDate()}</span>
              </button>
            );
          })}
        </div>
        {list.length === 0 ? (
          <div style={{ fontSize: 13.5, color: "var(--subtle)", padding: "18px 2px", textAlign: "center" }}>{m.timetable.noLessons}</div>
        ) : (
          <div style={{ border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            {list.map((l, i) => (
              <div key={`${l.start}-${l.code}-${i}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderTop: i ? "1px solid var(--border-soft)" : "none", opacity: countsAsLesson(l.code) ? 1 : 0.6 }}>
                <span style={{ width: 92, flexShrink: 0, fontSize: 13, fontWeight: 800, color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}>{l.start}{l.end ? `–${l.end}` : ""}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>{lessonName(l.code, lang)}</span>
                {l.room && <span style={{ fontSize: 12, color: "var(--muted)", flexShrink: 0 }}>{m.timetable.room(l.room)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
