"use client";
import Link from "next/link";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

const FREE_FEATURES = [
  { icon: "🔔", title: "Unlimited reminders", text: "Bills, subscriptions, birthdays, insurance, contracts, health — anything with a date." },
  { icon: "✉️", title: "Email reminders", text: "Choose how many days ahead you want the heads-up." },
  { icon: "🏷️", title: "Categories & filters", text: "Keep things organized without any setup." },
  { icon: "👪", title: "Household sharing", text: "Invite your household and control who sees what — Private, Household, or Parents only." },
  { icon: "📅", title: "Calendar view", text: "See everything with a date laid out on a month grid." },
  { icon: "📲", title: "Add to your home screen", text: "Works like an app on your phone, no app store needed." },
];

const PRO_FEATURES = [
  { icon: "🛒", title: "Shared shopping list", text: "Multiple lists, smart categories, and a link you can share with anyone — no login required." },
  { icon: "🎁", title: "Kids' wishlist", text: "Kids add what they want; parents reserve or mark it bought — a child never sees that status, even in the data sent to their device." },
  { icon: "🧹", title: "Chores", text: "Recurring chores per child, self-completion, optional parent approval, and weekly stats." },
  { icon: "🎯", title: "Activity bookings", text: "Recurring activities per child — karate on Tuesdays, scouts on Thursdays, or any club, class, or practice in between." },
  { icon: "📚", title: "School tracker", text: "Upcoming tests and homework per child, with their own simple view." },
  { icon: "📣", title: "Family broadcasts", text: "Send an update to every adult in the household at once." },
  { icon: "🔗", title: "Outgoing calendar sync", text: "Subscribe from your own Google, Outlook, or Apple calendar." },
];

