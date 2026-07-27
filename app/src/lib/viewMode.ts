// Lets someone choose "mobile" (narrow, default) or "web" (wider column) and
// remembers it. One CSS variable (--content-max-width, see globals.css)
// controls every page's width, so switching is just flipping one attribute —
// no per-page layout code, no reload needed.

export type ViewMode = "mobile" | "web";

const STORAGE_KEY = "rfs:viewMode";

export function getViewMode(): ViewMode {
  if (typeof window === "undefined") return "mobile";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "web" ? "web" : "mobile";
  } catch {
    return "mobile";
  }
}

export function setViewMode(mode: ViewMode) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Preference just won't persist — not worth failing the toggle for.
  }
  applyViewMode(mode);
}

export function applyViewMode(mode: ViewMode) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-view", mode);
}

// Inline, unminified on purpose — this is injected as a literal <script> string
// in the document head (see layout.tsx) so the right width applies before the
// first paint. Keep it dependency-free and defensive: it runs before React.
export const VIEW_MODE_INIT_SCRIPT = `
(function () {
  try {
    var v = localStorage.getItem('${STORAGE_KEY}');
    document.documentElement.setAttribute('data-view', v === 'web' ? 'web' : 'mobile');
  } catch (e) {}
})();
`;
