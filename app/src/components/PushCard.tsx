"use client";

// 2026-10-09: turn on push notifications for this phone (Settings).
// Works in Chrome/Edge/Firefox on Android and desktop, and on iPhone only in
// the installed app (iOS 16.4+), which the card explains.
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
type Kind = "reminders" | "tomorrow";
type State = { configured: boolean; publicKey: string | null; devices: number; kinds: Kind[] };

function keyBytes(b64u: string): Uint8Array {
  const pad = "=".repeat((4 - (b64u.length % 4)) % 4);
  const raw = atob((b64u + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export default function PushCard() {
  const { m } = useI18n();
  const t = m.push;
  const [state, setState] = useState<State | null>(null);
  const [supported, setSupported] = useState(true);
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unknown">("unknown");
  const [here, setHere] = useState<PushSubscription | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIosNeedsInstall(ios && !standalone);
    setSupported(ok);
    if ("Notification" in window) setPermission(Notification.permission);
    fetch("/api/push").then((r) => (r.ok ? r.json() : null)).then((d) => d && setState(d)).catch(() => {});
    if (ok) navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then(setHere).catch(() => {});
  }, []);

  async function turnOn() {
    if (!state?.publicKey) return;
    setBusy(true); setNote(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") { setNote({ text: t.denied, ok: false }); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(state.publicKey) as BufferSource }));
      const res = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) });
      if (!res.ok) throw new Error(String(res.status));
      setHere(sub);
      setState((s) => (s ? { ...s, devices: s.devices + 1 } : s));
      await sendTest();
    } catch (e) {
      console.error(e);
      setNote({ text: m.common.somethingWentWrong, ok: false });
    } finally { setBusy(false); }
  }

  async function turnOff() {
    if (!here) return;
    setBusy(true); setNote(null);
    try {
      await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: here.endpoint }) });
      await here.unsubscribe().catch(() => {});
      setHere(null);
      setState((s) => (s ? { ...s, devices: Math.max(0, s.devices - 1) } : s));
    } finally { setBusy(false); }
  }

  async function sendTest() {
    const res = await fetch("/api/push/test", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setNote(d.ok ? { text: t.testSent, ok: true } : { text: t.testFailed, ok: false });
  }

  async function toggleKind(k: Kind) {
    if (!state) return;
    const kinds = state.kinds.includes(k) ? state.kinds.filter((x) => x !== k) : [...state.kinds, k];
    setState({ ...state, kinds });
    await fetch("/api/push", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kinds }) }).catch(() => {});
  }

  const btn = { border: "none", borderRadius: 50, padding: "12px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT } as const;

  let blocker: string | null = null;
  if (state && !state.configured) blocker = t.notConfigured;
  else if (iosNeedsInstall) blocker = t.iosInstall;
  else if (!supported) blocker = t.unsupported;
  else if (permission === "denied") blocker = t.denied;

  return (
    <div style={{ fontFamily: FONT }}>
      <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 14px" }}>{t.body}</p>
      {blocker ? (
        <div style={{ fontSize: 13, color: "var(--fg-2)", background: "var(--surface-2)", borderRadius: 12, padding: "10px 12px", lineHeight: 1.5 }}>{blocker}</div>
      ) : here ? (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--success)", marginBottom: 12 }}>✓ {t.onHere}</div>
          {(["reminders", "tomorrow"] as Kind[]).map((k) => (
            <label key={k} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, color: "var(--fg)", lineHeight: 1.45, marginBottom: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={!!state?.kinds.includes(k)} onChange={() => toggleKind(k)} style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, accentColor: "var(--accent)" }} />
              <span>{k === "reminders" ? t.kindReminders : t.kindTomorrow}</span>
            </label>
          ))}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            <button type="button" onClick={sendTest} disabled={busy} style={{ ...btn, background: "var(--surface-3)", color: "var(--fg-2)" }}>{t.sendTest}</button>
            <button type="button" onClick={turnOff} disabled={busy} style={{ ...btn, background: "none", color: "var(--danger)", padding: "12px 6px" }}>{t.turnOff}</button>
          </div>
        </>
      ) : (
        <button type="button" onClick={turnOn} disabled={busy || !state} style={{ ...btn, width: "100%", background: "var(--ink)", color: "#fff", opacity: busy || !state ? 0.6 : 1 }}>
          {busy ? t.turningOn : t.turnOn}
        </button>
      )}
      {note && <div style={{ fontSize: 12.5, marginTop: 10, color: note.ok ? "var(--success)" : "var(--danger)" }}>{note.text}</div>}
    </div>
  );
}
