"use client";

// 2026-10-16 (Mikael: "som förälder vill du ju se vilken som är första
// lektionen så att man vet när barnen går upp"): when each child starts school,
// on the School page. Adults only — the card hides itself for anyone else.
// Same look and flow as the SchoolSoft / club-calendar cards.
//  - Mon–Fri first lesson, optionally A/B weeks, optional wake reminder.
//  - Exceptions: late start or day off for a date or a range (study day, break).
// Shown in the Tomorrow card and the evening push (lib/tomorrowPlan.ts).
// 2026-10-23: a child whose school link sends a timetable needs nothing typed
// in — the first lesson is used; typed-in times and exceptions win over it.
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import { useI18n } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

type Rule = { weekday: number; week: "" | "A" | "B"; time: string };
type Exception = { from: string; to: string; time: string | null; note: string | null; days: number };
type DayStart = { time: string | null; off: boolean; note: string | null; wake: string | null };
type Child = {
  childId: string; name: string; abWeeks: boolean; aIsOdd: boolean; wakeMinutes: number | null;
  rules: Rule[]; exceptions: Exception[]; today: DayStart | null; tomorrow: DayStart | null; thisWeek: "A" | "B" | null;
  /** 2026-10-23: the school link sends a timetable — used for days with no typed-in time. */
  fromTimetable?: boolean;
};
type Draft = { abWeeks: boolean; aIsOdd: boolean; wakeMinutes: number; times: Record<string, string> };

const key = (weekday: number, week: string) => `${weekday}${week}`;
function draftOf(c: Child): Draft {
  const times: Record<string, string> = {};
  for (const r of c.rules) times[key(r.weekday, r.week)] = r.time;
  return { abWeeks: c.abWeeks, aIsOdd: c.aIsOdd, wakeMinutes: c.wakeMinutes ?? 0, times };
}

