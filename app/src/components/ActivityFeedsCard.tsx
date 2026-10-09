"use client";

// 2026-10-09: up to three calendar links per child for activities (club /
// team calendars). Shown on the Activities page, adults only — the card hides
// itself for anyone else. Same look and flow as the SchoolSoft card.
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import { useI18n } from "@/lib/i18n/client";
import type { Messages } from "@/lib/i18n/messages";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

type Feed = { id: string; label: string | null; host: string; lastSyncAt: string | null; lastStatus: string | null; upcoming: number };
type ChildRow = { childId: string; name: string; feeds: Feed[] };
type SyncResult = { ok: boolean; added: number; updated: number; removed: number; total: number; status: string };

function when(iso: string | null, m: Messages, dateLocale: string) {
  if (!iso) return m.schoolsoft.notYet;
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return (today ? m.schoolsoft.todayPrefix : d.toLocaleDateString(dateLocale, { day: "numeric", month: "short" }) + " ") + d.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
}

export default function ActivityFeedsCard({ onChanged }: { onChanged?: () => void }) {
  const [rows, setRows] = useState<ChildRow[] | null>(null);
  const [max, setMax] = useState(3);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [addFor, setAddFor] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ key: string; text: string; tone: "ok" | "err" } | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const { m: i18n, dateLocale, err } = useI18n();
  const t = i18n.activityFeeds;
  const s = i18n.schoolsoft;

  async function load() {
    try {
      const res = await fetch("/api/family/activity-feeds");
      if (!res.ok) { setHidden(true); return; }
      const d = await res.json();
      setRows(d.children ?? []);
      if (d.max) setMax(d.max);
    } catch { setHidden(true); }
  }
  useEffect(() => { load(); }, []);

  function resultText(r: SyncResult) {
    if (!r.ok) return err(r.status);
    const parts = [r.added && s.newN(r.added), r.updated && s.updatedN(r.updated), r.removed && s.removedN(r.removed)].filter(Boolean);
    return parts.length ? s.synced(parts.join(", ")) : s.syncedNothing;
  }

  async function after() { await load(); onChanged?.(); }

  async function add(childId: string) {
    setBusy(childId); setNote(null);
    try {
      const res = await fetch("/api/family/activity-feeds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ childId, url, label }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setNote({ key: childId, text: d.error ? err(d.error) : s.couldNotConnect, tone: "err" }); return; }
      setNote({ key: childId, text: d.result?.ok ? t.connected(resultText(d.result)) : t.savedBut(d.result?.status ? err(d.result.status) : s.syncFailed), tone: d.result?.ok ? "ok" : "err" });
      setUrl(""); setLabel(""); setAddFor(null);
      await after();
    } finally { setBusy(null); }
  }

  async function action(childId: string, feed: Feed, act: "sync" | "clear") {
    if (act === "clear" && !window.confirm(t.clearConfirm)) return;
    setBusy(feed.id); setNote(null);
    try {
      const res = await fetch(`/api/family/activity-feeds/${encodeURIComponent(feed.id)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: act }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setNote({ key: childId, text: d.error ? err(d.error) : i18n.common.somethingWentWrong, tone: "err" }); return; }
      setNote({ key: childId, text: act === "clear" ? t.removedImported(d.removed ?? 0) : resultText(d.result), tone: act === "sync" && !d.result?.ok ? "err" : "ok" });
      await after();
    } finally { setBusy(null); }
  }

  async function remove(childId: string, feed: Feed) {
    const clear = window.confirm(t.removeConfirm(feed.label || feed.host));
    setBusy(feed.id); setNote(null);
    try {
      await fetch(`/api/family/activity-feeds/${encodeURIComponent(feed.id)}${clear ? "?clear=1" : ""}`, { method: "DELETE" });
      setNote({ key: childId, text: t.removed, tone: "ok" });
      await after();
    } finally { setBusy(null); }
  }

  if (hidden || !rows || rows.length === 0) return null;
  const linkCount = rows.reduce((n, r) => n + r.feeds.length, 0);
  const childCount = rows.filter((r) => r.feeds.length > 0).length;

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, marginBottom: 20, fontFamily: FONT, overflow: "hidden" }}>
      <button onClick={() => setOpen((v) => !v)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: FONT }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--tint-warning)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>🔗</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: "var(--fg)" }}>{t.title}</span>
          <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
            {linkCount ? t.summary(linkCount, childCount) : t.summaryNone}
          </span>
        </span>
        <span style={{ color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div style={{ padding: "0 16px 16px" }}>
          {rows.map((r) => (
            <div key={r.childId} style={{ borderTop: "1px solid var(--border-soft)", padding: "12px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: r.feeds.length ? 8 : 0 }}>
                <Avatar userId={r.childId} name={r.name} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>{r.name}</div>
                  {r.feeds.length === 0 && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>{t.noLinks}</div>}
                </div>
              </div>

              {r.feeds.map((f) => {
                const failed = f.lastStatus && f.lastStatus !== "ok";
                return (
                  <div key={f.id} style={{ background: "var(--surface-2)", borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg)" }}>{f.label || f.host}{f.label ? <span style={{ fontWeight: 500, color: "var(--subtle)" }}> · {f.host}</span> : null}</div>
                    <div style={{ fontSize: 11.5, color: failed ? "var(--danger)" : "var(--muted)", marginTop: 2 }}>
                      {failed ? t.lastSyncFailed(err(f.lastStatus!)) : t.upcomingSynced(f.upcoming, when(f.lastSyncAt, i18n, dateLocale))}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      <button onClick={() => action(r.childId, f, "sync")} disabled={busy === f.id} style={btnSoft}>{busy === f.id ? "…" : t.syncNow}</button>
                      <button onClick={() => action(r.childId, f, "clear")} disabled={busy === f.id} style={btnSoft}>{t.removeImported}</button>
                      <button onClick={() => remove(r.childId, f)} disabled={busy === f.id} style={{ ...btnSoft, color: "var(--danger)" }}>{t.removeLink}</button>
                    </div>
                  </div>
                );
              })}

              {addFor !== r.childId && (
                r.feeds.length < max
                  ? <button onClick={() => { setAddFor(r.childId); setUrl(""); setLabel(""); setNote(null); }} style={{ ...btnSoft, marginTop: 2 }}>{t.addLink(r.feeds.length, max)}</button>
                  : <div style={{ fontSize: 11.5, color: "var(--subtle)" }}>{t.maxReached(max)}</div>
              )}

              {addFor === r.childId && (
                <div style={{ marginTop: 6, background: "var(--surface-2)", borderRadius: 14, padding: 12 }}>
                  <button type="button" onClick={() => setShowGuide((v) => !v)} style={{ background: "none", border: "none", padding: 0, fontSize: 12.5, fontWeight: 800, color: "var(--fg)", cursor: "pointer", fontFamily: FONT }}>
                    {showGuide ? "▾" : "▸"} {t.howTo}
                  </button>
                  {showGuide && (
                    <div style={{ margin: "8px 0 10px", fontSize: 12.5, color: "var(--fg-2)", lineHeight: 1.55 }}>
                      <ol style={{ margin: "0 0 8px", paddingLeft: 20, listStyle: "decimal" }}>
                        <li>{t.how1}</li><li>{t.how2}</li><li>{t.how3}</li>
                      </ol>
                      {/* 2026-10-09: per-source help (persona review — a parent can get stuck at step 1). */}
                      {t.sources.map((src) => (
                        <details key={src.name} style={{ borderTop: "1px solid var(--border)", padding: "6px 0" }}>
                          <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--fg)" }}>{src.name}</summary>
                          <ol style={{ margin: "6px 0 2px", paddingLeft: 20, listStyle: "decimal" }}>
                            {src.steps.map((st, i) => <li key={i}>{st}</li>)}
                          </ol>
                        </details>
                      ))}
                    </div>
                  )}
                  <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t.labelPlaceholder} maxLength={40}
                    style={{ ...inputStyle, marginTop: 10, marginBottom: 4 }} />
                  <div style={{ fontSize: 11, color: "var(--subtle)", marginBottom: 8, lineHeight: 1.4 }}>{t.labelHint}</div>
                  <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t.urlPlaceholder} autoComplete="off" autoCapitalize="off" spellCheck={false} inputMode="url"
                    style={{ ...inputStyle, marginBottom: 8 }} />
                  <div style={{ fontSize: 11.5, color: "var(--warning)", background: "var(--tint-warning)", borderRadius: 10, padding: "8px 10px", marginBottom: 10, lineHeight: 1.45 }}>
                    {t.linkWarning(r.name)}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setAddFor(null)} style={{ ...btnSoft, flex: 1 }}>{i18n.common.cancel}</button>
                    <button onClick={() => add(r.childId)} disabled={busy === r.childId || !url.trim()} style={{ ...btnPrimary, flex: 1, opacity: !url.trim() ? 0.5 : 1 }}>
                      {busy === r.childId ? t.fetching : t.connectAndFetch}
                    </button>
                  </div>
                </div>
              )}

              {note && note.key === r.childId && (
                <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: note.tone === "ok" ? "var(--success)" : "var(--danger)" }}>{note.text}</div>
              )}
            </div>
          ))}
          <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.45, borderTop: "1px solid var(--border-soft)", paddingTop: 10 }}>{t.footer}</div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "11px 12px", borderRadius: 12, border: "1.5px solid var(--border)", fontSize: 14, fontFamily: FONT, boxSizing: "border-box", background: "var(--surface)", color: "var(--fg)" };
const btnPrimary: React.CSSProperties = { background: "var(--ink)", color: "#fff", border: "none", borderRadius: 50, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT, flexShrink: 0 };
const btnSoft: React.CSSProperties = { background: "var(--surface-3)", color: "var(--fg-2)", border: "none", borderRadius: 50, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT };
