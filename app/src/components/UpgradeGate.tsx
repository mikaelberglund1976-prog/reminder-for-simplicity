"use client";

// 2026-09-28 — the one "this is a Pro feature" screen, used everywhere a
// family feature is locked (chores, homework & tests, wishlists, activities,
// extra shopping lists, child accounts). Knows the family's plan, so it can
// offer the right next step: start the 14-day trial (once), ask for Pro, or
// for a child: ask a parent.
import Link from "next/link";
import { useEffect, useState } from "react";

type Access = {
  plan: "FREE" | "TRIAL" | "PRO";
  trialUsed: boolean;
  canStartTrial: boolean;
  proRequested: boolean;
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

export default function UpgradeGate({ feature, description, emoji = "⚡", compact = false, onUnlocked }: {
  feature: string;
  description?: string;
  emoji?: string;
  compact?: boolean;
  onUnlocked?: () => void;
}) {
  const [access, setAccess] = useState<Access | null>(null);
  const [isAdult, setIsAdult] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/family/trial").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) return;
      if (d.access) setAccess(d.access);
      if (typeof d.isAdult === "boolean") setIsAdult(d.isAdult);
    }).catch(() => {});
  }, []);

  async function startTrial() {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/family/trial", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Could not start the trial");
      if (onUnlocked) onUnlocked(); else window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  const trialEnded = access?.trialUsed && access.plan === "FREE";
  const title = trialEnded ? "Your free trial has ended" : `${feature} is part of Pro`;
  const body = !isAdult
    ? "Ask a parent to turn on Pro for the family."
    : trialEnded
      ? `Upgrade to Pro to keep using ${feature.toLowerCase()} — everything you added is still here.`
      : description ?? `Try everything free for 14 days — no card needed.`;

  return (
    <div style={{
      textAlign: "center", fontFamily: FONT,
      padding: compact ? "20px 18px" : "44px 24px",
      background: compact ? "var(--surface)" : "transparent",
      border: compact ? "1px solid var(--border)" : "none",
      borderRadius: compact ? 18 : 0, marginBottom: compact ? 16 : 0,
    }}>
      <div style={{ width: compact ? 44 : 60, height: compact ? 44 : 60, margin: "0 auto 14px", borderRadius: 18, background: "var(--tint-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: compact ? 22 : 30 }}>{emoji}</div>
      <h2 style={{ fontSize: compact ? 16 : 20, fontWeight: 800, color: "var(--fg)", margin: "0 0 8px" }}>{title}</h2>
      <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, margin: "0 auto 20px", maxWidth: 320 }}>{body}</p>
      {isAdult && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          {access?.canStartTrial ? (
            <button onClick={startTrial} disabled={busy} style={primary}>
              {busy ? "Starting…" : "Start free 14-day trial"}
            </button>
          ) : (
            <Link href="/upgrade" style={primary}>{access?.proRequested ? "Pro requested — see status" : "Upgrade to Pro"}</Link>
          )}
          <Link href="/upgrade" style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>What&apos;s included in Pro →</Link>
        </div>
      )}
      {error && <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 12 }}>{error}</div>}
    </div>
  );
}

const primary: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  background: "var(--accent-bg)", color: "#fff", border: "none", borderRadius: 50,
  padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer",
  textDecoration: "none", fontFamily: FONT, minWidth: 240,
};
