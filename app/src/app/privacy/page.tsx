import Link from "next/link";
import { ADMIN_EMAIL } from "@/lib/adminConfig";
import { CONSENT_VERSION } from "@/lib/consent-version";

// 2026-09-29: the privacy notice, published (replaces the 2026-07-28
// scaffold). Written from the GDPR review in the project ("GDPR-genomgång:
// Reminder for Simplicity") and the code as it runs. Two facts are still
// pending and are stated honestly on the page rather than invented: the
// company that will take over as controller, and signed processor agreements.
// Keep CONSENT_VERSION (lib/consent-version.ts) in step when the text changes
// in substance — guardian confirmations record which version they saw.

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

export const metadata = { title: "Privacy notice – Reminder for Simplicity" };

function H({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)", margin: "32px 0 10px", letterSpacing: "-0.2px" }}>{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 15, color: "var(--fg-2)", lineHeight: 1.65, margin: "0 0 12px" }}>{children}</p>;
}
function UL({ items }: { items: React.ReactNode[] }) {
  return (
    <ul style={{ margin: "0 0 12px", paddingLeft: 20, color: "var(--fg-2)", fontSize: 15, lineHeight: 1.65 }}>
      {items.map((it, i) => <li key={i} style={{ marginBottom: 6 }}>{it}</li>)}
    </ul>
  );
}

const cell: React.CSSProperties = { padding: "9px 10px", borderTop: "1px solid var(--border)", verticalAlign: "top", fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.5 };
const head: React.CSSProperties = { ...cell, fontWeight: 800, color: "var(--fg)", borderTop: "none", background: "var(--surface-2)" };

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT, overflowX: "hidden" }}>
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        maxWidth: 760, margin: "0 auto", width: "100%", padding: "24px 20px 0", boxSizing: "border-box",
      }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔔</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "var(--fg)" }}>Reminder for Simplicity</span>
        </Link>
        <Link href="/login" style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>Log in</Link>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "28px 20px 80px", boxSizing: "border-box" }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: "var(--fg)", margin: "0 0 6px", letterSpacing: "-0.6px" }}>Privacy notice</h1>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>Version {CONSENT_VERSION} · applies to the app at this address</div>

        <div style={{ background: "var(--tint-accent)", borderRadius: 16, padding: "14px 16px", marginBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--fg)", marginBottom: 6 }}>The short version</div>
          <UL items={[
            "We keep what you and your family put in the app — reminders, lists, homework, chores, activities, wishlists and photos — so the app can show it to your family and remind you.",
            "Only people in your family see your family's things. Children only see their own things and the shared shopping list.",
            "We never sell your data and never use it for ad targeting. Free adults may see our own simple ads; children and Pro families never do.",
            "You can download everything (Settings → Export my data) and delete your account at any time.",
          ]} />
        </div>

        <H>1. Who is responsible</H>
        <P>
          Reminder for Simplicity is run by Mikael Berglund, Sweden, who is the data controller for the personal data in the app.
          When the service moves into a registered company, its name, organisation number and address will be listed here and you will be told in the app.
        </P>
        <P>Contact for anything about your data: <a href={`mailto:${ADMIN_EMAIL}`} style={{ color: "var(--accent)", fontWeight: 700 }}>{ADMIN_EMAIL}</a>. We answer requests within one month.</P>

        <H>2. What we keep and why</H>
        <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface)", marginBottom: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
            <thead>
              <tr><th style={head}>What</th><th style={head}>Why</th><th style={head}>Legal basis (GDPR art. 6)</th></tr>
            </thead>
            <tbody>
              <tr><td style={cell}>Name, email, optional phone, time zone, currency; a hashed password or a Google sign-in link</td><td style={cell}>Your account and logging in</td><td style={cell}>Contract</td></tr>
              <tr><td style={cell}>Your family and each person&apos;s role</td><td style={cell}>Sharing lists and the calendar with the right people</td><td style={cell}>Contract</td></tr>
              <tr><td style={cell}>Reminders (with amounts and categories you choose), shopping lists, wishlists, chores, activities, homework and tests</td><td style={cell}>Showing them, and emailing you reminders you asked for</td><td style={cell}>Contract</td></tr>
              <tr><td style={cell}>Profile pictures and a family photo</td><td style={cell}>Showing who is who — only if you add them</td><td style={cell}>Consent (remove any time)</td></tr>
              <tr><td style={cell}>Confirmed email, admin approval of new accounts, deletion requests</td><td style={cell}>Keeping accounts secure</td><td style={cell}>Legitimate interest</td></tr>
              <tr><td style={cell}>Ideas &amp; votes</td><td style={cell}>The shared ideas board — your name is shown to other users</td><td style={cell}>Legitimate interest</td></tr>
              <tr><td style={cell}>Ad impressions and clicks, as totals only</td><td style={cell}>Reporting to advertisers, no profiles about you</td><td style={cell}>Legitimate interest</td></tr>
            </tbody>
          </table>
        </div>
        <P>
          We don&apos;t ask for your age, address or ID number. If you write health-related things (for example a doctor&apos;s appointment in the &quot;Health&quot; category), that is your choice; we only store and show it to the people you share it with.
        </P>

        <H>3. Children</H>
        <P>
          A child&apos;s account is always added by a parent or guardian in the family, who confirms that they are the child&apos;s guardian and accepts this notice on the child&apos;s behalf.
          The family&apos;s agreement with us is the legal basis; we don&apos;t ask children for their own consent.
          You must be at least 13 to create an account on your own; younger children are added by a parent.
        </P>
        <UL items={[
          "Children see only their own homework, tests, chores, activities and wishlist, plus the family shopping list.",
          "Adults in the family can see what a child has, and a parent can delete a child's account.",
          "Children never see ads.",
          "A child's photo is only shown inside the family.",
        ]} />

        <H>4. Who helps us run the app</H>
        <P>These companies process data for us under their data processing terms. Nothing is shared with anyone else unless the law requires it.</P>
        <UL items={[
          <><b>Supabase</b> — database, stored in Frankfurt, Germany (EU).</>,
          <><b>Vercel</b> — hosting; the app runs in Frankfurt (EU). Vercel is a US company.</>,
          <><b>Resend</b> — sends our emails; US company. Transfers outside the EU rely on the EU–US Data Privacy Framework or the EU standard contractual clauses.</>,
          <><b>Google</b> — only if you choose &quot;Continue with Google&quot;. We keep your Google account id, not your Google password or tokens.</>,
          <><b>Open Food Facts</b> (France) — only when you scan a barcode, your browser looks the code up there.</>,
        ]} />

        <H>5. How long we keep it</H>
        <UL items={[
          "As long as you have an account.",
          "When an account is deleted it is hidden at once and kept for 60 days in case you change your mind — then it is removed for good, including your profile picture.",
          "Things you created for the family (for example shared reminders) stay with the family; things only about you go with your account.",
          "Backups at our database provider can hold deleted data for a short time before they are overwritten.",
          "Invitations expire after 48 hours (adults) or 7 days (children).",
        ]} />

        <H>6. Your rights</H>
        <UL items={[
          <><b>See and download</b> your data: Settings → Export my data.</>,
          <><b>Correct</b> it: change your details in Settings.</>,
          <><b>Delete</b> it: Settings → Delete account (a family admin approves, or you confirm yourself if you are the admin).</>,
          <><b>Withdraw consent</b> for photos: Family members → Remove photo.</>,
          <><b>Object or restrict</b> processing, or ask anything else: email us (section 1).</>,
          <><b>Complain</b> to the Swedish Authority for Privacy Protection (IMY), <a href="https://www.imy.se" style={{ color: "var(--accent)" }}>imy.se</a>.</>,
        ]} />
        <P>For children, the parent or guardian uses these rights on the child&apos;s behalf.</P>

        <H>7. Security</H>
        <P>
          Everything goes over HTTPS. Passwords are stored as bcrypt hashes and links in our emails as one-way hashes. Access is checked on the server for every request.
          One thing works without logging in, on purpose: your personal calendar subscription link — anyone who has that link can read your calendar, so keep it to yourself. You can get a new link (which stops the old one) in Settings.
          If a data breach puts you at risk, we tell the authority within 72 hours and tell you without delay.
        </P>

        <H>8. Cookies</H>
        <P>We only use the cookies needed to keep you logged in. No tracking or advertising cookies. Your theme and view choices are saved in your own browser.</P>

        <H>9. Changes</H>
        <P>When this notice changes in a way that matters, we show it in the app and update the version at the top.</P>

        <div style={{ marginTop: 32, fontSize: 13, color: "var(--muted)" }}>
          <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>← Back</Link>
        </div>
      </main>
    </div>
  );
}
