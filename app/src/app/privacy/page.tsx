import Link from "next/link";
import { getRequestLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/config";
import { PrivacyEn } from "./PrivacyEn";
import { PrivacySv } from "./PrivacySv";

// 2026-09-29: the privacy notice, published (replaces the 2026-07-28
// scaffold). Written from the GDPR review in the project ("GDPR-genomgång:
// Reminder for Simplicity") and the code as it runs. Two facts are still
// pending and are stated honestly on the page rather than invented: the
// company that will take over as controller, and signed processor agreements.
// Keep CONSENT_VERSION (lib/consent-version.ts) in step when the text changes
// in substance — guardian confirmations record which version they saw.
//
// 2026-10-04: one full text per language (PrivacyEn.tsx, PrivacySv.tsx),
// picked from the visitor's language (cookie → browser). A new language
// without its own text shows the English one until it's written.

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

const BODIES: Partial<Record<Locale, () => React.ReactElement>> = { en: PrivacyEn, sv: PrivacySv };

export function generateMetadata() {
  const locale = getRequestLocale();
  return { title: locale === "sv" ? "Integritetsmeddelande – Reminder for Simplicity" : "Privacy notice – Reminder for Simplicity" };
}

export default function PrivacyPage() {
  const locale = getRequestLocale();
  const m = getMessages(locale);
  const Body = BODIES[locale] ?? PrivacyEn;
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
        <Link href="/login" style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>{m.common.logIn}</Link>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "28px 20px 80px", boxSizing: "border-box" }}>
        <Body />

        <div style={{ marginTop: 32, fontSize: 13, color: "var(--muted)" }}>
          <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>← {m.common.back}</Link>
        </div>
      </main>
    </div>
  );
}
