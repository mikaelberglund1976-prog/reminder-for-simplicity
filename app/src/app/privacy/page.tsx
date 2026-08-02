"use client";
import Link from "next/link";

// Scaffold only — structure + what a GDPR-facing privacy policy needs to
// cover, built 2026-07-28 per direct request ("förbered policy sidan med de
// delar som behöver fyllas, sen kan vi bestämma innehåll"). Every section
// with a <TodoBox> is an open decision or a piece of real information that
// hasn't been decided/confirmed yet — see TODO.md Körordning (punkt 12,
// steg 3-4) for the two decisions that block parts of this (minimum age for
// child profiles, retention period). Nothing here should be treated as a
// legally reviewed policy until the TodoBoxes are gone and a human (ideally
// with legal input) has read the final copy.

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const LAST_UPDATED = "Draft — not yet published";

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F5F4F0", fontFamily: FONT, overflowX: "hidden" }}>

      {/* Header — same pattern as /features */}
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

      {/* Draft banner — remove once content is finalized */}
      <div style={{ maxWidth: "var(--content-max-width)", margin: "20px auto 0", padding: "0 24px", boxSizing: "border-box" }}>
        <div style={{
          background: "#FFF3CC", border: "1px solid #FDE68A", borderRadius: 14,
          padding: "12px 16px", fontSize: 13, color: "#92400E", lineHeight: 1.5,
        }}>
          🚧 <strong>This page is a structural draft, not a published policy.</strong> Every yellow box below marks something that needs a real decision or a real piece of information before this can go live — see the list at the bottom for a single consolidated view.
        </div>
      </div>

      {/* Hero */}
      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", width: "100%", padding: "28px 24px 0", boxSizing: "border-box" }}>
        <h1 style={{ fontSize: "clamp(26px, 6vw, 34px)", fontWeight: 800, color: "#1C1C28", lineHeight: 1.2, letterSpacing: "-0.5px", margin: "0 0 8px" }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 13, color: "#ACA9A3", margin: "0 0 32px" }}>
          Last updated: {LAST_UPDATED}
        </p>

        <Section title="1. Who we are">
          <p>
            Reminder for Simplicity ("we", "us") provides a shared reminders, shopping list, wishlist,
            chores, school, and activities app for families.
          </p>
          <TodoBox>
            Legal entity name, organisationsnummer (or equivalent), and registered address — needed here
            as the formal "data controller" identity before this page can be published.
          </TodoBox>
        </Section>

        <Section title="2. What personal data we collect">
          <ul style={listStyle}>
            <li><b>Account data:</b> name, email address, phone (optional), preferred currency, timezone, and either a hashed password or a hashed PIN.</li>
            <li><b>If you sign in with Google:</b> your name, email, and profile picture as provided by Google.</li>
            <li><b>Content you create:</b> reminders, chores, shopping list and wishlist items, school and activity entries, calendar sync tokens, and suggestions/votes you post.</li>
            <li><b>Child profiles:</b> a name, a hashed PIN, and a real email address (yours, an alias, or the child's own) — set up and managed by an approved adult in the household.</li>
          </ul>
        </Section>

        <Section title="3. Why we process it">
          <ul style={listStyle}>
            <li><b>To provide the service</b> you signed up for (performance of a contract) — storing and showing your reminders, lists, and household data.</li>
            <li><b>Legitimate interest</b> — sending the email reminders you asked for, keeping accounts secure (e.g. the admin approval gate for new signups).</li>
          </ul>
          <TodoBox>
            Confirm we send no marketing/promotional email today (only transactional: reminders, invites,
            password reset, approval notices). If that ever changes, this section needs a consent-based
            legal basis added.
          </TodoBox>
        </Section>

        <Section title="4. Children's data & parental consent">
          <p>
            Child profiles are created by an already-approved adult in the household, not by the child
            directly. A real email address is required at creation (see auth changes, 2026-07-27).
          </p>
          <TodoBox>
            <b>Open decision, not yet made</b> (see <code>TODO.md</code> Körordning, steg 3): a declared
            minimum age for child profiles, and confirmation of who is treated as giving consent — the
            inviting parent, or a separate consent step. This section can't be finalized until that's
            decided.
          </TodoBox>
        </Section>

        <Section title="5. Where your data is stored">
          <p>
            Our database (Supabase) is hosted in the <b>eu-central-1</b> region (Frankfurt, Germany) —
            inside the EU.
          </p>
          <TodoBox>
            Confirm the hosting/processing region used by Vercel (our application host) and whether it
            offers EU data residency or an equivalent commitment — Vercel is a US-headquartered company.
          </TodoBox>
        </Section>

        <Section title="6. Who else processes data on our behalf">
          <ul style={listStyle}>
            <li><b>Supabase</b> — database hosting (EU region, see above).</li>
            <li><b>Vercel</b> — application hosting.</li>
            <li><b>Resend</b> — transactional email delivery.</li>
            <li><b>Google</b> — only if you choose to sign in with Google or subscribe to our outgoing calendar feed from a Google Calendar.</li>
          </ul>
          <TodoBox>
            Confirm the data processing agreement (DPA) / EU-US Data Privacy Framework status for Vercel
            and Resend (both US companies). Also: the current outgoing email sender address
            (<code>onboarding@resend.dev</code>) is a Resend test domain — needs a real domain before
            this page (or the product) is presented to real users, independent of the privacy question.
          </TodoBox>
        </Section>

        <Section title="7. How long we keep your data">
          <TodoBox>
            <b>Open decision, not yet made</b> (see <code>TODO.md</code> Körordning, steg 4): a retention
            period after account deletion. Self-service "delete my account" isn't built yet either — until
            it is, deletion has to be requested manually.
          </TodoBox>
        </Section>

        <Section title="8. Your rights">
          <ul style={listStyle}>
            <li><b>Access & export</b> — already available: Profile → "Export your data" downloads everything as JSON.</li>
            <li><b>Correct</b> — edit your own name, email, phone, etc. directly in Profile.</li>
            <li><b>Delete</b> — <TodoInline>not self-service yet; contact us (see section 10) until it is.</TodoInline></li>
            <li><b>Object / restrict processing</b> — <TodoInline>describe the process once decided.</TodoInline></li>
            <li>
              <b>Complain to a supervisory authority</b> — in Sweden, the{" "}
              <a href="https://www.imy.se" target="_blank" rel="noreferrer" style={{ color: "#4A5FD5" }}>
                Swedish Authority for Privacy Protection (IMY)
              </a>.
            </li>
          </ul>
        </Section>

        <Section title="9. Cookies & tracking">
          <p>
            We use only strictly necessary cookies (keeping you signed in). We don't currently use any
            analytics or advertising trackers.
          </p>
          <TodoBox>
            Keep this true, or update this section, if any analytics tool is ever added.
          </TodoBox>
        </Section>

        <Section title="10. Security">
          <p>
            Passwords and PINs are stored hashed, never in plain text. Data in transit is encrypted (HTTPS).
          </p>
        </Section>

        <Section title="11. Changes to this policy">
          <p>
            We'll update the date at the top of this page whenever it changes.
          </p>
          <TodoBox>
            Decide how users are notified of material changes — email, an in-app banner, or neither for minor edits.
          </TodoBox>
        </Section>

        <Section title="12. Contact">
          <TodoBox>
            A real contact email/address for privacy questions — not a test address.
          </TodoBox>
        </Section>

        {/* Consolidated checklist */}
        <div style={{ margin: "36px 0 56px" }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1C1C28", margin: "0 0 12px" }}>
            Everything that needs a decision or real content before this can be published
          </h2>
          <ol style={{ ...listStyle, paddingLeft: 20 }}>
            <li>Legal entity name, org number, registered address (§1)</li>
            <li>Minimum age for child profiles + who gives consent (§4) — open Körordning item</li>
            <li>Vercel's data residency / DPA status (§5, §6)</li>
            <li>Resend's DPA status + a real sending domain (§6)</li>
            <li>Data retention period after account deletion (§7)</li>
            <li>Self-service account deletion — not built yet (§8)</li>
            <li>Real contact email/address (§12)</li>
          </ol>
        </div>
      </main>
    </div>
  );
}

const listStyle: React.CSSProperties = { margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1C1C28", margin: "0 0 10px" }}>{title}</h2>
      <div style={{ fontSize: 14, color: "#4B5563", lineHeight: 1.65, display: "flex", flexDirection: "column", gap: 10 }}>
        {children}
      </div>
    </section>
  );
}

function TodoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "#FFF9E6", border: "1px dashed #FDE68A", borderRadius: 10,
      padding: "10px 14px", fontSize: 13, color: "#92400E", lineHeight: 1.55,
    }}>
      <b>Needs a decision / real content:</b> {children}
    </div>
  );
}

function TodoInline({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "#B45309", fontStyle: "italic" }}>[{children}]</span>;
}
