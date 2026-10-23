"use client";

// 2026-10-23 (row 52): shared custody / växelvis boende — PREPARED, NOT LIVE.
// The API answers 404 unless FEATURE_CUSTODY=true, and then this card renders
// nothing. Adults set, per child: pattern (7/7, 2-2-3, 2-2-5-5), first day with
// parent A, who A and B are (an adult in the family or a name), handover time.
// Shows the next two weeks as a strip so it's easy to check it's right.
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import { useI18n } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
type Parent = { userId: string | null; label: string | null };
type Schedule = { pattern: string; startYmd: string; handoverTime: string | null; a: Parent; b: Parent };
type Day = { ymd: string; side: "A" | "B"; handover: boolean; note: string | null };
type Child = { childId: string; name: string; schedule: Schedule | null; aName: string | null; bName: string | null; days: Day[] };
type Data = { canEdit: boolean; adults: { id: string; name: string }[]; patterns: string[]; children: Child[] };
type Draft = { pattern: string; startYmd: string; handoverTime: string; a: string; aLabel: string; b: string; bLabel: string };

const OTHER = "__other";

export default function CustodyCard() {
  const { m, dateLocale, err } = useI18n();
  const t = m.custody;
  const [data, setData] = useState<Data | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/family/custody").catch(() => null);
    if (!res?.ok) { setData(null); return; }
    setData(await res.json());
  }
  useEffect(() => { load(); }, []);
  if (!data || !data.canEdit || !data.children.length) return null;

  const patternLabel = (p: string) => (t.patterns as Record<string, string>)[p] ?? p;
  function start(c: Child) {
    const s = c.schedule;
    const pick = (p: Parent | undefined, fallback: string) => (p?.userId ? p.userId : p?.label ? OTHER : fallback);
    setDraft({
      pattern: s?.pattern ?? "weekly",
      startYmd: s?.startYmd ?? new Date().toISOString().slice(0, 10),
      handoverTime: s?.handoverTime ?? "",
      a: pick(s?.a, data!.adults[0]?.id ?? OTHER), aLabel: s?.a.label ?? "",
      b: pick(s?.b, data!.adults[1]?.id ?? OTHER), bLabel: s?.b.label ?? "",
    });
    setEditing(c.childId); setMsg(null);
  }
  async function save(c: Child) {
    if (!draft) return;
    setBusy(true); setMsg(null);
    const parent = (v: string, label: string) => (v === OTHER ? { label } : { userId: v });
    try {
      const res = await fetch("/api/family/custody", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        childId: c.childId, pattern: draft.pattern, startYmd: draft.startYmd, handoverTime: draft.handoverTime || null,
        a: parent(draft.a, draft.aLabel), b: parent(draft.b, draft.bLabel),
      }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(d.error ? err(d.error) : m.common.somethingWentWrong); return; }
      setEditing(null); setDraft(null);
      await load();
    } finally { setBusy(false); }
  }
  async function clear(c: Child) {
    setBusy(true);
    try { await fetch(`/api/family/custody?childId=${encodeURIComponent(c.childId)}`, { method: "DELETE" }); setEditing(null); await load(); }
    finally { setBusy(false); }
  }

  const parentSelect = (value: string, label: string, onPick: (v: string) => void, onLabel: (v: string) => void, title: string) => (
    <label style={lbl}>{title}
      <select value={value} onChange={(e) => onPick(e.target.value)} style={input}>
        {data.adults.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        <option value={OTHER}>{t.someoneElse}</option>
      </select>
      {value === OTHER && <input value={label} onChange={(e) => onLabel(e.target.value)} placeholder={t.namePlaceholder} maxLength={40} style={{ ...input, marginTop: 4 }} />}
    </label>
  );

  return (
    <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "14px 16px", margin: "0 0 20px", fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--tint-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🏠</span>
        <span style={{ flex: 1, fontSize: 14.5, fontWeight: 800, color: "var(--fg)" }}>{t.title}</span>
        <span style={{ fontSize: 10.5, fontWeight: 800, color: "var(--warning)", background: "var(--tint-warning)", borderRadius: 50, padding: "3px 8px" }}>{t.preview}</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6, lineHeight: 1.4 }}>{t.intro}</div>
      {data.children.map((c) => (
        <div key={c.childId} style={{ borderTop: "1px solid var(--border-soft)", padding: "12px 0 4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar userId={c.childId} name={c.name} size={30} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>{c.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                {c.schedule ? `${patternLabel(c.schedule.pattern)} · ${c.aName ?? "?"} / ${c.bName ?? "?"}${c.schedule.handoverTime ? ` · ${t.handoverAt(c.schedule.handoverTime)}` : ""}` : t.notSet}
              </div>
            </div>
            {editing !== c.childId && <button type="button" onClick={() => start(c)} style={soft}>{c.schedule ? m.common.edit : "+"}</button>}
          </div>

          {c.days.length > 0 && editing !== c.childId && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 3, marginTop: 8 }}>
              {c.days.map((d) => (
                <div key={d.ymd} title={`${d.ymd} · ${d.side === "A" ? c.aName : c.bName}${d.note ? ` (${d.note})` : ""}`} style={{
                  textAlign: "center", borderRadius: 8, padding: "4px 0", fontSize: 10.5, fontWeight: 700,
                  background: d.side === "A" ? "var(--tint-accent)" : "var(--tint-school)", color: "var(--fg-2)",
                  outline: d.handover ? "2px solid var(--accent)" : "none", outlineOffset: -2,
                }}>
                  <div style={{ textTransform: "capitalize" }}>{new Date(d.ymd + "T12:00:00Z").toLocaleDateString(dateLocale, { weekday: "narrow", timeZone: "UTC" })}</div>
                  <div>{d.side === "A" ? (c.aName ?? "A").slice(0, 3) : (c.bName ?? "B").slice(0, 3)}</div>
                </div>
              ))}
            </div>
          )}

          {editing === c.childId && draft && (
            <div style={{ marginTop: 10, background: "var(--surface-2)", borderRadius: 14, padding: 12, display: "grid", gap: 8 }}>
              <label style={lbl}>{t.pattern}
                <select value={draft.pattern} onChange={(e) => setDraft({ ...draft, pattern: e.target.value })} style={input}>
                  {data.patterns.map((p) => <option key={p} value={p}>{patternLabel(p)}</option>)}
                </select>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {parentSelect(draft.a, draft.aLabel, (v) => setDraft({ ...draft, a: v }), (v) => setDraft({ ...draft, aLabel: v }), t.parentA)}
                {parentSelect(draft.b, draft.bLabel, (v) => setDraft({ ...draft, b: v }), (v) => setDraft({ ...draft, bLabel: v }), t.parentB)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <label style={lbl}>{t.startDay}<input type="date" value={draft.startYmd} onChange={(e) => setDraft({ ...draft, startYmd: e.target.value })} style={input} /></label>
                <label style={lbl}>{t.handover}<input type="time" value={draft.handoverTime} onChange={(e) => setDraft({ ...draft, handoverTime: e.target.value })} style={input} /></label>
              </div>
              {msg && <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--danger)" }}>{msg}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                {c.schedule && <button type="button" onClick={() => clear(c)} disabled={busy} style={{ ...soft, color: "var(--danger)" }}>{t.remove}</button>}
                <button type="button" onClick={() => { setEditing(null); setDraft(null); }} style={{ ...soft, flex: 1 }}>{m.common.cancel}</button>
                <button type="button" onClick={() => save(c)} disabled={busy} style={{ ...soft, flex: 1, background: "var(--accent-bg)", color: "var(--on-accent)" }}>{t.save}</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

const input: React.CSSProperties = { width: "100%", minWidth: 0, padding: "8px 10px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 14, fontFamily: FONT, boxSizing: "border-box", background: "var(--surface)", color: "var(--fg)" };
const lbl: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 11.5, fontWeight: 700, color: "var(--muted)", minWidth: 0 };
const soft: React.CSSProperties = { background: "var(--surface-3)", color: "var(--fg-2)", border: "none", borderRadius: 50, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT };
