// Light / dark / system theme (2026-09-27, UI review). Same pattern as
// lib/viewMode.ts: one attribute on <html> (data-theme="light"|"dark") flips
// every color token in globals.css, and the choice is remembered per device.
// "system" follows the phone/computer setting and updates live if it changes.

export type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY = "rfs:theme";
const THEME_COLORS = { light: "var(--background)", dark: "#0E1220" };

export function getThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function systemPrefersDark() {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") return systemPrefersDark() ? "dark" : "light";
  return mode;
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(mode);
  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  root.setAttribute("data-theme-mode", mode);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLORS[resolved]);
}

export function setThemeMode(mode: ThemeMode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Won't persist (private mode etc.) — still apply for this visit.
  }
  applyTheme(mode);
  window.dispatchEvent(new CustomEvent("rfs:theme", { detail: mode }));
}

// Runs before React (injected in layout.tsx) so there's no flash of the
// wrong theme. Keep it dependency-free.
export const THEME_INIT_SCRIPT = `
(function () {
  var mode = 'system';
  try { var v = localStorage.getItem('${STORAGE_KEY}'); if (v === 'light' || v === 'dark') mode = v; } catch (e) {}
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function apply() {
    var dark = mode === 'dark' || (mode === 'system' && mq && mq.matches);
    var r = document.documentElement;
    r.setAttribute('data-theme', dark ? 'dark' : 'light');
    r.setAttribute('data-theme-mode', mode);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', dark ? '${THEME_COLORS.dark}' : '${THEME_COLORS.light}');
  }
  apply();
  if (mq && mq.addEventListener) mq.addEventListener('change', function () {
    try { var v = localStorage.getItem('${STORAGE_KEY}'); mode = (v === 'light' || v === 'dark') ? v : 'system'; } catch (e) {}
    if (mode === 'system') apply();
  });
})();
`;
