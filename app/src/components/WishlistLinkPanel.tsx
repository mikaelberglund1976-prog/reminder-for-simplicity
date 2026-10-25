"use client";

// 2026-10-25 (masterbrief §20): share one wishlist with a link — no account
// needed for the one who opens it. Renders nothing unless FEATURE_WISHLIST_LINK
// is on (the API answers { enabled: false }). See lib/wishlistLinks.ts.
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
type Link = { url: string; expiresAt: string } | null;

export default function WishlistLinkPanel({ listId }: { listId: string }) {
  const { m, dateLocale } = useI18n();
  const t = m.wishLink;
  const [state, setState] = useState<{ enabled: boolean; allowed: boolean; link: Link } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setState(null);
    fetch(`/api/family/wishlist-links?listId=${encodeURIComponent(listId)}`).then((r) => (r.ok ? r.json() : null)).then((d) => d && setState({ enabled: !!d.enabled, allowed: !!d.allowed, link: d.link ?? null })).catch(() => {});
  }, [listId]);

  if (!state?.enabled || !state.allowed) return null;

  async function create() {
    setBusy(true);
    const r = await fetch("/api/family/wishlist-links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listId }) }).catch(() => null);
    const d = r?.ok ? await r.json() : null;
    setBusy(false);
    if (d) setState((s) => s && { ...s, link: d.link });
  }
  async function revoke() {
    setBusy(true);
    await fetch(`/api/family/wishlist-links?listId=${encodeURIComponent(listId)}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    setState((s) => s && { ...s, link: null });
  }
  async function share(url: string) {
    try {
      if (navigator.share) { await navigator.share({ title: t.shareTitle, url }); return; }
    } catch { /* cancelled */ }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  }

  const btn: React.CSSProperties = { minHeight: 40, padding: "8px 14px", borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT };
  return (
    <div style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", borderRadius: 14, padding: 14, marginBottom: 14, fontFamily: FONT }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--fg)" }}>🔗 {t.title}</div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, margin: "6px 0 10px" }}>{t.hint}</p>
      {state.link ? (
        <>
          <div style={{ fontSize: 12, color: "var(--subtle)", marginBottom: 8 }}>{t.validUntil(new Date(state.link.expiresAt).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" }))}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => share(state.link!.url)} style={{ ...btn, background: "var(--ink)", color: "#fff", border: "none" }}>{copied ? t.copied : t.share}</button>
            <button type="button" onClick={revoke} disabled={busy} style={{ ...btn, background: "none", color: "var(--danger)", border: "1.5px solid var(--border)" }}>{t.turnOff}</button>
          </div>
        </>
      ) : (
        <button type="button" onClick={create} disabled={busy} style={{ ...btn, background: "var(--ink)", color: "#fff", border: "none", opacity: busy ? 0.6 : 1 }}>{t.create}</button>
      )}
    </div>
  );
}
