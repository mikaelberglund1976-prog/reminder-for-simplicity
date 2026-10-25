"use client";

// 2026-10-04: the family's language. A family admin picks it; everyone else
// sees it read-only. Changing it switches this device at once — the others
// follow the next time they open the app (lib/i18n/client.tsx).
// 2026-10-25 (masterbrief §25, Etapp 0 G4): language per person. Everyone
// (children too) picks "My language": the family's, or one of their own. The
// family's language is now the default for those who haven't chosen; only
// admins change it.
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_NAMES, isLocale, type Locale } from "@/lib/i18n/config";
import { invalidateMe } from "@/lib/me";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const FAMILY = "family" as const;
type Choice = Locale | typeof FAMILY;

function Segmented<T extends string>({ label, options, value, disabled, onPick }: {
  label: string; options: { key: T; text: string }[]; value: T; disabled?: boolean; onPick: (k: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: "flex", gap: 6, padding: 4, borderRadius: 14, background: "var(--surface-3)", border: "1px solid var(--border)", opacity: disabled ? 0.6 : 1 }}>
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onPick(o.key)}
            style={{
              flex: 1, minHeight: 40, padding: "9px 8px", borderRadius: 10, border: "none", cursor: disabled ? "default" : "pointer",
              fontSize: 13, fontWeight: 700, fontFamily: "inherit",
              background: active ? "var(--surface)" : "transparent",
              color: active ? "var(--fg)" : "var(--muted)",
              boxShadow: active ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
            }}
          >
            {o.text}
          </button>
        );
      })}
    </div>
  );
}

export default function LanguageSetting({ heading = true }: { heading?: boolean }) {
  const { m, locale, setLocale, err } = useI18n();
  const t = m.language;
  const [available, setAvailable] = useState<Locale[]>([]);
  const [own, setOwn] = useState<Locale | null>(null);
  const [family, setFamily] = useState<Locale>(locale);
  const [canEdit, setCanEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/profile/language").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/household/language").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([mine, fam]) => {
      const list = ((mine?.available ?? fam?.available) ?? []).filter(isLocale);
      setAvailable(list);
      if (isLocale(mine?.own)) setOwn(mine.own);
      if (isLocale(fam?.effective)) setFamily(fam.effective);
      setCanEdit(!!fam?.canEdit);
    });
  }, []);

  async function send(url: string, body: unknown): Promise<Record<string, unknown> | null> {
    setBusy(true);
    setError(null);
    setFlash(false);
    try {
      const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ? err(d.error) : m.common.somethingWentWrong);
        return null;
      }
      return d;
    } catch {
      setError(m.common.networkError);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function chooseOwn(c: Choice) {
    const next = c === FAMILY ? null : c;
    if (next === own || busy) return;
    const d = await send("/api/profile/language", { language: next });
    if (!d) return;
    setOwn(next);
    invalidateMe();
    setLocale(isLocale(d.effective) ? d.effective : next ?? family);
    setFlash(true);
  }

  async function chooseFamily(l: Locale) {
    if (!canEdit || l === family || busy) return;
    const d = await send("/api/household/language", { language: l });
    if (!d) return;
    setFamily(l);
    invalidateMe();
    // Only this person's screen follows when they haven't picked their own.
    setLocale(own ?? l);
    setFlash(true);
  }

  if (available.length < 2) return null;

  const ownOptions: { key: Choice; text: string }[] = [
    { key: FAMILY, text: t.followFamily(LOCALE_NAMES[family]) },
    ...available.map((l) => ({ key: l as Choice, text: LOCALE_NAMES[l] })),
  ];

  return (
    <div style={{ fontFamily: FONT, marginTop: heading ? 22 : 0 }}>
      {heading && <div style={{ fontSize: 17, fontWeight: 800, color: "var(--fg)", margin: "0 0 10px" }}>{t.title}</div>}
      <div style={{ background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", padding: 14 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--fg)", marginBottom: 8 }}>{t.mine}</div>
        <Segmented label={t.mine} options={ownOptions} value={own ?? FAMILY} disabled={busy} onPick={chooseOwn} />
        <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45, marginTop: 8 }}>{t.mineHint}</div>

        {canEdit && (
          <>
            <div style={{ height: 1, background: "var(--border-soft)", margin: "14px 0" }} />
            <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--fg)", marginBottom: 8 }}>{t.familyDefault}</div>
            <Segmented label={t.familyDefault} options={available.map((l) => ({ key: l, text: LOCALE_NAMES[l] }))} value={family} disabled={busy} onPick={chooseFamily} />
            <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45, marginTop: 8 }}>{t.familyDefaultHint}</div>
          </>
        )}
        {flash && <div style={{ fontSize: 12.5, color: "var(--success)", fontWeight: 700, marginTop: 8 }}>✓ {t.changed}</div>}
        {error && <div style={{ fontSize: 12.5, color: "var(--danger)", marginTop: 8 }}>{error}</div>}
      </div>
    </div>
  );
}
