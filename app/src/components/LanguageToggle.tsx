"use client";

// 2026-10-04: small language switch for the public pages (start page, log in,
// sign up). Remembered on this device; once logged in, the family's language
// set by a family admin takes over.
import { useI18n } from "@/lib/i18n/client";
import { LOCALES, LOCALE_NAMES } from "@/lib/i18n/config";

export default function LanguageToggle({ style }: { style?: React.CSSProperties }) {
  const { locale, setLocale, m } = useI18n();
  return (
    <div role="group" aria-label={m.language.label} style={{ display: "inline-flex", gap: 4, fontSize: 12.5, fontWeight: 700, ...style }}>
      {LOCALES.map((l, i) => (
        <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {i > 0 && <span style={{ color: "var(--faint)" }}>·</span>}
          <button
            type="button"
            onClick={() => setLocale(l)}
            aria-pressed={locale === l}
            style={{
              background: "none", border: "none", padding: "4px 2px", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", fontWeight: "inherit",
              color: locale === l ? "var(--fg)" : "var(--muted)", textDecoration: locale === l ? "underline" : "none", textUnderlineOffset: 3,
            }}
          >
            {LOCALE_NAMES[l]}
          </button>
        </span>
      ))}
    </div>
  );
}
