"use client";

// 2026-10-03: connect a child's SchoolSoft calendar (adults only). Shown on
// the School page. The link is pasted once per child; the app then fetches it
// once a day. Imported items are marked "SchoolSoft" and can be removed in
// one tap without touching anything added by hand.
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import { useI18n } from "@/lib/i18n/client";
import type { Messages } from "@/lib/i18n/messages";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

type ChildFeed = { childId: string; name: string; connected: boolean; host: string | null; lastSyncAt: string | null; lastStatus: string | null; imported: number };
type SyncResult = { ok: boolean; added: number; updated: number; removed: number; total: number; status: string };

function reloadList() { window.dispatchEvent(new Event("rfs:school-reload")); }

function when(iso: string | null, m: Messages, dateLocale: string) {
  if (!iso) return m.schoolsoft.notYet;
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return (today ? m.schoolsoft.todayPrefix : d.toLocaleDateString(dateLocale, { day: "numeric", month: "short" }) + " ") + d.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
}

export default function SchoolSoftCard() {
  const [rows, setRows] = useState<ChildFeed[] | null>(null);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [connectFor, setConnectFor] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ childId: string; text: string; tone: "ok" | "err" } | null>(null);
  const [showGuide, setShowGuide] = useState(true);
  const { m: i18n, dateLocale, err } = useI18n();
  const t = i18n.schoolsoft;

  async function load() {
    try {
      const res = await fetch("/api/family/school-feeds");
      if (!res.ok) { setHidden(true); return; }
      const d = await res.json();
      setRows(d.children ?? []);
    } catch { setHidden(true); }
  }
  useEffect(() => { load(); }, []);

  function resultText(r: SyncResult) {
    if (!r.ok) return err(r.status);
    const parts = [r.added && t.newN(r.added), r.updated && t.updatedN(r.updated), r.removed && t.removedN(r.removed)].filter(Boolean);
    return parts.length ? t.synced(parts.join(", ")) : t.syncedNothing;
  }

  async function connect(childId: string) {
    setBusy(childId); setMsg(null);
    try {
      const res = await fetch("/api/family/school-feeds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ childId, url }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ childId, text: d.error ? err(d.error) : t.couldNotConnect, tone: "err" }); return; }
      setMsg({ childId, text: d.result?.ok ? t.connected(resultText(d.result)) : t.savedBut(d.result?.status ? err(d.result.status) : t.syncFailed), tone: d.result?.ok ? "ok" : "err" });
      setUrl(""); setConnectFor(null);
      await load(); reloadList();
    } finally { setBusy(null); }
  }

  async function action(childId: string, act: "sync" | "clear") {
    if (act === "clear" && !window.confirm(t.clearConfirm)) return;
    setBusy(childId); setMsg(null);
    try {
      const res = await fetch(`/api/family/school-feeds/${encodeURIComponent(childId)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: act }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ childId, text: d.error ? err(d.error) : i18n.common.somethingWentWrong, tone: "err" }); return; }
      setMsg({ childId, text: act === "clear" ? t.removedImported(d.removed ?? 0) : resultText(d.result), tone: act === "sync" && !d.result?.ok ? "err" : "ok" });
      await load(); reloadList();
    } finally { setBusy(null); }
  }

  async function disconnect(childId: string, name: string) {
    const clear = window.confirm(t.disconnectConfirm(name));
    setBusy(childId); setMsg(null);
    try {
      await fetch(`/api/family/school-feeds/${encodeURIComponent(childId)}${clear ? "?clear=1" : ""}`, { method: "DELETE" });
      setMsg({ childId, text: t.disconnected, tone: "ok" });
      await load(); reloadList();
    } finally { setBusy(null); }
  }

  if (hidden || !rows || rows.length === 0) return null;
  const connectedCount = rows.filter((r) => r.connected).length;

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, marginBottom: 20, fontFamily: FONT, overflow: "hidden" }}>
      <button onClick={() => setOpen((v) => !v)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: FONT }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--tint-success)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>🔗</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: "var(--fg)" }}>SchoolSoft</span>
          <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
            {connectedCount ? t.connectedCount(connectedCount, rows.length) : t.getAutomatically}
          </span>
        </span>
        <span style={{ color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div style={{ padding: "0 16px 16px" }}>
          {rows.map((r) => (
            <div key={r.childId} style={{ borderTop: "1px solid var(--border-soft)", padding: "12px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar userId={r.childId} name={r.name} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>{r.name}</div>
                  <div style={{ fontSize: 11.5, color: r.connected && r.lastStatus && r.lastStatus !== "ok" ? "var(--danger)" : "var(--muted)", marginTop: 1 }}>
                    {r.connected
                      ? r.lastStatus && r.lastStatus !== "ok" ? t.lastSyncFailed(err(r.lastStatus)) : t.importedSynced(r.imported, when(r.lastSyncAt, i18n, dateLocale))
                      : t.notConnected}
                  </div>
                </div>
                {!r.connected && connectFor !== r.childId && (
                  <button onClick={() => { setConnectFor(r.childId); setUrl(""); setMsg(null); }} style={btnPrimary}>{t.connect}</button>
                )}
              </div>

              {r.connected && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                  <button onClick={() => action(r.childId, "sync")} disabled={busy === r.childId} style={btnSoft}>{busy === r.childId ? "…" : t.syncNow}</button>
                  <button onClick={() => action(r.childId, "clear")} disabled={busy === r.childId || r.imported === 0} style={{ ...btnSoft, opacity: r.imported === 0 ? 0.5 : 1 }}>{t.removeImported}</button>
                  <button onClick={() => { setConnectFor(r.childId); setUrl(""); setMsg(null); }} disabled={busy === r.childId} style={btnSoft}>{t.changeLink}</button>
                  <button onClick={() => disconnect(r.childId, r.name)} disabled={busy === r.childId} style={{ ...btnSoft, color: "var(--danger)" }}>{t.disconnect}</button>
                </div>
              )}

              {connectFor === r.childId && (
                <div style={{ marginTop: 10, background: "var(--surface-2)", borderRadius: 14, padding: 12 }}>
                  <button type="button" onClick={() => setShowGuide((v) => !v)} style={{ background: "none", border: "none", padding: 0, fontSize: 12.5, fontWeight: 800, color: "var(--fg)", cursor: "pointer", fontFamily: FONT }}>
                    {showGuide ? "▾" : "▸"} {t.howTo(r.name)}
                  </button>
                  {showGuide && (
                    <ol style={{ margin: "8px 0 10px", paddingLeft: 20, listStyle: "decimal", fontSize: 12.5, color: "var(--fg-2)", lineHeight: 1.55 }}>
                      <li>{t.step1(r.name)}</li>
                      <li>{t.step2a}<b>Schema &amp; Kalender</b>{t.step2b}<b>Exportera kalender</b>{t.step2c}</li>
                      <li>{t.step3a}<b>Hantera innehåll</b>{t.step3b}<b>{t.step3on}</b>{t.step3c}<b>Uppgifter</b>, <b>Planeringar</b>{t.step3and}<b>Kalenderhändelser</b>{t.step3d}</li>
                      <li>{t.step4a}<b>{t.step4off}</b> <b>Schema</b>{t.step4b}<b>Tidbokningar</b>{t.step4c}</li>
                      <li>{t.step5a}<b>Prenumerera på kalender</b>{t.step5b}<b>Länk</b>{t.step5c}</li>
                    </ol>
                  )}
                  <div style={{ fontSize: 11.5, color: "var(--warning)", background: "var(--tint-warning)", borderRadius: 10, padding: "8px 10px", marginBottom: 10, lineHeight: 1.45 }}>
                    {t.linkWarning(r.name)}
                  </div>
                  <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://sms.schoolsoft.se/…" autoComplete="off" autoCapitalize="off" spellCheck={false} inputMode="url"
                    style={{ width: "100%", padding: "11px 12px", borderRadius: 12, border: "1.5px solid var(--border)", fontSize: 14, fontFamily: FONT, boxSizing: "border-box", background: "var(--surface)", color: "var(--fg)", marginBottom: 8 }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setConnectFor(null)} style={{ ...btnSoft, flex: 1 }}>{i18n.common.cancel}</button>
                    <button onClick={() => connect(r.childId)} disabled={busy === r.childId || !url.trim()} style={{ ...btnPrimary, flex: 1, opacity: !url.trim() ? 0.5 : 1 }}>
                      {busy === r.childId ? t.fetching : r.connected ? t.saveNewLink : t.connectAndFetch}
                    </button>
                  </div>
                </div>
              )}

              {msg && msg.childId === r.childId && (
                <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: msg.tone === "ok" ? "var(--success)" : "var(--danger)" }}>{msg.text}</div>
              )}
            </div>
          ))}
          <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.45, borderTop: "1px solid var(--border-soft)", paddingTop: 10 }}>
            {t.footer1}<b>SchoolSoft</b>{t.footer2}
          </div>
        </div>
      )}
    </div>
  );
}

const btnPrimary: React.CSSProperties = { background: "var(--ink)", color: "#fff", border: "none", borderRadius: 50, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT, flexShrink: 0 };
const btnSoft: React.CSSProperties = { background: "var(--surface-3)", color: "var(--fg-2)", border: "none", borderRadius: 50, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT };
