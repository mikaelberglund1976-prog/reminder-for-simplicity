"use client";

// 2026-10-11: "just write it" on Home (lib/quickAdd.ts). Type → preview with
// where each thing goes → one tap to add. Shopping words are instant (no AI).
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { listName } from "@/lib/i18n/shoppingLabels";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
type QType = "SHOPPING" | "TEST" | "HOMEWORK" | "SCHOOL_OTHER" | "ACTIVITY" | "REMINDER";
type Item = { type: QType; title: string; date: string | null; startTime: string | null; endTime: string | null; subject: string | null; personId: string | null; listId: string | null };
type Preview = { items: Item[]; people: { id: string; name: string }[]; lists: { id: string; name: string }[]; isAdult: boolean; full: boolean; me: string };

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
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

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
      setPreview(data);
    } catch { setNote({ ok: false, text: t.qaNothing }); }
    finally { setBusy(false); }
  }

  async function save() {
    if (!preview?.items.length) return;
    setBusy(true);
    try {
      const res = await fetch("/api/quick-add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", items: preview.items }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setNote({ ok: false, text: err(data.error) }); return; }
      setNote({ ok: true, text: t.qaAdded(data.saved ?? 0) + (data.locked ? ` ${t.qaLocked}` : "") });
      setPreview(null); setText("");
      onAdded?.();
      setTimeout(() => setNote((n) => (n?.ok ? null : n)), 4000);
    } finally { setBusy(false); }
  }

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
        <button type="submit" disabled={busy || !text.trim()} style={{ border: "none", borderRadius: 12, padding: "0 16px", background: "var(--accent-bg)", color: "var(--on-accent)", fontSize: 14, fontWeight: 800, cursor: "pointer", opacity: busy || !text.trim() ? 0.5 : 1, fontFamily: FONT, flexShrink: 0 }}>
          {busy && !preview ? t.qaThinking : t.qaGo}
        </button>
      </form>

      {note && <div role="status" style={{ fontSize: 13, fontWeight: 700, marginTop: 8, color: note.ok ? "var(--success)" : "var(--danger)" }}>{note.text}</div>}

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
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 50, background: s.bg, color: s.fg }}>{typeLabel(it.type)}</span>
                    {it.type === "SHOPPING" ? (
                      preview.lists.length > 1 ? (
                        <select value={it.listId ?? ""} onChange={(e) => update(i, { listId: e.target.value })} style={pill} aria-label={t.qaShopping}>
                          {preview.lists.map((l) => <option key={l.id} value={l.id}>{listName(l.name, m)}</option>)}
                        </select>
                      ) : null
                    ) : (
                      <>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--fg-2)" }}>{dayLabel(it.date)}{it.startTime ? ` ${it.startTime}${it.endTime ? `–${it.endTime}` : ""}` : ""}</span>
                        {preview.isAdult && (
                          <select value={it.personId ?? ""} onChange={(e) => update(i, { personId: e.target.value || null })} style={pill} aria-label={t.qaFor}>
                            <option value="">{t.qaFor} {t.qaMe}</option>
                            {preview.people.filter((p) => p.id !== preview.me).map((p) => <option key={p.id} value={p.id}>{t.qaFor} {p.name}</option>)}
                          </select>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <button type="button" onClick={() => remove(i)} aria-label={t.qaRemove} style={{ border: "none", background: "none", color: "var(--subtle)", fontSize: 20, lineHeight: 1, cursor: "pointer", padding: 4 }}>×</button>
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button type="button" onClick={save} disabled={busy} style={{ flex: 1, border: "none", borderRadius: 12, padding: "12px 14px", background: "var(--accent-bg)", color: "var(--on-accent)", fontSize: 14.5, fontWeight: 800, cursor: "pointer", fontFamily: FONT, opacity: busy ? 0.6 : 1 }}>
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
