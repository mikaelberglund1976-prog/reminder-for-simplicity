"use client";

// 2026-10-04: the family's language. A family admin picks it; everyone else
// sees it read-only. Changing it switches this device at once — the others
// follow the next time they open the app (lib/i18n/client.tsx).
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_NAMES, isLocale, type Locale } from "@/lib/i18n/config";
import { invalidateMe } from "@/lib/me";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

export default function LanguageSetting({ heading = true }: { heading?: boolean }) {
  const { m, locale, setLocale, err } = useI18n();
  const t = m.language;
  const [available, setAvailable] = useState<Locale[]>([]);
  const [current, setCurrent] = useState<Locale>(locale);
  const [canEdit, setCanEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    fetch("/api/household/language")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setAvailable((d.available ?? []).filter(isLocale));
        if (isLocale(d.effective)) setCurrent(d.effective);
        setCanEdit(!!d.canEdit);
      })
      .catch(() => {});
  }, []);

  async function choose(l: Locale) {
    if (!canEdit || l === current || busy) return;
    setBusy(true);
    setError(null);
    setFlash(false);
    try {
      const res = await fetch("/api/household/language", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: l }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ? err(d.error) : m.common.somethingWentWrong);
        return;
      }
      setCurrent(l);
      invalidateMe();
      setLocale(l);
      setFlash(true);
    } catch {
      setError(m.common.networkError);
    } finally {
      setBusy(false);
    }
  }

  if (available.length < 2) return null;

  return (
    <div style={{ fontFamily: FONT, marginTop: heading ? 22 : 0 }}>
      {heading && <div style={{ fontSize: 17, fontWeight: 800, color: "var(--fg)", margin: "0 0 10px" }}>{t.title}</div>}
      <div style={{ background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", padding: 14 }}>
        <div role="radiogroup" aria-label={t.label} style={{ display: "flex", gap: 6, padding: 4, borderRadius: 14, background: "var(--surface-3)", border: "1px solid var(--border)", opacity: busy ? 0.6 : 1 }}>
          {available.map((l) => {
            const active = current === l;
            return (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={!canEdit || busy}
                onClick={() => choose(l)}
                style={{
                  flex: 1, padding: "9px 10px", borderRadius: 10, border: "none", cursor: canEdit ? "pointer" : "default",
                  fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                  background: active ? "var(--surface)" : "transparent",
                  color: active ? "var(--fg)" : "var(--muted)",
                  boxShadow: active ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                }}
              >
                {LOCALE_NAMES[l]}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45, marginTop: 10 }}>
          {canEdit ? t.familyHint : t.onlyAdmins}
        </div>
        {flash && <div style={{ fontSize: 12.5, color: "var(--success)", fontWeight: 700, marginTop: 8 }}>✓ {t.changed}</div>}
        {error && <div style={{ fontSize: 12.5, color: "var(--danger)", marginTop: 8 }}>{error}</div>}
      </div>
    </div>
  );
}