export default function FeaturesPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F5F4F0", fontFamily: FONT, overflowX: "hidden" }}>

      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        maxWidth: "var(--content-max-width)", margin: "0 auto", width: "100%",
        padding: "24px 24px 0", boxSizing: "border-box",
      }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "#1C1C28", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔔</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#1C1C28" }}>Reminder for Simplicity</span>
        </Link>
        <Link href="/login" style={{ fontSize: 14, fontWeight: 600, color: "#4A5FD5", textDecoration: "none" }}>
          Log in
        </Link>
      </header>

      {/* Hero */}
      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", width: "100%", padding: "40px 24px 0", boxSizing: "border-box", textAlign: "center" }}>
        <h1 style={{ fontSize: "clamp(28px, 7vw, 38px)", fontWeight: 800, color: "#1C1C28", lineHeight: 1.15, letterSpacing: "-0.5px", margin: "0 0 14px" }}>
          One calm place for everything your family needs to <span style={{ color: "#4A5FD5" }}>remember, buy, and want</span>
        </h1>
        <p style={{ fontSize: 15, color: "#7C7C8A", lineHeight: 1.6, maxWidth: 420, margin: "0 auto 8px" }}>
          Reminders are free, forever. Family features — shopping, wishlists, chores, and more — start with a 7-day free trial.
        </p>
      </main>

      {/* Free section */}
      <section style={{ maxWidth: "var(--content-max-width)", margin: "40px auto 0", width: "100%", padding: "0 24px", boxSizing: "border-box" }}>
        <SectionLabel badge="Free, forever" badgeColor="#2A9D6F" badgeBg="#E4F5EC">What's included for everyone</SectionLabel>
        <FeatureGrid items={FREE_FEATURES} />
      </section>

      {/* Pro section */}
      <section style={{ maxWidth: "var(--content-max-width)", margin: "40px auto 0", width: "100%", padding: "0 24px", boxSizing: "border-box" }}>
        <SectionLabel badge="7-day free trial, then Pro" badgeColor="#4A5FD5" badgeBg="#E4E7FB">Family plan</SectionLabel>
        <FeatureGrid items={PRO_FEATURES} />
      </section>

      {/* Free vs Pro table */}
      <section style={{ maxWidth: "var(--content-max-width)", margin: "44px auto 0", width: "100%", padding: "0 24px", boxSizing: "border-box" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1C1C28", margin: "0 0 14px" }}>Free vs. Pro</h2>
        <div style={{ background: "#fff", border: "1px solid #E4E3DE", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 56px 56px", padding: "12px 16px", background: "#F5F4F0" }}>
            <span />
            <span style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#7C7C8A", textTransform: "uppercase", letterSpacing: "0.04em" }}>Free</span>
            <span style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#4A5FD5", textTransform: "uppercase", letterSpacing: "0.04em" }}>Pro</span>
          </div>
          <CompareRow label="Reminders (bills, birthdays, subscriptions…)" free pro first />
          <CompareRow label="Household sharing & calendar view" free pro />
          <CompareRow label="Shared shopping list" pro />
          <CompareRow label="Kids' wishlist" pro />
          <CompareRow label="Chores, Activities & School tracking" pro />
          <CompareRow label="Family broadcasts & calendar sync" pro />
        </div>
        <p style={{ fontSize: 12, color: "#ACA9A3", margin: "10px 0 0", lineHeight: 1.5 }}>
          Pro pricing isn't final yet — we're in testing. Every account gets a 7-day free trial of the family plan before anything is charged.
        </p>
      </section>

      {/* Bottom CTA */}
      <div style={{
        padding: "40px 24px 56px",
        display: "flex", gap: 12, maxWidth: "var(--content-max-width)", margin: "0 auto", width: "100%",
        boxSizing: "border-box",
      }}>
        <Link href="/register" style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "17px", borderRadius: 50,
          background: "#1C1C28", border: "none",
          fontSize: 16, fontWeight: 600, color: "#fff",
          textDecoration: "none", boxShadow: "0 2px 10px rgba(26,35,64,0.2)",
        }}>
          Create account
        </Link>
        <Link href="/login" style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "17px", borderRadius: 50,
          background: "#fff", border: "1.5px solid #E4E3DE",
          fontSize: 16, fontWeight: 600, color: "#1C1C28",
          textDecoration: "none", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          Log in
        </Link>
      </div>

      <p style={{ textAlign: "center", fontSize: 12, color: "#ACA9A3", padding: "0 24px 32px" }}>
        <Link href="/privacy" style={{ color: "#ACA9A3", textDecoration: "underline" }}>Privacy Policy</Link>
      </p>

    </div>
  );
}

function SectionLabel({ children, badge, badgeColor, badgeBg }: { children: React.ReactNode; badge: string; badgeColor: string; badgeBg: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1C1C28", margin: 0 }}>{children}</h2>
      <span style={{
        display: "inline-flex", alignItems: "center", background: badgeBg, color: badgeColor,
        fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 50,
      }}>
        {badge}
      </span>
    </div>
  );
}

function FeatureGrid({ items }: { items: { icon: string; title: string; text: string }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((f) => (
        <div key={f.title} style={{
          display: "flex", gap: 14, alignItems: "flex-start",
          background: "#fff", border: "1px solid #E4E3DE", borderRadius: 14,
          padding: "16px 18px",
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: "#F5F4F0",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, flexShrink: 0,
          }}>
            {f.icon}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1C1C28", marginBottom: 3 }}>{f.title}</div>
            <div style={{ fontSize: 13, color: "#7C7C8A", lineHeight: 1.5 }}>{f.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CompareRow({ label, free, pro, first }: { label: string; free?: boolean; pro?: boolean; first?: boolean }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 56px 56px",
      alignItems: "center", padding: "14px 16px",
      borderTop: first ? "none" : "1px solid #F0EFEA",
    }}>
      <span style={{ fontSize: 13, color: "#1C1C28", fontWeight: 500, paddingRight: 8 }}>{label}</span>
      <span style={{ textAlign: "center", fontSize: 15 }}>{free ? "✅" : "—"}</span>
      <span style={{ textAlign: "center", fontSize: 15 }}>{pro ? "✅" : "—"}</span>
    </div>
  );
}
