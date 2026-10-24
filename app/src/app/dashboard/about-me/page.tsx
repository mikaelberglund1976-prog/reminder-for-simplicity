"use client";

// 2026-10-24 (launch list row 62): "What does the app save about me?" — moved
// from the child's Home to More → About me (GDPR, launch list row 15). Same
// text as before; works for adults too.
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

export default function AboutMePage() {
  const { m } = useI18n();
  const t = m.childHome;
  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT, paddingBottom: 40 }}>
      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "28px 20px 0" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--fg)", margin: "0 0 14px", letterSpacing: "-0.4px" }}>{m.home3.aboutMe}</h1>
        <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "14px 16px", fontSize: 14, color: "var(--fg-2)", lineHeight: 1.6 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--fg)", margin: "0 0 6px" }}>🔒 {m.home3.aboutMeTitle}</h2>
          <ul style={{ margin: "6px 0 10px", paddingLeft: 18 }}>
            <li>{t.saved1}</li>
            <li>{t.saved2}</li>
            <li>{t.saved3}</li>
            <li>{t.saved4}</li>
            <li>{t.saved5}</li>
          </ul>
          <Link href="/privacy" style={{ color: "var(--accent)", fontWeight: 700, fontSize: 13 }}>{t.longVersion}</Link>
        </section>
      </main>
    </div>
  );
}
