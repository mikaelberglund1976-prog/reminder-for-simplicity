"use client";

// 2026-09-28 — Plans page. Free vs Pro, the family's current plan, and the
// next step: start the 14-day trial (once per family) or request Pro (the
// admin turns it on for N days — no payments yet; Stripe will replace the
// request button later, see lib/entitlements.ts + /api/billing/request).
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PLAN_ROWS, PRO_PRICE_TEXT } from "@/lib/plans";

type Access = {
  plan: "FREE" | "TRIAL" | "PRO";
  proForever: boolean;
  proUntil: string | null;
  proDaysLeft: number | null;
  trialDaysLeft: number | null;
  trialUsed: boolean;
  canStartTrial: boolean;
  proRequested: boolean;
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const ADULT_ROLES = ["OWNER", "PARENT", "ADULT", "MEMBER"];

// 2026-10-04: rows come from lib/plans.ts (shared with the public pages).
const ROWS = PLAN_ROWS;

function Cell({ v }: { v: boolean | string }) {
  if (typeof v === "string") return <span style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-2)" }}>{v}</span>;
  return v
    ? <span aria-label="Included" style={{ color: "var(--success)", fontWeight: 800 }}>✓</span>
    : <span aria-label="Not included" style={{ color: "var(--faint)", fontWeight: 800 }}>—</span>;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function UpgradePage() {
  const { status } = useSession();
  const router = useRouter();
  const [access, setAccess] = useState<Access | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [hasHousehold, setHasHousehold] = useState(true);
  const [busy, setBusy] = useState<"trial" | "request" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/upgrade");
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function load() {
    const res = await fetch("/api/household");
    const d = await res.json().catch(() => ({}));
    if (!d.household) { setHasHousehold(false); return; }
    setAccess(d.access ?? null);
    setRole(d.role ?? null);
  }

  async function startTrial() {
    setBusy("trial"); setError("");
    const res = await fetch("/api/family/trial", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const d = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { setError(d.error ?? "Could not start the trial"); return; }
    setMessage("Your 14-day trial has started — everything is unlocked.");
    load();
  }

  async function requestPro() {
    setBusy("request"); setError("");
    const res = await fetch("/api/billing/request", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { setError(d.error ?? "Something went wrong"); return; }
    setMessage("Thanks! We've got your request and will email you as soon as Pro is on.");
    load();
  }

  const isAdult = role ? ADULT_ROLES.includes(role) : true;

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT }}>
      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "20px 20px 48px" }}>
        <button onClick={() => (window.history.length > 1 ? router.back() : router.push("/dashboard"))}
          style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "4px 0", marginBottom: 12, fontFamily: FONT }}>
          ‹ Back
        </button>

        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--fg)", margin: "0 0 6px", letterSpacing: "-0.5px" }}>Plans</h1>
        <p style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 20px", lineHeight: 1.5 }}>
          Reminders, the calendar and one shared shopping list are free, always (with a small sponsored card). Pro adds everything for the kids — and no ads.
        </p>
        <p style={{ fontSize: 13, color: "var(--fg-2)", margin: "-12px 0 20px", fontWeight: 700 }}>
          Pro: {PRO_PRICE_TEXT}. Try it free for 14 days first.
        </p>

        {/* Current plan */}
        {access && (
          <div style={{
            background: access.plan === "FREE" ? "var(--surface)" : "var(--hero-grad)",
            color: access.plan === "FREE" ? "var(--fg)" : "#fff",
            border: access.plan === "FREE" ? "1px solid var(--border)" : "none",
            borderRadius: 20, padding: "18px 20px", marginBottom: 18,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.7, marginBottom: 4 }}>Your family&apos;s plan</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>
              {access.plan === "PRO" ? "⚡ Pro" : access.plan === "TRIAL" ? "⚡ Pro trial" : "Free"}
            </div>
            <div style={{ fontSize: 13, marginTop: 4, opacity: 0.85 }}>
              {access.plan === "PRO" && (access.proForever ? "Pro is on — no end date." : access.proUntil ? `Pro until ${fmt(access.proUntil)}.` : "")}
              {access.plan === "TRIAL" && `${access.trialDaysLeft} day${access.trialDaysLeft === 1 ? "" : "s"} left of your free trial.`}
              {access.plan === "FREE" && (access.proRequested ? "Pro requested — we'll email you when it's on." : access.trialUsed ? "Your free trial has been used." : "Try Pro free for 14 days — no card needed.")}
            </div>
          </div>
        )}

        {!hasHousehold && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 16, marginBottom: 18, fontSize: 14, color: "var(--fg-2)" }}>
            Plans are per family. <Link href="/profile" style={{ color: "var(--accent)", fontWeight: 700 }}>Create your family in Settings</Link> first.
          </div>
        )}

        {/* Comparison */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden", marginBottom: 20, boxShadow: "var(--shadow)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 64px 72px", alignItems: "center", padding: "12px 16px", background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>What you get</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--fg-2)", textAlign: "center" }}>Free</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--accent)", textAlign: "center" }}>Pro</span>
          </div>
          {ROWS.map((r, i) => (
            <div key={r.label} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 64px 72px", alignItems: "center", padding: "12px 16px", borderTop: i ? "1px solid var(--border-soft)" : "none" }}>
              <span style={{ fontSize: 14, color: "var(--fg)", lineHeight: 1.35 }}>{r.icon} {r.label}</span>
              <span style={{ textAlign: "center" }}><Cell v={r.free} /></span>
              <span style={{ textAlign: "center" }}><Cell v={r.pro} /></span>
            </div>
          ))}
        </div>

        {/* Actions */}
        {message && <div style={{ background: "var(--tint-success)", color: "var(--success)", borderRadius: 14, padding: "12px 14px", fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{message}</div>}
        {error && <div style={{ background: "var(--tint-danger)", color: "var(--danger)", borderRadius: 14, padding: "12px 14px", fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{error}</div>}

        {access && access.plan !== "PRO" && hasHousehold && (
          isAdult ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {access.canStartTrial && (
                <button onClick={startTrial} disabled={!!busy} style={btn(true)}>
                  {busy === "trial" ? "Starting…" : "Start free 14-day trial"}
                </button>
              )}
              <button onClick={requestPro} disabled={!!busy || access.proRequested} style={btn(!access.canStartTrial)}>
                {busy === "request" ? "Sending…" : access.proRequested ? "Pro requested ✓" : "I want Pro"}
              </button>
              <p style={{ fontSize: 12, color: "var(--subtle)", textAlign: "center", margin: "4px 0 0", lineHeight: 1.5 }}>
                Card payments are coming soon. Until then we turn Pro on for your family by hand after a request.
              </p>
            </div>
          ) : (
            <p style={{ fontSize: 14, color: "var(--muted)", textAlign: "center" }}>Ask a parent to turn on Pro for the family.</p>
          )
        )}
      </main>
    </div>
  );
}

function btn(primary: boolean): React.CSSProperties {
  return {
    width: "100%", padding: "16px", borderRadius: 50, fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
    border: primary ? "none" : "1.5px solid var(--border)",
    background: primary ? "var(--accent-bg)" : "var(--surface)",
    color: primary ? "#fff" : "var(--fg)",
  };
}
