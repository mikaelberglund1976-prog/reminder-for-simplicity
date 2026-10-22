"use client";

// 2026-10-18 (spec §58): a short "What's new" popup, shown once to people who
// had an account before this release. New accounts never see it. Remembered
// per device (a convenience — nothing else depends on it); Settings → Help &
// feedback can show it again.
import Link from "next/link";
import { useEffect, useState } from "react";
import { getMe } from "@/lib/me";
import { useM } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
// 2026-10-22: new round — timetable, notification choices, new email look.
const KEY = "rfs-whatsnew-2026-10-22";
const RELEASED = Date.parse("2026-10-22T00:00:00Z");

export function showWhatsNewAgain() {
  try { localStorage.removeItem(KEY); localStorage.setItem(KEY + "-force", "1"); } catch { /* ignore */ }
}

export default function WhatsNew() {
  const m = useM();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let seen = false, forced = false;
    try { seen = localStorage.getItem(KEY) === "1"; forced = localStorage.getItem(KEY + "-force") === "1"; } catch { return; }
    if (seen && !forced) return;
    getMe().then((me) => {
      if (!me) return;
      const created = me.createdAt ? Date.parse(me.createdAt) : NaN;
      if (forced || (Number.isFinite(created) && created < RELEASED)) setOpen(true);
    });
  }, []);

  function close() {
    setOpen(false);
    try { localStorage.setItem(KEY, "1"); localStorage.removeItem(KEY + "-force"); } catch { /* ignore */ }
  }

  if (!open) return null;
  const t = m.whatsNew;
  return (
    <div onClick={close} style={{ position: "fixed", inset: 0, zIndex: 950, background: "rgba(10,12,20,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: FONT }}>
      <div role="dialog" aria-modal="true" aria-labelledby="whatsnew-title" onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 380, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 22, padding: "22px 20px 18px", boxShadow: "0 18px 50px rgba(0,0,0,0.25)" }}>
        <div aria-hidden style={{ fontSize: 30, marginBottom: 6 }}>✨</div>
        <h2 id="whatsnew-title" style={{ fontSize: 20, fontWeight: 800, color: "var(--fg)", margin: "0 0 12px", letterSpacing: "-0.3px" }}>{t.title}</h2>
        <ul style={{ margin: "0 0 18px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
          {t.points.map((p) => (
            <li key={p} style={{ display: "flex", gap: 10, fontSize: 14.5, lineHeight: 1.45, color: "var(--fg-2)" }}>
              <span aria-hidden style={{ color: "var(--accent)", fontWeight: 800 }}>•</span><span>{p}</span>
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/profile#notifications" onClick={close} style={{ flex: 1, textAlign: "center", padding: "12px 10px", borderRadius: 12, background: "var(--surface-3)", color: "var(--fg-2)", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>{t.pickShortcuts}</Link>
          <button type="button" onClick={close} autoFocus style={{ flex: 1, padding: "12px 10px", borderRadius: 12, border: "none", background: "var(--accent-bg)", color: "var(--on-accent)", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: FONT }}>{t.ok}</button>
        </div>
      </div>
    </div>
  );
}
