"use client";

import { useEffect, useState } from "react";
import { getThemeMode, setThemeMode, ThemeMode } from "@/lib/theme";
import { useM } from "@/lib/i18n/client";

const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcSun()  { return <svg width={16} height={16} viewBox="0 0 24 24" {...STR}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>; }
function IcMoon() { return <svg width={16} height={16} viewBox="0 0 24 24" {...STR}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>; }
function IcAuto() { return <svg width={16} height={16} viewBox="0 0 24 24" {...STR}><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>; }

const OPTIONS: { mode: ThemeMode; label: "auto" | "light" | "dark"; Icon: () => React.ReactElement }[] = [
  { mode: "system", label: "auto", Icon: IcAuto },
  { mode: "light", label: "light", Icon: IcSun },
  { mode: "dark", label: "dark", Icon: IcMoon },
];

// Light / Dark / Auto (follows the phone). Used in Settings and in the ☰ menu.
export default function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<ThemeMode>("system");
  const t = useM().components.theme;

  useEffect(() => {
    setMode(getThemeMode());
    const onChange = (e: Event) => setMode((e as CustomEvent<ThemeMode>).detail);
    window.addEventListener("rfs:theme", onChange);
    return () => window.removeEventListener("rfs:theme", onChange);
  }, []);

  return (
    <div role="radiogroup" aria-label={t.appearance} style={{
      display: "flex", gap: 4, padding: 4, borderRadius: 14,
      background: "var(--surface-3)", border: "1px solid var(--border)",
    }}>
      {OPTIONS.map(({ mode: m, label, Icon }) => {
        const active = mode === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => { setThemeMode(m); setMode(m); }}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: compact ? "7px 6px" : "9px 10px", borderRadius: 10, border: "none", cursor: "pointer",
              fontSize: compact ? 12 : 13, fontWeight: 700, fontFamily: "inherit",
              background: active ? "var(--surface)" : "transparent",
              color: active ? "var(--fg)" : "var(--muted)",
              boxShadow: active ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
            }}
          >
            <Icon /> {t[label]}
          </button>
        );
      })}
    </div>
  );
}
