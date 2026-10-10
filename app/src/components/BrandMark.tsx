// 2026-10-10: Lotuvi brand test (guidelines v0.1). The symbol is a temporary
// raster asset taken from the stylebord — the production vector logo is still
// ÖPPET, so never redraw it in code; swap the file in /public/brand instead.
// The app NAME is deliberately unchanged for now.

export const BRAND_ASSETS = {
  symbol: "/brand/Lotuvi_Symbol_v0.1.png",
  companion: "/brand/Lotuvi_Companion_Lotu_v0.1.webp",
} as const;

/** Small logo mark (symbol only, no wordmark). */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={BRAND_ASSETS.symbol} alt="" width={size} height={size}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0, display: "block" }} />
  );
}

/** The companion figure. Its picture has a cream background baked in, so it
 *  sits in a cream circle — reads as intentional in both light and dark. */
export function Companion({ size = 150 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
      background: "#F9F6F2", boxShadow: "0 0 0 1px var(--border-soft)",
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BRAND_ASSETS.companion} alt="" width={size} height={size}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    </div>
  );
}
