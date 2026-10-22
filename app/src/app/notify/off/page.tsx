"use client";

// 2026-10-22: the page behind "Stop emails about …" in an email. One button
// (not on page load, so mail scanners that open links change nothing).
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { BrandMark } from "@/components/BrandMark";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

export default function EmailOffPage() {
  return <Suspense fallback={null}><EmailOff /></Suspense>;
}

function EmailOff() {
  const sp = useSearchParams();
  const { m } = useI18n();
  const t = m.notify;
  const u = sp.get("u"), k = sp.get("k") ?? "", s = sp.get("s");
  const kindLabel = t.kinds[k] ?? t.kinds.reminders;
  const [state, setState] = useState<"ask" | "busy" | "done" | "bad">(u && s && t.kinds[k] ? "ask" : "bad");

  async function off() {
    setState("busy");
    const res = await fetch("/api/notify/off", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ u, k, s }) }).catch(() => null);
    setState(res?.ok ? "done" : "bad");
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 22, padding: "26px 22px", maxWidth: 400, width: "100%", boxShadow: "var(--shadow)", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><BrandMark size={44} /></div>
        {state === "done" ? (
          <h1 style={{ fontSize: 19, fontWeight: 800, color: "var(--fg)", margin: "0 0 8px" }}>{t.offDone(kindLabel)}</h1>
        ) : state === "bad" ? (
          <h1 style={{ fontSize: 17, fontWeight: 800, color: "var(--fg)", margin: "0 0 8px" }}>{t.offInvalid}</h1>
        ) : (
          <>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: "var(--fg)", margin: "0 0 8px" }}>{t.offTitle(kindLabel)}</h1>
            <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.55, margin: "0 0 18px" }}>{t.offBody}</p>
            <button type="button" onClick={off} disabled={state === "busy"} style={{ width: "100%", border: "none", borderRadius: 50, padding: "13px 18px", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: FONT, background: "var(--accent-bg)", color: "var(--on-accent)", opacity: state === "busy" ? 0.6 : 1 }}>
              {t.offButton}
            </button>
          </>
        )}
        {state === "done" && <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.55, margin: "0 0 18px" }}>{t.offBody}</p>}
        <Link href="/profile#notifications" style={{ display: "inline-block", marginTop: 14, fontSize: 13.5, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>{t.toSettings}</Link>
      </div>
    </div>
  );
}
