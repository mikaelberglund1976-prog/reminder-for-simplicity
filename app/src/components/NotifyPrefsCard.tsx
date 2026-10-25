"use client";

// 2026-10-22 (Mikael: "hur ställer man in och stänger av detta som mail …
// samma i notifikationer ska man kunna ställa av och på vad som visas"):
// one row per kind, a switch for Email and one for Push. Everyone — children
// too — chooses for themselves. Push needs the phone turned on in the card
// above; email choices work on their own.
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { track } from "@/lib/analytics";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const ROWS = ["reminders", "school", "activities", "birthdays", "tomorrow", "changes"] as const;
type Row = (typeof ROWS)[number];
const EMAIL_ROWS: Row[] = ["reminders", "school", "activities", "birthdays"];

// 2026-10-25 (masterbrief §26–27): three presets + Customise. A preset only
// writes the same per-kind choices as the switches below — nothing new is
// stored, and nobody's current choices change until they pick one. (Everyone
// who never changed anything is on "Everything", the old default.)
type Preset = "important" | "balanced" | "all";
const PRESETS: Record<Preset, { push: Row[]; email: Row[] }> = {
  important: { push: ["reminders", "changes"], email: ["reminders"] },
  balanced: { push: ["reminders", "school", "activities", "changes", "tomorrow"], email: ["reminders", "school"] },
  all: { push: [...ROWS], email: [...EMAIL_ROWS] },
};
const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
function presetOf(email: string[], push: string[]): Preset | "custom" {
  for (const p of Object.keys(PRESETS) as Preset[]) if (same(email, PRESETS[p].email) && same(push, PRESETS[p].push)) return p;
  return "custom";
}

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
  const [showCustom, setShowCustom] = useState(false);

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
  const current = email && push ? presetOf(email, push.kinds) : null;
  const detailsOpen = showCustom || current === "custom";

  async function choosePreset(p: Preset | "custom") {
    if (p === "custom") { setShowCustom(true); return; }
    if (!email || !push) return;
    setShowCustom(false);
    const want = PRESETS[p];
    setEmail([...want.email]);
    setPush({ ...push, kinds: [...want.push] });
    track("notify_preset_chosen", { preset: p });
    const [a, b] = await Promise.all([
      fetch("/api/notify/prefs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: want.email }) }).catch(() => null),
      fetch("/api/push", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kinds: want.push }) }).catch(() => null),
    ]);
    if (a?.ok && b?.ok) flash();
  }

  return (
    <div style={{ fontFamily: FONT }}>
      <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 12px" }}>{t.intro}</p>
      <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--fg)", marginBottom: 8 }}>{t.presetLabel}</div>
      <div role="radiogroup" aria-label={t.presetLabel} style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 4, padding: 4, borderRadius: 14, background: "var(--surface-3)", border: "1px solid var(--border)", opacity: current ? 1 : 0.6 }}>
        {(["important", "balanced", "all", "custom"] as const).map((p) => {
          const on = (p === "custom" ? detailsOpen : current === p && !showCustom);
          return (
            <button key={p} type="button" role="radio" aria-checked={on} disabled={!current} onClick={() => choosePreset(p)} style={{
              minHeight: 44, padding: "6px 4px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, lineHeight: 1.2,
              background: on ? "var(--surface)" : "transparent", color: on ? "var(--fg)" : "var(--muted)", boxShadow: on ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
            }}>{t.presets[p]}</button>
          );
        })}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45, margin: "8px 0 14px" }}>
        {t.presetHints[detailsOpen ? "custom" : current ?? "balanced"]}
      </div>
      {detailsOpen && (<>
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
      </>)}
      {saved && !detailsOpen && <div style={{ fontSize: 12, color: "var(--success)", fontWeight: 700 }}>✓ {t.saved}</div>}
      {!pushReady && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>{t.pushOffHint}</div>}
    </div>
  );
}
