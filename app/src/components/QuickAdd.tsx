"use client";

// 2026-10-11: "just write it" on Home (lib/quickAdd.ts). Type → preview with
// where each thing goes → one tap to add. Shopping words are instant (no AI).
// 2026-10-18 (spec §21–23): plain shopping words are added straight away
// ("Milk added to Groceries · Undo"); every add can be undone for a moment;
// the type can be corrected in the preview; nothing gets a made-up day —
// an item without one asks "When?".
// 2026-10-23 (row 56): a word we don't recognise ("aw" = after work) isn't
// put on the shopping list — the preview asks "Where does it go?" first.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { listName } from "@/lib/i18n/shoppingLabels";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
type QType = "SHOPPING" | "TEST" | "HOMEWORK" | "SCHOOL_OTHER" | "ACTIVITY" | "REMINDER";
type Item = { type: QType; title: string; date: string | null; startTime: string | null; endTime: string | null; subject: string | null; personId: string | null; listId: string | null; unsure?: boolean; confirmed?: boolean };
type Preview = { items: Item[]; people: { id: string; name: string }[]; lists: { id: string; name: string }[]; isAdult: boolean; full: boolean; me: string; confident?: boolean };
type Created = { shopping: string[]; reminders: string[] };
const TYPES: QType[] = ["SHOPPING", "REMINDER", "ACTIVITY", "TEST", "HOMEWORK", "SCHOOL_OTHER"];

const TYPE_STYLE: Record<QType, { bg: string; fg: string; emoji: string }> = {
  SHOPPING: { bg: "var(--tint-success)", fg: "var(--success)", emoji: "🛒" },
  TEST: { bg: "var(--tint-danger)", fg: "var(--danger)", emoji: "📝" },
  HOMEWORK: { bg: "var(--tint-school)", fg: "var(--school)", emoji: "📚" },
  SCHOOL_OTHER: { bg: "var(--tint-school)", fg: "var(--school)", emoji: "🏫" },
  ACTIVITY: { bg: "var(--tint-warning)", fg: "#D85A30", emoji: "⚽" },
  REMINDER: { bg: "var(--tint-accent)", fg: "var(--accent)", emoji: "🔔" },
};

