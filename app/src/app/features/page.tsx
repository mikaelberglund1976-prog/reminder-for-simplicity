"use client";
import Link from "next/link";
import { PLAN_ROWS, PRO_PRICE_TEXT, TRIAL_TEXT, type PlanRow } from "@/lib/plans";

// 2026-10-04 (Mikael, phone test item 9): "See how it works" rewritten to
// match the app as it is now — child accounts with their own week, homework
// & tests with SchoolSoft import, one calendar for everything, photos,
// light/dark mode — and the Free/Pro split from lib/plans.ts (the old page
// still said 7-day trial and had shopping list + calendar sync under Pro).

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

const STEPS = [
  { n: 1, title: "Create your family", text: "Sign up with email or Google and invite the other adults. Free." },
  { n: 2, title: "Add the kids", text: "Each child gets their own login — email or Google — and their own week." },
  { n: 3, title: "Everything lands in one place", text: "Home shows what's coming up. The calendar shows bills, birthdays, tests, homework and activities together." },
];

const HIGHLIGHTS = [
  { icon: "🏠", title: "Home that shows what matters", text: "What's coming up this week, each child's next tests and chores — and one tap to everything else." },
  { icon: "🧒", title: "The kids' own week", text: "Children see their homework, tests, chores and activities — not your bills." },
  { icon: "📚", title: "Homework & tests from SchoolSoft", text: "Paste the calendar link from SchoolSoft once per child; tests and homework show up by themselves, once a day." },
  { icon: "📅", title: "One calendar for everything", text: "Reminders, tests, homework and activities on the same month view — and in your phone's calendar if you want." },
  { icon: "🛒", title: "Shopping list everyone uses", text: "Sorted by store section, updated live, shareable with a link." },
  { icon: "🎁", title: "Wishlists without spoilers", text: "Kids add wishes; adults reserve and buy without the child seeing it." },
  { icon: "🖼️", title: "Your family's faces", text: "Profile pictures for everyone and a family photo on top of Home." },
  { icon: "🌗", title: "Light and dark", text: "Follows your phone, or pick one. Add it to your home screen and it works like an app." },
];

export default function FeaturesPage() {
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
        <Link href="/login" style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)", textDecoration: "none", padding: "8px 14px", border: "1.5px solid var(--accent-border)", borderRadius: 50 }}>
          Log in
        </Link>
      </header>

      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", width: "100%", padding: "36px 20px 0", boxSizing: "border-box" }}>
        <h1 style={{ fontSize: "clamp(28px, 7vw, 38px)", fontWeight: 800, color: "var(--fg)", lineHeight: 1.15, letterSpacing: "-0.5px", margin: "0 0 12px", textAlign: "center" }}>
          How it <span style={{ color: "var(--accent)" }}>works</span>
        </h1>
        <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.6, maxWidth: 420, margin: "0 auto", textAlign: "center" }}>
          One calm place for the whole family — the bills and birthdays for the adults, the school week for the kids.
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
        <h2 style={{ fontSize: 19, fontWeight: 800, color: "var(--fg)", margin: "40px 0 14px" }}>What's inside</h2>
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
        <h2 id="plans" style={{ fontSize: 19, fontWeight: 800, color: "var(--fg)", margin: "40px 0 6px" }}>Free and Pro</h2>
        <p style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
          Free covers the adults: reminders, the calendar and a shared shopping list. Pro adds everything for the kids.
        </p>
        <PlanTable rows={PLAN_ROWS} />
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <PriceCard title="Free" price="SEK 0" note="Forever. One small sponsored card for adults." />
          <PriceCard title="Pro" price={PRO_PRICE_TEXT} note={`${TRIAL_TEXT} first, no card needed. Per family.`} accent />
        </div>
      </main>

      <div style={{ padding: "36px 20px 20px", display: "flex", gap: 12, maxWidth: "var(--content-max-width)", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <Link href="/register" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", borderRadius: 50, background: "var(--accent-bg)", fontSize: 16, fontWeight: 700, color: "#fff", textDecoration: "none", boxShadow: "0 6px 18px rgba(74,95,213,0.28)" }}>
          Get started free
        </Link>
        <Link href="/login" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", borderRadius: 50, background: "var(--surface)", border: "1.5px solid var(--border)", fontSize: 16, fontWeight: 700, color: "var(--fg)", textDecoration: "none" }}>
          Log in
        </Link>
      </div>

      <p style={{ textAlign: "center", fontSize: 12, color: "var(--subtle)", padding: "0 24px 32px" }}>
        <Link href="/privacy" style={{ color: "var(--subtle)", textDecoration: "underline" }}>Privacy Policy</Link>
      </p>
    </div>
  );
}

function Mark({ v }: { v: boolean | string }) {
  if (typeof v === "string") return <span style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-2)" }}>{v}</span>;
  return v
    ? <span aria-label="Included" style={{ color: "var(--success)", fontWeight: 800, fontSize: 16 }}>✓</span>
    : <span aria-label="Not included" style={{ color: "var(--faint)", fontWeight: 800 }}>—</span>;
}

function PlanTable({ rows }: { rows: PlanRow[] }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden", boxShadow: "var(--shadow)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 60px 70px", padding: "11px 16px", background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
        <span />
        <span style={{ textAlign: "center", fontSize: 12, fontWeight: 800, color: "var(--fg-2)" }}>Free</span>
        <span style={{ textAlign: "center", fontSize: 12, fontWeight: 800, color: "var(--accent)" }}>Pro</span>
      </div>
      {rows.map((r, i) => (
        <div key={r.label} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 60px 70px", alignItems: "center", padding: "12px 16px", borderTop: i ? "1px solid var(--border-soft)" : "none" }}>
          <div style={{ paddingRight: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>{r.icon} {r.label}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4, marginTop: 2 }}>{r.detail}</div>
          </div>
          <span style={{ textAlign: "center" }}><Mark v={r.free} /></span>
          <span style={{ textAlign: "center" }}><Mark v={r.pro} /></span>
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
