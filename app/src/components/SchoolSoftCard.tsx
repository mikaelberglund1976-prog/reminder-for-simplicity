"use client";

// 2026-10-03: connect a child's SchoolSoft calendar (adults only). Shown on
// the School page. The link is pasted once per child; the app then fetches it
// once a day. Imported items are marked "SchoolSoft" and can be removed in
// one tap without touching anything added by hand.
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

type ChildFeed = { childId: string; name: string; connected: boolean; host: string | null; lastSyncAt: string | null; lastStatus: string | null; imported: number };
type SyncResult = { ok: boolean; added: number; updated: number; removed: number; total: number; status: string };

function reloadList() { window.dispatchEvent(new Event("rfs:school-reload")); }

function when(iso: string | null) {
  if (!iso) return "not yet";
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return (today ? "today " : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " ") + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
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
    if (!r.ok) return r.status;
    const parts = [r.added && `${r.added} new`, r.updated && `${r.updated} updated`, r.removed && `${r.removed} removed`].filter(Boolean);
    return parts.length ? `Synced: ${parts.join(", ")}.` : "Synced — nothing new.";
  }

  async function connect(childId: string) {
    setBusy(childId); setMsg(null);
    try {
      const res = await fetch("/api/family/school-feeds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ childId, url }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ childId, text: d.error ?? "Couldn't connect", tone: "err" }); return; }
      setMsg({ childId, text: d.result?.ok ? `Connected. ${resultText(d.result)}` : `Saved, but: ${d.result?.status ?? "sync failed"}`, tone: d.result?.ok ? "ok" : "err" });
      setUrl(""); setConnectFor(null);
      await load(); reloadList();
    } finally { setBusy(null); }
  }

  async function action(childId: string, act: "sync" | "clear") {
    if (act === "clear" && !window.confirm("Remove everything imported from SchoolSoft for this child?\n\nThings you added yourself stay. Tap “Sync now” afterwards to fetch again (e.g. after changing what's included in SchoolSoft).")) return;
    setBusy(childId); setMsg(null);
    try {
      const res = await fetch(`/api/family/school-feeds/${encodeURIComponent(childId)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: act }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ childId, text: d.error ?? "Something went wrong", tone: "err" }); return; }
      setMsg({ childId, text: act === "clear" ? `Removed ${d.removed ?? 0} imported item${d.removed === 1 ? "" : "s"}. Hand-made ones are still there.` : resultText(d.result), tone: act === "sync" && !d.result?.ok ? "err" : "ok" });
      await load(); reloadList();
    } finally { setBusy(null); }
  }

  async function disconnect(childId: string, name: string) {
    const clear = window.confirm(`Disconnect SchoolSoft for ${name}?\n\nOK = also remove what was imported.\nCancel = keep the imported items (they just stop updating).`);
    setBusy(childId); setMsg(null);
    try {
      await fetch(`/api/family/school-feeds/${encodeURIComponent(childId)}${clear ? "?clear=1" : ""}`, { method: "DELETE" });
      setMsg({ childId, text: "Disconnected.", tone: "ok" });
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
            {connectedCount ? `${connectedCount} of ${rows.length} connected · updates once a day` : "Get homework & tests in automatically"}
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
                      ? r.lastStatus && r.lastStatus !== "ok" ? `Last sync failed: ${r.lastStatus}` : `${r.imported} imported · synced ${when(r.lastSyncAt)}`
                      : "Not connected"}
                  </div>
                </div>
                {!r.connected && connectFor !== r.childId && (
                  <button onClick={() => { setConnectFor(r.childId); setUrl(""); setMsg(null); }} style={btnPrimary}>Connect</button>
                )}
              </div>

              {r.connected && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                  <button onClick={() => action(r.childId, "sync")} disabled={busy === r.childId} style={btnSoft}>{busy === r.childId ? "…" : "Sync now"}</button>
                  <button onClick={() => action(r.childId, "clear")} disabled={busy === r.childId || r.imported === 0} style={{ ...btnSoft, opacity: r.imported === 0 ? 0.5 : 1 }}>Remove imported</button>
                  <button onClick={() => { setConnectFor(r.childId); setUrl(""); setMsg(null); }} disabled={busy === r.childId} style={btnSoft}>Change link</button>
                  <button onClick={() => disconnect(r.childId, r.name)} disabled={busy === r.childId} style={{ ...btnSoft, color: "var(--danger)" }}>Disconnect</button>
                </div>
              )}

              {connectFor === r.childId && (
                <div style={{ marginTop: 10, background: "var(--surface-2)", borderRadius: 14, padding: 12 }}>
                  <button type="button" onClick={() => setShowGuide((v) => !v)} style={{ background: "none", border: "none", padding: 0, fontSize: 12.5, fontWeight: 800, color: "var(--fg)", cursor: "pointer", fontFamily: FONT }}>
                    {showGuide ? "▾" : "▸"} How to get {r.name}&apos;s link in SchoolSoft
                  </button>
                  {showGuide && (
                    <ol style={{ margin: "8px 0 10px", paddingLeft: 20, listStyle: "decimal", fontSize: 12.5, color: "var(--fg-2)", lineHeight: 1.55 }}>
                      <li>In the SchoolSoft app, log in as {r.name}&apos;s guardian and pick {r.name}.</li>
                      <li>Open <b>Schema &amp; Kalender</b> → <b>Exportera kalender</b>.</li>
                      <li>Under <b>Hantera innehåll</b>, turn <b>on</b>: <b>Uppgifter</b>, <b>Planeringar</b> and <b>Kalenderhändelser</b>.</li>
                      <li>Turn <b>off</b> <b>Schema</b> — otherwise every lesson comes in. <b>Tidbokningar</b> is up to you.</li>
                      <li>Under <b>Prenumerera på kalender</b>, tap the copy icon next to <b>Länk</b> and paste it below.</li>
                    </ol>
                  )}
                  <div style={{ fontSize: 11.5, color: "var(--warning)", background: "var(--tint-warning)", borderRadius: 10, padding: "8px 10px", marginBottom: 10, lineHeight: 1.45 }}>
                    Anyone with this link can see {r.name}&apos;s SchoolSoft calendar. We keep it on our server only — it&apos;s never shown to anyone in the family, including {r.name}.
                  </div>
                  <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://sms.schoolsoft.se/…" autoComplete="off" autoCapitalize="off" spellCheck={false} inputMode="url"
                    style={{ width: "100%", padding: "11px 12px", borderRadius: 12, border: "1.5px solid var(--border)", fontSize: 14, fontFamily: FONT, boxSizing: "border-box", background: "var(--surface)", color: "var(--fg)", marginBottom: 8 }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setConnectFor(null)} style={{ ...btnSoft, flex: 1 }}>Cancel</button>
                    <button onClick={() => connect(r.childId)} disabled={busy === r.childId || !url.trim()} style={{ ...btnPrimary, flex: 1, opacity: !url.trim() ? 0.5 : 1 }}>
                      {busy === r.childId ? "Fetching…" : r.connected ? "Save new link" : "Connect & fetch"}
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
            Imported items are marked <b>SchoolSoft</b>. Tap one to change type, subject or date — SchoolSoft won&apos;t overwrite your change. Only adults can connect, remove or change this; children just see their items.
          </div>
        </div>
      )}
    </div>
  );
}

const btnPrimary: React.CSSProperties = { background: "var(--ink)", color: "#fff", border: "none", borderRadius: 50, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT, flexShrink: 0 };
const btnSoft: React.CSSProperties = { background: "var(--surface-3)", color: "var(--fg-2)", border: "none", borderRadius: 50, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT };
