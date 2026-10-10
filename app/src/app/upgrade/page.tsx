"use client";

// 2026-09-28 — Plans page. Free vs Pro, the family's current plan, and the
// next step: start the 14-day trial (once per family) or request Pro (the
// admin turns it on for N days — no payments yet; Stripe will replace the
// request button later, see lib/entitlements.ts + /api/billing/request).
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PLAN_ROWS, PRO_PRICE } from "@/lib/plans";
import { useI18n } from "@/lib/i18n/client";
import type { Messages } from "@/lib/i18n/messages";

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

function Cell({ v, m }: { v: boolean | string; m: Messages }) {
  if (typeof v === "string") return <span style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-2)" }}>{m.plans.cellValues[v] ?? v}</span>;
  return v
    ? <span aria-label={m.plans.included} style={{ color: "var(--success)", fontWeight: 800 }}>✓</span>
    : <span aria-label={m.plans.notIncluded} style={{ color: "var(--faint)", fontWeight: 800 }}>—</span>;
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
  const { m, dateLocale, err } = useI18n();
  const t = m.landing.upgrade;
  const fmt = (d: string) => new Date(d).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" });

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
    if (!res.ok) { setError(d.error ? err(d.error) : t.couldNotStart); return; }
    setMessage(t.trialStarted);
    load();
  }

  async function requestPro() {
    setBusy("request"); setError("");
    const res = await fetch("/api/billing/request", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { setError(d.error ? err(d.error) : m.common.somethingWentWrong); return; }
    setMessage(t.requested);
    load();
  }

  const isAdult = role ? ADULT_ROLES.includes(role) : true;

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT }}>
      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "20px 20px 48px" }}>
        <button onClick={() => (window.history.length > 1 ? router.back() : router.push("/dashboard"))}
          style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "4px 0", marginBottom: 12, fontFamily: FONT }}>
          {t.back}
        </button>

        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--fg)", margin: "0 0 6px", letterSpacing: "-0.5px" }}>{t.title}</h1>
        <p style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 20px", lineHeight: 1.5 }}>
          {t.intro}
        </p>
        <p style={{ fontSize: 13, color: "var(--fg-2)", margin: "-12px 0 20px", fontWeight: 700 }}>
          {t.proPrice(m.plans.priceText(PRO_PRICE.month, PRO_PRICE.year))}
        </p>

        {/* Current plan */}
        {access && (
          <div style={{
            background: access.plan === "FREE" ? "var(--surface)" : "var(--hero-grad)",
            color: access.plan === "FREE" ? "var(--fg)" : "#fff",
            border: access.plan === "FREE" ? "1px solid var(--border)" : "none",
            borderRadius: 20, padding: "18px 20px", marginBottom: 18,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.7, marginBottom: 4 }}>{t.familyPlan}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>
              {access.plan === "PRO" ? t.planPro : access.plan === "TRIAL" ? t.planTrial : t.planFree}
            </div>
            <div style={{ fontSize: 13, marginTop: 4, opacity: 0.85 }}>
              {access.plan === "PRO" && (access.proForever ? t.proOn : access.proUntil ? t.proUntil(fmt(access.proUntil)) : "")}
              {access.plan === "TRIAL" && t.trialLeft(access.trialDaysLeft)}
              {access.plan === "FREE" && (access.proRequested ? t.proRequested : access.trialUsed ? t.trialUsed : t.tryPro)}
            </div>
            {/* 2026-10-09 (persona review): say what happens when the trial ends. */}
            {(access.plan === "TRIAL" || (access.plan === "FREE" && access.trialUsed)) && (
              <div style={{ fontSize: 12.5, marginTop: 10, opacity: 0.85, lineHeight: 1.5 }}>
                {access.plan === "TRIAL" ? t.afterTrial : t.afterTrialFree}
              </div>
            )}
          </div>
        )}

        {!hasHousehold && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 16, marginBottom: 18, fontSize: 14, color: "var(--fg-2)" }}>
            {t.perFamily}<Link href="/profile" style={{ color: "var(--accent)", fontWeight: 700 }}>{t.createFamily}</Link>{t.first}
          </div>
        )}

        {/* Comparison */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden", marginBottom: 20, boxShadow: "var(--shadow)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 64px 72px", alignItems: "center", padding: "12px 16px", background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{t.whatYouGet}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--fg-2)", textAlign: "center" }}>{m.plans.free}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--accent)", textAlign: "center" }}>{m.plans.pro}</span>
          </div>
          {ROWS.map((r, i) => (
            <div key={r.key} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 64px 72px", alignItems: "center", padding: "12px 16px", borderTop: i ? "1px solid var(--border-soft)" : "none" }}>
              <span style={{ fontSize: 14, color: "var(--fg)", lineHeight: 1.35 }}>{r.icon} {m.plans.rows[r.key]?.label ?? r.label}</span>
              <span style={{ textAlign: "center" }}><Cell v={r.free} m={m} /></span>
              <span style={{ textAlign: "center" }}><Cell v={r.pro} m={m} /></span>
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
                  {busy === "trial" ? t.starting : t.startTrial}
                </button>
              )}
              <button onClick={requestPro} disabled={!!busy || access.proRequested} style={btn(!access.canStartTrial)}>
                {busy === "request" ? m.common.sending : access.proRequested ? t.requestedBtn : t.iWantPro}
              </button>
              <p style={{ fontSize: 12, color: "var(--subtle)", textAlign: "center", margin: "4px 0 0", lineHeight: 1.5 }}>
                {t.paymentsSoon}
              </p>
            </div>
          ) : (
            <p style={{ fontSize: 14, color: "var(--muted)", textAlign: "center" }}>{t.askParent}</p>
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
    color: primary ? "var(--on-accent)" : "var(--fg)",
  };
}
