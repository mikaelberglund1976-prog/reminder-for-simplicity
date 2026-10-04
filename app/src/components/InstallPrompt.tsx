"use client";

// 2026-10-04: "Add to your phone" (PWA install) banner.
// - Only on phones/tablets, only in the browser (never inside the installed app).
// - Only on the start page and inside /dashboard (not on login/register, shared
//   shopping links, admin, etc.).
// - Android/Chrome: uses the browser's own install dialog (beforeinstallprompt).
// - iPhone/iPad: Apple doesn't allow a button, so we show the 3 short steps.
// - "Not now" hides it for 14 days (per device, localStorage).

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useM } from "@/lib/i18n/client";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Mode = "android" | "ios" | "other";

const KEY = "rfs-install-dismissed-at";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
function isIOS() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}
function isMobile() {
  return isIOS() || /Android|Mobi/i.test(navigator.userAgent);
}
function snoozed() {
  try {
    const at = Number(window.localStorage.getItem(KEY) || 0);
    return at > 0 && Date.now() - at < SNOOZE_MS;
  } catch { return false; }
}

export default function InstallPrompt() {
  const t = useM().pwa;
  const pathname = usePathname() || "";
  const [mode, setMode] = useState<Mode | null>(null);
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [inSafari, setInSafari] = useState(true);

  const allowedPage = pathname === "/" || pathname.startsWith("/dashboard");

  useEffect(() => {
    if (!allowedPage || isStandalone() || !isMobile() || snoozed()) return;

    const onBIP = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); setMode("android"); };
    const onInstalled = () => setMode(null);
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);

    // Give the page a moment before showing anything.
    const timer = window.setTimeout(() => {
      if (isIOS()) {
        setInSafari(!/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent));
        setMode("ios");
      } else {
        // Chrome fires beforeinstallprompt by now if it can install; otherwise manual steps.
        setMode((m) => m ?? "other");
      }
    }, 2500);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [allowedPage]);

  if (!mode || !allowedPage) return null;

  const dismiss = () => {
    try { window.localStorage.setItem(KEY, String(Date.now())); } catch { /* private mode */ }
    setMode(null);
  };
  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    try { await evt.userChoice; } catch { /* ignore */ }
    setEvt(null);
    setMode(null);
  };

  // Sit above the bottom menu inside the app, at the bottom edge elsewhere.
  const bottom = pathname.startsWith("/dashboard")
    ? "calc(env(safe-area-inset-bottom, 0px) + 84px)"
    : "calc(env(safe-area-inset-bottom, 0px) + 16px)";

  return (
    <div role="dialog" aria-label={mode === "ios" ? t.iosTitle : t.title}
      style={{ position: "fixed", left: 12, right: 12, bottom, zIndex: 40, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{
        pointerEvents: "auto", width: "100%", maxWidth: 420, background: "var(--surface)", color: "var(--fg)",
        border: "1px solid var(--border)", borderRadius: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
        padding: "14px 14px 12px", display: "flex", gap: 12, alignItems: "flex-start",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={44} height={44} style={{ borderRadius: 11, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 650, fontSize: 15, marginBottom: 3 }}>{mode === "ios" ? t.iosTitle : t.title}</div>

          {mode === "ios" ? (
            <ol style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 13.5, lineHeight: 1.5, color: "var(--muted)" }}>
              <li>
                {t.iosStep1}{" "}
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-2px" }} aria-hidden>
                  <path d="M12 3v12" /><path d="m7 8 5-5 5 5" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
                </svg>
              </li>
              <li>{t.iosStep2}</li>
              <li>{t.iosStep3}</li>
              {!inSafari && <li style={{ listStyle: "none", marginLeft: -18, marginTop: 4 }}>{t.iosNotSafari}</li>}
            </ol>
          ) : mode === "android" ? (
            <div style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--muted)" }}>{t.body}</div>
          ) : (
            <div style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--muted)" }}>{t.otherStep}</div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {mode === "android" && (
              <button onClick={install} style={{
                font: "inherit", fontSize: 14, fontWeight: 600, padding: "8px 16px", borderRadius: 10, border: 0,
                background: "var(--accent)", color: "#fff", cursor: "pointer",
              }}>{t.install}</button>
            )}
            <button onClick={dismiss} style={{
              font: "inherit", fontSize: 14, fontWeight: 500, padding: "8px 12px", borderRadius: 10,
              border: "1px solid var(--border)", background: "transparent", color: "var(--fg)", cursor: "pointer",
            }}>{mode === "android" ? t.notNow : t.close}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