export default function QuickAdd({ onAdded }: { onAdded?: () => void }) {
  const { m, err, dateLocale } = useI18n();
  const t = m.assist;
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string; undo?: Created } | null>(null);
  // 2026-10-24 (launch list row 60): a camera button for the weekly-letter
  // scan — only when scanning is switched on (ANTHROPIC_API_KEY in Vercel)
  // and this person may use it (an adult with Pro/trial). Hidden otherwise.
  const [canScan, setCanScan] = useState(false);
  useEffect(() => {
    fetch("/api/intake").then((r) => (r.ok ? r.json() : null)).then((d) => setCanScan(!!d?.configured && !!d?.available)).catch(() => {});
  }, []);

  const typeLabel = (k: QType) => ({ SHOPPING: t.qaShopping, TEST: t.qaTest, HOMEWORK: t.qaHomework, SCHOOL_OTHER: t.qaSchool, ACTIVITY: t.qaActivity, REMINDER: t.qaReminder })[k];

  async function read(e?: React.FormEvent) {
    e?.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true); setNote(null);
    try {
      const res = await fetch("/api/quick-add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setNote({ ok: false, text: err(data.error) }); return; }
      if (!data.items?.length) { setNote({ ok: false, text: t.qaNothing }); return; }
      if (data.confident) { await save(data); return; }
      setPreview(data);
    } catch { setNote({ ok: false, text: t.qaNothing }); }
    finally { setBusy(false); }
  }

  const dest = (it: Item, p: Preview, listName0: string | null) =>
    it.type === "SHOPPING" ? listName(listName0 ?? p.lists.find((l) => l.id === it.listId)?.name ?? p.lists[0]?.name ?? "", m)
      : it.type === "ACTIVITY" ? t.qaDestActivities
      : it.type === "REMINDER" ? t.qaDestReminders : t.qaDestSchool;

  async function save(p: Preview | null = preview) {
    if (!p?.items.length) return;
    setBusy(true);
    try {
      const res = await fetch("/api/quick-add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", items: p.items }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setNote({ ok: false, text: err(data.error) }); return; }
      const n = data.saved ?? 0;
      // Say where it went: "Milk added to Groceries".
      const first = p.items[0];
      const text = n === 0 ? t.qaAdded(0)
        : p.items.length === 1 ? t.qaAddedTo(first.title, dest(first, p, data.listName ?? null))
        : p.items.every((i) => i.type === "SHOPPING") ? t.qaAddedTo(p.items.map((i) => i.title).join(", "), dest(first, p, data.listName ?? null))
        : t.qaAddedMany(n);
      setNote({ ok: true, text: text + (data.locked ? ` ${t.qaLocked}` : ""), undo: n > 0 ? data.created : undefined });
      setPreview(null); setText("");
      onAdded?.();
      setTimeout(() => setNote((x) => (x?.ok ? null : x)), 8000);
    } finally { setBusy(false); }
  }

  async function undo(created: Created) {
    setBusy(true);
    try {
      await fetch("/api/quick-add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "undo", created }) });
      setNote({ ok: true, text: t.qaUndone });
      onAdded?.();
      setTimeout(() => setNote((x) => (x?.text === t.qaUndone ? null : x)), 3000);
    } finally { setBusy(false); }
  }

  const missingDay = !!preview?.items.some((it) => !it.unsure && it.type !== "SHOPPING" && !it.date);
  const unsure = !!preview?.items.some((it) => it.unsure);
  const place = (i: number, type: QType) => update(i, type === "SHOPPING"
    ? { type, unsure: false, confirmed: true, date: null, startTime: null, endTime: null, listId: preview?.items[i].listId ?? preview?.lists[0]?.id ?? null }
    : { type, unsure: false });
  const PLACES: QType[] = ["SHOPPING", "REMINDER", "ACTIVITY", "SCHOOL_OTHER"];
  const changeType = (i: number, type: QType) => update(i, type === "SHOPPING"
    ? { type, date: null, startTime: null, endTime: null, listId: preview?.items[i].listId ?? preview?.lists[0]?.id ?? null }
    : { type });

  const update = (i: number, patch: Partial<Item>) => setPreview((p) => p && { ...p, items: p.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const remove = (i: number) => setPreview((p) => { if (!p) return p; const items = p.items.filter((_, j) => j !== i); return items.length ? { ...p, items } : null; });
  const dayLabel = (ymd: string | null) => ymd ? new Date(ymd + "T12:00:00Z").toLocaleDateString(dateLocale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) : "";

  const pill = { fontSize: 12.5, fontWeight: 700, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--fg-2)", borderRadius: 50, padding: "4px 8px", fontFamily: FONT, maxWidth: 150 } as const;

  return (
    <div style={{ marginBottom: 22, fontFamily: FONT }}>
      <form onSubmit={read} style={{ display: "flex", gap: 8, background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 16, padding: 6, boxShadow: "var(--shadow)" }}>
        <input
          value={text} onChange={(e) => { setText(e.target.value); if (note && !note.ok) setNote(null); }}
          placeholder={t.qaPlaceholder} aria-label={t.qaPlaceholder} enterKeyHint="go" maxLength={500}
          style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 15, padding: "8px 8px", color: "var(--fg)", fontFamily: FONT }}
        />
        {canScan && (
          <Link href="/dashboard/intake" aria-label={m.home.quick.scan} title={m.home.quick.scan} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, borderRadius: 12, background: "var(--surface-3)", color: "var(--fg-2)", flexShrink: 0, textDecoration: "none" }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </Link>
        )}
        <button type="submit" disabled={busy || !text.trim()} style={{ border: "none", borderRadius: 12, padding: "0 16px", background: "var(--accent-bg)", color: "var(--on-accent)", fontSize: 14, fontWeight: 800, cursor: "pointer", opacity: busy || !text.trim() ? 0.5 : 1, fontFamily: FONT, flexShrink: 0 }}>
          {busy && !preview ? t.qaThinking : t.qaGo}
        </button>
      </form>

      {note && (
        <div role="status" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 700, marginTop: 8, color: note.ok ? "var(--success)" : "var(--danger)" }}>
          <span style={{ minWidth: 0 }}>{note.text}</span>
          {note.undo && (
            <button type="button" onClick={() => undo(note.undo!)} disabled={busy} style={{ border: "none", background: "none", padding: "2px 4px", color: "var(--accent)", fontSize: 13, fontWeight: 800, cursor: "pointer", textDecoration: "underline", fontFamily: FONT, flexShrink: 0 }}>
              {t.qaUndo}
            </button>
          )}
        </div>
      )}

      {preview && (
        <div style={{ marginTop: 10, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "6px 12px 12px", boxShadow: "var(--shadow)" }}>
          {preview.items.map((it, i) => {
            const s = TYPE_STYLE[it.type];
            return (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderTop: i === 0 ? "none" : "1px solid var(--border-soft)" }}>
                <span aria-hidden style={{ width: 32, height: 32, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{s.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input value={it.title} onChange={(e) => update(i, { title: e.target.value })} aria-label={typeLabel(it.type)}
                    style={{ width: "100%", border: "none", background: "transparent", fontSize: 15, fontWeight: 700, color: "var(--fg)", padding: 0, outline: "none", fontFamily: FONT }} />
                  {it.unsure ? (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--warning)", marginBottom: 6 }}>{t.qaWhere}</div>
                      <div role="group" aria-label={t.qaWhere} style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {PLACES.filter((k) => preview.full || k === "SHOPPING" || k === "REMINDER").map((k) => (
                          <button key={k} type="button" onClick={() => place(i, k)} style={{
                            border: "1px solid var(--border)", background: TYPE_STYLE[k].bg, color: TYPE_STYLE[k].fg, borderRadius: 50,
                            padding: "6px 11px", fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: FONT,
                          }}>{TYPE_STYLE[k].emoji} {k === "SCHOOL_OTHER" ? t.qaPlaceSchool : typeLabel(k)}</button>
                        ))}
                      </div>
                    </div>
                  ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, alignItems: "center" }}>
                    <select value={it.type} onChange={(e) => changeType(i, e.target.value as QType)} aria-label={t.qaType}
                      style={{ fontSize: 11.5, fontWeight: 800, padding: "3px 6px", borderRadius: 50, border: "none", background: s.bg, color: s.fg, fontFamily: FONT, cursor: "pointer" }}>
                      {TYPES.filter((k) => preview.full || k === "SHOPPING" || k === "REMINDER" || k === it.type).map((k) => <option key={k} value={k}>{typeLabel(k)}</option>)}
                    </select>
                    {it.type === "SHOPPING" ? (
                      preview.lists.length > 1 ? (
                        <select value={it.listId ?? ""} onChange={(e) => update(i, { listId: e.target.value })} style={pill} aria-label={t.qaShopping}>
                          {preview.lists.map((l) => <option key={l.id} value={l.id}>{listName(l.name, m)}</option>)}
                        </select>
                      ) : null
                    ) : (
                      <>
                        {it.date ? (
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--fg-2)" }}>{dayLabel(it.date)}{it.startTime ? ` ${it.startTime}${it.endTime ? `–${it.endTime}` : ""}` : ""}</span>
                        ) : (
                          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 800, color: "var(--warning)" }}>
                            {t.qaWhen}
                            <input type="date" onChange={(e) => update(i, { date: e.target.value || null })} style={{ ...pill, maxWidth: 160, borderColor: "var(--warning)" }} />
                          </label>
                        )}
                        {preview.isAdult && (
                          <select value={it.personId ?? ""} onChange={(e) => update(i, { personId: e.target.value || null })} style={pill} aria-label={t.qaFor}>
                            <option value="">{t.qaFor} {t.qaMe}</option>
                            {preview.people.filter((p) => p.id !== preview.me).map((p) => <option key={p.id} value={p.id}>{t.qaFor} {p.name}</option>)}
                          </select>
                        )}
                      </>
                    )}
                  </div>
                  )}
                </div>
                <button type="button" onClick={() => remove(i)} aria-label={t.qaRemove} style={{ border: "none", background: "none", color: "var(--subtle)", fontSize: 20, lineHeight: 1, cursor: "pointer", padding: 4 }}>×</button>
              </div>
            );
          })}
          {unsure && <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", margin: "4px 0 2px" }}>{t.qaUnsureHint}</div>}
          {missingDay && <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", margin: "4px 0 2px" }}>{t.qaNeedsDay}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button type="button" onClick={() => save()} disabled={busy || missingDay || unsure} style={{ flex: 1, border: "none", borderRadius: 12, padding: "12px 14px", background: "var(--accent-bg)", color: "var(--on-accent)", fontSize: 14.5, fontWeight: 800, cursor: busy || missingDay || unsure ? "not-allowed" : "pointer", fontFamily: FONT, opacity: busy || missingDay || unsure ? 0.5 : 1 }}>
              {t.qaAdd(preview.items.length)}
            </button>
            <button type="button" onClick={() => setPreview(null)} style={{ border: "none", borderRadius: 12, padding: "12px 14px", background: "var(--surface-3)", color: "var(--fg-2)", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
              {t.qaCancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
