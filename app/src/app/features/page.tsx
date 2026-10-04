"use client";
import Link from "next/link";
import { PLAN_ROWS, PRO_PRICE, type PlanRow } from "@/lib/plans";
import { TRIAL_DAYS } from "@/lib/entitlements";
import { useM } from "@/lib/i18n/client";
import type { Messages } from "@/lib/i18n/messages";

// 2026-10-04 (Mikael, phone test item 9): "See how it works" rewritten to
// match the app as it is now — child accounts with their own week, homework
// & tests with SchoolSoft import, one calendar for everything, photos,
// light/dark mode — and the Free/Pro split from lib/plans.ts (the old page
// still said 7-day trial and had shopping list + calendar sync under Pro).

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

// Texts: messages.landing.features (steps + highlights, same order as the icons).
const HIGHLIGHT_ICONS = ["🏠", "🧒", "📚", "📅", "🛒", "🎁", "🖼️", "🌗"];

export default function FeaturesPage() {
  const m = useM();
  const t = m.landing.features;
  const STEPS = t.steps.map((s, i) => ({ n: i + 1, ...s }));
  const HIGHLIGHTS = t.highlights.map((h, i) => ({ icon: HIGHLIGHT_ICONS[i], ...h }));
  const priceText = m.plans.priceText(PRO_PRICE.month, PRO_PRICE.year);
  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT, overflowX: "hidden" }}>

      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        maxWidth: "var(--content-max-width)", margin: "0 auto", width: "100%",
        padding: "20px 20px 0", boxSizing: "border-box",
      }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔔</div>
          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--fg)" }}>Reminder for Simplicity</span>
        </Link>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          <Link href="/login" style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)", textDecoration: "none", padding: "8px 14px", border: "1.5px solid var(--accent-border)", borderRadius: 50 }}>
            {m.landing.logIn}
          </Link>
        </span>
      </header>

      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", width: "100%", padding: "36px 20px 0", boxSizing: "border-box" }}>
        <h1 style={{ fontSize: "clamp(28px, 7vw, 38px)", fontWeight: 800, color: "var(--fg)", lineHeight: 1.15, letterSpacing: "-0.5px", margin: "0 0 12px", textAlign: "center" }}>
          {t.titleA}<span style={{ color: "var(--accent)" }}>{t.titleB}</span>
        </h1>
        <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.6, maxWidth: 420, margin: "0 auto", textAlign: "center" }}>
          {t.intro}
        </p>

        {/* Steps */}
        <section style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 10 }}>
          {STEPS.map((s) => (
            <div key={s.n} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px 18px", boxShadow: "var(--shadow)" }}>
              <span style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent-bg)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{s.n}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--fg)", marginBottom: 3 }}>{s.title}</div>
                <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.5 }}>{s.text}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Highlights */}
        <h2 style={{ fontSize: 19, fontWeight: 800, color: "var(--fg)", margin: "40px 0 14px" }}>{t.insideTitle}</h2>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))", gap: 10 }}>
          {HIGHLIGHTS.map((f) => (
            <div key={f.title} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px 16px" }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--fg)", marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>{f.text}</div>
            </div>
          ))}
        </section>

        {/* Free vs Pro */}
        <h2 id="plans" style={{ fontSize: 19, fontWeight: 800, color: "var(--fg)", margin: "40px 0 6px" }}>{t.plansTitle}</h2>
        <p style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
          {t.plansIntro}
        </p>
        <PlanTable rows={PLAN_ROWS} m={m} />
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <PriceCard title={m.plans.free} price={t.freePrice} note={t.freeNote} />
          <PriceCard title={m.plans.pro} price={priceText} note={t.proNote(m.plans.trialText(TRIAL_DAYS))} accent />
        </div>
      </main>

      <div style={{ padding: "36px 20px 20px", display: "flex", gap: 12, maxWidth: "var(--content-max-width)", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <Link href="/register" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", borderRadius: 50, background: "var(--accent-bg)", fontSize: 16, fontWeight: 700, color: "#fff", textDecoration: "none", boxShadow: "0 6px 18px rgba(74,95,213,0.28)" }}>
          {m.landing.getStarted}
        </Link>
        <Link href="/login" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", borderRadius: 50, background: "var(--surface)", border: "1.5px solid var(--border)", fontSize: 16, fontWeight: 700, color: "var(--fg)", textDecoration: "none" }}>
          {m.landing.logIn}
        </Link>
      </div>

      <p style={{ textAlign: "center", fontSize: 12, color: "var(--subtle)", padding: "0 24px 32px" }}>
        <Link href="/privacy" style={{ color: "var(--subtle)", textDecoration: "underline" }}>{t.privacyPolicy}</Link>
      </p>
    </div>
  );
}

function Mark({ v, m }: { v: boolean | string; m: Messages }) {
  if (typeof v === "string") return <span style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-2)" }}>{m.plans.cellValues[v] ?? v}</span>;
  return v
    ? <span aria-label={m.plans.included} style={{ color: "var(--success)", fontWeight: 800, fontSize: 16 }}>✓</span>
    : <span aria-label={m.plans.notIncluded} style={{ color: "var(--faint)", fontWeight: 800 }}>—</span>;
}

function PlanTable({ rows, m }: { rows: PlanRow[]; m: Messages }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden", boxShadow: "var(--shadow)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 60px 70px", padding: "11px 16px", background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
        <span />
        <span style={{ textAlign: "center", fontSize: 12, fontWeight: 800, color: "var(--fg-2)" }}>{m.plans.free}</span>
        <span style={{ textAlign: "center", fontSize: 12, fontWeight: 800, color: "var(--accent)" }}>{m.plans.pro}</span>
      </div>
      {rows.map((r, i) => (
        <div key={r.key} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 60px 70px", alignItems: "center", padding: "12px 16px", borderTop: i ? "1px solid var(--border-soft)" : "none" }}>
          <div style={{ paddingRight: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>{r.icon} {m.plans.rows[r.key]?.label ?? r.label}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4, marginTop: 2 }}>{m.plans.rows[r.key]?.detail ?? r.detail}</div>
          </div>
          <span style={{ textAlign: "center" }}><Mark v={r.free} m={m} /></span>
          <span style={{ textAlign: "center" }}><Mark v={r.pro} m={m} /></span>
        </div>
      ))}
    </div>
  );
}

function PriceCard({ title, price, note, accent }: { title: string; price: string; note: string; accent?: boolean }) {
  return (
    <div style={{ flex: "1 1 200px", background: accent ? "var(--tint-accent)" : "var(--surface)", border: `1.5px solid ${accent ? "var(--accent-border)" : "var(--border)"}`, borderRadius: 16, padding: "14px 16px" }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: accent ? "var(--accent)" : "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: "var(--fg)", margin: "4px 0" }}>{price}</div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>{note}</div>
    </div>
  );
}
