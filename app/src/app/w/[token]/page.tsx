"use client";

// 2026-10-25 (masterbrief §20, behind FEATURE_WISHLIST_LINK): a shared wishlist
// opened from a link — no account, no app chrome. Shows the wishes and whether
// each is taken; a relative reserves one with just their name.
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
type Item = { id: string; name: string; url: string | null; price: number | null; currency: string | null; imageUrl: string | null; note: string | null; taken: boolean };
type Data = { listName: string; childName: string | null; items: Item[] };

export default function SharedWishlistPage({ params }: { params: { token: string } }) {
  const { m, err, num } = useI18n();
  const t = m.wishLink;
  const [data, setData] = useState<Data | null>(null);
  const [gone, setGone] = useState(false);
  const [name, setName] = useState("");
  const [picking, setPicking] = useState<string | null>(null);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const r = await fetch(`/api/public/wishlist/${encodeURIComponent(params.token)}`).catch(() => null);
    if (!r || !r.ok) { setGone(true); return; }
    setData(await r.json());
  }
  useEffect(() => {
    load();
    try { setName(localStorage.getItem("rfs:guest-name") ?? ""); } catch { /* private mode */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function reserve(id: string) {
    if (!name.trim()) { setError(t.nameFirst); return; }
    setError(null);
    try { localStorage.setItem("rfs:guest-name", name.trim()); } catch { /* ignore */ }
    const r = await fetch(`/api/public/wishlist/${encodeURIComponent(params.token)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: id, name: name.trim() }) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    setPicking(null);
    if (!r?.ok) { setError(d.error ? err(d.error) : m.common.somethingWentWrong); load(); return; }
    setMine((s) => new Set(s).add(id));
    load();
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT, padding: "28px 16px 60px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        {gone ? (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: 20, textAlign: "center" }}>
            <div aria-hidden style={{ fontSize: 34 }}>🎁</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--fg)", marginTop: 8 }}>{t.goneTitle}</div>
            <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6, lineHeight: 1.5 }}>{t.goneBody}</div>
          </div>
        ) : !data ? (
          <div style={{ color: "var(--muted)", fontSize: 14 }}>{m.common.loading}</div>
        ) : (
          <>
            <div aria-hidden style={{ fontSize: 34 }}>🎁</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--fg)", margin: "6px 0 4px" }}>{data.childName ? t.heading(data.childName) : data.listName}</h1>
            <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.5, margin: "0 0 16px" }}>{t.intro}</p>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--fg)", marginBottom: 6 }} htmlFor="guest-name">{t.yourName}</label>
            <input id="guest-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} maxLength={60} autoComplete="name"
              style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--fg)", fontSize: 15, fontFamily: FONT, marginBottom: 14 }} />
            {error && <div role="alert" style={{ fontSize: 13, color: "var(--danger)", marginBottom: 10 }}>{error}</div>}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden" }}>
              {data.items.length === 0 && <div style={{ padding: 16, fontSize: 14, color: "var(--muted)" }}>{t.empty}</div>}
              {data.items.map((it, i) => (
                <div key={it.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", borderTop: i ? "1px solid var(--border-soft)" : "none", opacity: it.taken && !mine.has(it.id) ? 0.55 : 1 }}>
                  {it.imageUrl
                    ? <img src={it.imageUrl} alt="" width={48} height={48} style={{ borderRadius: 10, objectFit: "cover", flexShrink: 0, background: "var(--surface-3)" }} />
                    : <span aria-hidden style={{ width: 48, height: 48, borderRadius: 10, background: "var(--surface-3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🎁</span>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--fg)" }}>{it.name}</div>
                    <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
                      {[it.price != null ? `${num(it.price)} ${it.currency ?? ""}`.trim() : null, it.note].filter(Boolean).join(" · ")}
                      {it.url && <> {it.price != null || it.note ? "· " : ""}<a href={it.url} target="_blank" rel="noopener noreferrer nofollow" style={{ color: "var(--accent)", fontWeight: 700 }}>{t.where}</a></>}
                    </div>
                  </div>
                  {mine.has(it.id) ? (
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--success)", flexShrink: 0 }}>✓ {t.yours}</span>
                  ) : it.taken ? (
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--subtle)", flexShrink: 0 }}>{t.taken}</span>
                  ) : picking === it.id ? (
                    <button type="button" onClick={() => reserve(it.id)} style={{ minHeight: 40, padding: "8px 12px", borderRadius: 50, border: "none", background: "var(--ink)", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: FONT, flexShrink: 0 }}>{t.confirm}</button>
                  ) : (
                    <button type="button" onClick={() => setPicking(it.id)} style={{ minHeight: 40, padding: "8px 12px", borderRadius: 50, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--fg-2)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT, flexShrink: 0 }}>{t.reserve}</button>
                  )}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "var(--subtle)", marginTop: 14, lineHeight: 1.5 }}>{t.privacy}</p>
          </>
        )}
      </div>
    </main>
  );
}
