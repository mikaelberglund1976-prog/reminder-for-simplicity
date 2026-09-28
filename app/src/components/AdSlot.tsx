"use client";

// 2026-09-28 — a sponsor slot. Renders nothing unless /api/ads returns an ad
// (only adults on the free plan get one — see lib/entitlements.showsAds).
// Always labelled "Sponsored" with a "Remove ads" link to the plans page.
import Link from "next/link";
import { useEffect, useState } from "react";

type Ad = { id: string; title: string; body: string | null; imageUrl: string | null; ctaLabel: string | null; advertiser: string | null };

export default function AdSlot({ placement, style }: { placement: "home" | "shopping" | "calendar"; style?: React.CSSProperties }) {
  const [ad, setAd] = useState<Ad | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ads?placement=${placement}`).then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!cancelled && d?.ad) setAd(d.ad);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [placement]);

  if (!ad) return null;

  return (
    <aside aria-label="Sponsored" style={{
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18,
      padding: 14, boxShadow: "var(--shadow)", ...style,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)" }}>
          Sponsored{ad.advertiser ? ` · ${ad.advertiser}` : ""}
        </span>
        <Link href="/upgrade" style={{ fontSize: 11.5, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>Remove ads</Link>
      </div>
      <a href={`/api/ads/${ad.id}/click`} target="_blank" rel="noopener sponsored" style={{ display: "flex", gap: 12, alignItems: "center", textDecoration: "none", color: "var(--fg)" }}>
        {ad.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ad.imageUrl} alt="" width={64} height={64} style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover", flexShrink: 0, background: "var(--surface-3)" }} />
        )}
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{ad.title}</span>
          {ad.body && <span style={{ display: "block", fontSize: 13, color: "var(--muted)", marginTop: 3, lineHeight: 1.4 }}>{ad.body}</span>}
          <span style={{ display: "inline-block", marginTop: 8, fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{ad.ctaLabel ?? "Read more"} →</span>
        </span>
      </a>
    </aside>
  );
}