export default function SchoolStartCard() {
  const { m, dateLocale, err } = useI18n();
  const t = m.schoolStart;
  const [rows, setRows] = useState<Child[] | null>(null);
  const [week, setWeek] = useState<number>(0);
  const [wakeOptions, setWakeOptions] = useState<number[]>([0, 30, 45, 60, 75, 90, 120]);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ key: string; text: string; tone: "ok" | "err" } | null>(null);
  const [exFor, setExFor] = useState<string | null>(null);
  const [ex, setEx] = useState({ from: "", to: "", off: true, time: "10:00", note: "" });

  async function load() {
    try {
      const res = await fetch("/api/family/school-start");
      if (!res.ok) { setHidden(true); return; }
      const d = await res.json();
      if (!d.canEdit) { setHidden(true); return; }
      setRows(d.children ?? []);
      setWeek(d.isoWeek ?? 0);
      if (Array.isArray(d.wakeOptions)) setWakeOptions(d.wakeOptions);
    } catch { setHidden(true); }
  }
  useEffect(() => { load(); }, []);

  if (hidden || !rows || rows.length === 0) return null;
  const setUp = rows.filter((r) => r.rules.length > 0 || r.fromTimetable).length;

  const dayLabel = (ymd: string) => new Date(ymd + "T12:00:00Z").toLocaleDateString(dateLocale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const startText = (s: DayStart | null) => (!s ? "–" : s.off ? t.off : `${s.time}${s.note ? ` (${s.note})` : ""}`);
  function summary(c: Child) {
    if (!c.rules.length) return c.fromTimetable ? t.fromTimetable : t.notSet;
    const pick = (wd: number) => c.rules.find((r) => r.weekday === wd && (c.abWeeks ? r.week === c.thisWeek : r.week === ""))?.time ?? "–";
    return t.weekdays.map((d, i) => `${d} ${pick(i + 1)}`).join(" · ");
  }

  async function save(c: Child) {
    if (!draft) return;
    setBusy(c.childId); setNote(null);
    const rules: Rule[] = [];
    for (let wd = 1; wd <= 5; wd++) {
      for (const w of draft.abWeeks ? (["A", "B"] as const) : ([""] as const)) {
        const v = draft.times[key(wd, w)];
        if (v) rules.push({ weekday: wd, week: w, time: v });
      }
    }
    try {
      const res = await fetch("/api/family/school-start", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ childId: c.childId, abWeeks: draft.abWeeks, aIsOdd: draft.aIsOdd, wakeMinutes: draft.wakeMinutes, rules }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setNote({ key: c.childId, text: d.error ? err(d.error) : m.common.somethingWentWrong, tone: "err" }); return; }
      setNote({ key: c.childId, text: t.saved, tone: "ok" });
      setEditing(null); setDraft(null);
      await load();
    } finally { setBusy(null); }
  }

  async function addException(c: Child) {
    setBusy(c.childId); setNote(null);
    try {
      const res = await fetch("/api/family/school-start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ childId: c.childId, from: ex.from, to: ex.to || ex.from, time: ex.off ? null : ex.time, note: ex.note }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setNote({ key: c.childId, text: d.error ? err(d.error) : m.common.somethingWentWrong, tone: "err" }); return; }
      setExFor(null);
      setEx({ from: "", to: "", off: true, time: "10:00", note: "" });
      await load();
    } finally { setBusy(null); }
  }

  async function removeException(c: Child, e: Exception) {
    setBusy(c.childId);
    try {
      await fetch(`/api/family/school-start?childId=${encodeURIComponent(c.childId)}&from=${e.from}&to=${e.to}`, { method: "DELETE" });
      await load();
    } finally { setBusy(null); }
  }

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, marginBottom: 20, fontFamily: FONT, overflow: "hidden" }}>
      <button onClick={() => setOpen((v) => !v)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: FONT }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--tint-school)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>🏫</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: "var(--fg)" }}>{t.title}</span>
          <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{setUp ? t.summarySet(setUp) : t.summaryNone}</span>
        </span>
        <span style={{ color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div style={{ padding: "0 16px 16px" }}>
          {rows.map((c) => {
            const isEditing = editing === c.childId && draft;
            return (
              <div key={c.childId} style={{ borderTop: "1px solid var(--border-soft)", padding: "12px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar userId={c.childId} name={c.name} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>{c.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{summary(c)}</div>
                    {(c.rules.length > 0 || c.fromTimetable) && (
                      <div style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 3 }}>
                        {t.today}: <b>{startText(c.today)}</b> · {t.tomorrow}: <b>{startText(c.tomorrow)}</b>{c.tomorrow?.wake ? ` · ⏰ ${c.tomorrow.wake}` : ""}
                      </div>
                    )}
                  </div>
                  {!isEditing && (
                    <button onClick={() => { setEditing(c.childId); setDraft(draftOf(c)); setNote(null); }} style={btnSoft}>{c.rules.length ? m.common.edit : c.fromTimetable ? t.override : "+"}</button>
                  )}
                </div>

                {isEditing && draft && (
                  <div style={{ marginTop: 10, background: "var(--surface-2)", borderRadius: 14, padding: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--fg)", marginBottom: 8, cursor: "pointer" }}>
                      <input type="checkbox" checked={draft.abWeeks} onChange={(e) => setDraft({ ...draft, abWeeks: e.target.checked })} style={{ width: 18, height: 18, accentColor: "var(--accent)" }} />
                      {t.abToggle}
                    </label>
                    {draft.abWeeks && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12.5, color: "var(--fg-2)", marginBottom: 8 }}>
                        <span>{t.aIsLabel}</span>
                        <select value={draft.aIsOdd ? "odd" : "even"} onChange={(e) => setDraft({ ...draft, aIsOdd: e.target.value === "odd" })} style={selectStyle}>
                          <option value="odd">{t.oddWeeks}</option>
                          <option value="even">{t.evenWeeks}</option>
                        </select>
                        <span style={{ color: "var(--muted)" }}>{t.nowWeek(week, week ? ((week % 2 === 1) === draft.aIsOdd ? "A" : "B") : null)}</span>
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: draft.abWeeks ? "44px 1fr 1fr" : "44px 1fr", gap: 6, alignItems: "center" }}>
                      {draft.abWeeks && (<><span /><span style={colHead}>{t.weekA}</span><span style={colHead}>{t.weekB}</span></>)}
                      {t.weekdays.map((d, i) => (
                        <Row key={d} label={d}>
                          {(draft.abWeeks ? (["A", "B"] as const) : ([""] as const)).map((w) => (
                            <input key={w} type="time" value={draft.times[key(i + 1, w)] ?? ""} aria-label={`${d} ${w}`}
                              onChange={(e) => setDraft({ ...draft, times: { ...draft.times, [key(i + 1, w)]: e.target.value } })}
                              style={inputStyle} />
                          ))}
                        </Row>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--subtle)", margin: "6px 0 10px", lineHeight: 1.4 }}>{c.fromTimetable ? t.emptyHintTimetable : t.emptyHint}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--fg)", marginBottom: 12 }}>
                      <span>⏰ {t.wake}</span>
                      <select value={draft.wakeMinutes} onChange={(e) => setDraft({ ...draft, wakeMinutes: Number(e.target.value) })} style={selectStyle}>
                        {wakeOptions.map((n) => <option key={n} value={n}>{n ? t.wakeMin(n) : t.wakeOff}</option>)}
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { setEditing(null); setDraft(null); }} style={{ ...btnSoft, flex: 1 }}>{m.common.cancel}</button>
                      <button onClick={() => save(c)} disabled={busy === c.childId} style={{ ...btnPrimary, flex: 1 }}>{busy === c.childId ? t.saving : t.save}</button>
                    </div>
                  </div>
                )}

                {/* Exceptions */}
                {(c.rules.length > 0 || c.exceptions.length > 0 || c.fromTimetable) && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{t.exceptions}</div>
                    {c.exceptions.length === 0 && exFor !== c.childId && <div style={{ fontSize: 12, color: "var(--subtle)", marginBottom: 6 }}>{t.exceptionsNone}</div>}
                    {c.exceptions.map((e) => (
                      <div key={e.from} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 13, color: "var(--fg)" }}>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <b>{dayLabel(e.from)}{e.to !== e.from ? ` – ${dayLabel(e.to)}` : ""}</b>{" · "}
                          <span style={{ color: e.time ? "var(--fg)" : "var(--success)", fontWeight: 700 }}>{e.time ? t.startsAt(e.time) : t.off}</span>
                          {e.note && <span style={{ color: "var(--muted)" }}> · {e.note}</span>}
                        </span>
                        <button onClick={() => removeException(c, e)} disabled={busy === c.childId} aria-label={t.remove} style={{ border: "none", background: "none", color: "var(--subtle)", fontSize: 18, cursor: "pointer", padding: 2 }}>×</button>
                      </div>
                    ))}
                    {exFor !== c.childId ? (
                      <button onClick={() => { setExFor(c.childId); setNote(null); }} style={{ ...btnSoft, marginTop: 4 }}>{t.addException}</button>
                    ) : (
                      <div style={{ marginTop: 6, background: "var(--surface-2)", borderRadius: 14, padding: 12 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <label style={labelStyle}>{t.from}<input type="date" value={ex.from} onChange={(e) => setEx({ ...ex, from: e.target.value })} style={inputStyle} /></label>
                          <label style={labelStyle}>{t.to}<input type="date" value={ex.to} min={ex.from || undefined} onChange={(e) => setEx({ ...ex, to: e.target.value })} style={inputStyle} /></label>
                        </div>
                        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", margin: "10px 0", fontSize: 13, color: "var(--fg)" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                            <input type="radio" checked={ex.off} onChange={() => setEx({ ...ex, off: true })} style={{ accentColor: "var(--accent)" }} /> {t.kindOff}
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                            <input type="radio" checked={!ex.off} onChange={() => setEx({ ...ex, off: false })} style={{ accentColor: "var(--accent)" }} /> {t.kindTime}
                          </label>
                          {!ex.off && <input type="time" value={ex.time} onChange={(e) => setEx({ ...ex, time: e.target.value })} style={{ ...inputStyle, width: 110 }} />}
                        </div>
                        <input value={ex.note} onChange={(e) => setEx({ ...ex, note: e.target.value })} placeholder={t.notePlaceholder} maxLength={60} style={{ ...inputStyle, marginBottom: 6 }} />
                        <div style={{ fontSize: 11, color: "var(--subtle)", marginBottom: 10 }}>{t.weekdaysOnly}</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => setExFor(null)} style={{ ...btnSoft, flex: 1 }}>{m.common.cancel}</button>
                          <button onClick={() => addException(c)} disabled={busy === c.childId || !ex.from || (!ex.off && !ex.time)} style={{ ...btnPrimary, flex: 1, opacity: !ex.from ? 0.5 : 1 }}>{t.add}</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {note && note.key === c.childId && (
                  <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: note.tone === "ok" ? "var(--success)" : "var(--danger)" }}>{note.text}</div>
                )}
              </div>
            );
          })}
          <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.45, borderTop: "1px solid var(--border-soft)", paddingTop: 10 }}>{t.footer}</div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (<><span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-2)" }}>{label}</span>{children}</>);
}

const inputStyle: React.CSSProperties = { width: "100%", minWidth: 0, padding: "9px 10px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 14, fontFamily: FONT, boxSizing: "border-box", background: "var(--surface)", color: "var(--fg)" };
const selectStyle: React.CSSProperties = { padding: "6px 8px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 13, fontFamily: FONT, background: "var(--surface)", color: "var(--fg)" };
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 11.5, fontWeight: 700, color: "var(--muted)", minWidth: 0 };
const colHead: React.CSSProperties = { fontSize: 11.5, fontWeight: 800, color: "var(--muted)", textAlign: "center" };
const btnPrimary: React.CSSProperties = { background: "var(--ink)", color: "var(--surface)", border: "none", borderRadius: 50, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT, flexShrink: 0 };
const btnSoft: React.CSSProperties = { background: "var(--surface-3)", color: "var(--fg-2)", border: "none", borderRadius: 50, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT };
