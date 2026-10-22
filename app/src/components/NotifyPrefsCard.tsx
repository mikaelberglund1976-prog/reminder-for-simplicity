"use client";

// 2026-10-22 (Mikael: "hur ställer man in och stänger av detta som mail …
// samma i notifikationer ska man kunna ställa av och på vad som visas"):
// one row per kind, a switch for Email and one for Push. Everyone — children
// too — chooses for themselves. Push needs the phone turned on in the card
// above; email choices work on their own.
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const ROWS = ["reminders", "school", "activities", "birthdays", "tomorrow", "changes"] as const;
type Row = (typeof ROWS)[number];
const EMAIL_ROWS: Row[] = ["reminders", "school", "activities", "birthdays"];

function Switch({ on, onClick, label, disabled }: { on: boolean; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick} disabled={disabled} style={{
      width: 42, height: 26, borderRadius: 13, border: "none", padding: 3, cursor: disabled ? "default" : "pointer", flexShrink: 0,
      background: on ? "var(--accent-bg)" : "var(--surface-3)", opacity: disabled ? 0.45 : 1, transition: "background 0.15s",
      display: "flex", justifyContent: on ? "flex-end" : "flex-start",
    }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }} />
    </button>
  );
}

export default function NotifyPrefsCard() {
  const { m } = useI18n();
  const t = m.notify;
  const [email, setEmail] = useState<string[] | null>(null);
  const [push, setPush] = useState<{ kinds: string[]; devices: number; configured: boolean } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/notify/prefs").then((r) => (r.ok ? r.json() : null)).then((d) => setEmail(d?.email ?? [...EMAIL_ROWS])).catch(() => setEmail([...EMAIL_ROWS]));
    fetch("/api/push").then((r) => (r.ok ? r.json() : null)).then((d) => d && setPush({ kinds: d.kinds ?? [], devices: d.devices ?? 0, configured: !!d.configured })).catch(() => {});
    // The push card above turns the phone on/off — pick that up.
    const onFocus = () => fetch("/api/push").then((r) => (r.ok ? r.json() : null)).then((d) => d && setPush({ kinds: d.kinds ?? [], devices: d.devices ?? 0, configured: !!d.configured })).catch(() => {});
    window.addEventListener("rfs-push-changed", onFocus);
    return () => window.removeEventListener("rfs-push-changed", onFocus);
  }, []);

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 1500); }

  async function toggleEmail(k: Row) {
    if (!email) return;
    const next = email.includes(k) ? email.filter((x) => x !== k) : [...email, k];
    setEmail(next);
    const res = await fetch("/api/notify/prefs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: next }) }).catch(() => null);
    if (res?.ok) flash();
  }

  async function togglePush(k: Row) {
    if (!push) return;
    const kinds = push.kinds.includes(k) ? push.kinds.filter((x) => x !== k) : [...push.kinds, k];
    setPush({ ...push, kinds });
    const res = await fetch("/api/push", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kinds }) }).catch(() => null);
    if (res?.ok) flash();
  }

  const pushReady = !!push?.configured && push.devices > 0;

  return (
    <div style={{ fontFamily: FONT }}>
      <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 12px" }}>{t.intro}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 0 6px", borderBottom: "1px solid var(--border-soft)" }}>
        <span style={{ flex: 1, fontSize: 11.5, fontWeight: 700, color: "var(--subtle)" }}>{saved ? `✓ ${t.saved}` : ""}</span>
        <span style={{ width: 42, textAlign: "center", fontSize: 11.5, fontWeight: 800, color: "var(--muted)" }}>{t.email}</span>
        <span style={{ width: 42, textAlign: "center", fontSize: 11.5, fontWeight: 800, color: "var(--muted)" }}>{t.push}</span>
      </div>
      {ROWS.map((k) => (
        <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border-soft)" }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>{t.kinds[k]}</span>
            <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 1, lineHeight: 1.4 }}>{t.hints[k]}</span>
          </span>
          {EMAIL_ROWS.includes(k)
            ? <Switch on={!!email?.includes(k)} onClick={() => toggleEmail(k)} label={`${t.email}: ${t.kinds[k]}`} disabled={!email} />
            : <span style={{ width: 42, textAlign: "center", color: "var(--faint)", flexShrink: 0 }}>–</span>}
          <Switch on={pushReady && !!push?.kinds.includes(k)} onClick={() => togglePush(k)} label={`${t.push}: ${t.kinds[k]}`} disabled={!pushReady} />
        </div>
      ))}
      {!pushReady && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>{t.pushOffHint}</div>}
    </div>
  );
}
