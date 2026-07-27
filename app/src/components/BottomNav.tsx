"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { hasNewSince } from "@/lib/listBadges";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

// Checked less often than the in-page polling (5s) — this only drives a small
// "something's new" dot, not the list content itself.
const BADGE_POLL_MS = 20000;

function IcBell()  { return <svg width={22} height={22} viewBox="0 0 24 24" {...STR}><path d="M9 17H5a2 2 0 0 0 1.66-.9L8 14V9a4 4 0 0 1 8 0v5l1.34 2.1A2 2 0 0 0 19 17h-4"/><path d="M9 17v1a3 3 0 0 0 6 0v-1"/></svg>; }
function IcCart()  { return <svg width={22} height={22} viewBox="0 0 24 24" {...STR}><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 6H5.6"/></svg>; }
function IcGift()  { return <svg width={22} height={22} viewBox="0 0 24 24" {...STR}><rect x="3" y="8" width="18" height="4"/><rect x="4" y="12" width="16" height="9"/><path d="M12 8v13M12 8c-1.5-3-5-3-5-1s2 1 5 1zM12 8c1.5-3 5-3 5-1s-2 1-5 1z"/></svg>; }

const TABS = [
  {
    key: "reminders", href: "/dashboard", label: "Reminders", icon: IcBell,
    // Anything under /dashboard that isn't the shopping list or wishlist counts as
    // "Reminders" — covers the root list plus create/edit reminder screens.
    match: (p: string) => p.startsWith("/dashboard") && !p.startsWith("/dashboard/family/shopping-list") && !p.startsWith("/dashboard/wishlist"),
  },
  { key: "shopping-list", href: "/dashboard/family/shopping-list", label: "Shopping list", icon: IcCart, match: (p: string) => p.startsWith("/dashboard/family/shopping-list") },
  { key: "wishlist", href: "/dashboard/wishlist", label: "Wishlist", icon: IcGift, match: (p: string) => p.startsWith("/dashboard/wishlist") },
];

export default function BottomNav() {
  const pathname = usePathname() || "/dashboard";
  const [badges, setBadges] = useState<{ shoppingList: boolean; wishlist: boolean }>({ shoppingList: false, wishlist: false });

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const [slRes, wlRes] = await Promise.all([
          fetch("/api/family/shopping-list").then(r => r.json()).catch(() => null),
          fetch("/api/family/wishlist").then(r => r.json()).catch(() => null),
        ]);
        if (cancelled) return;

        const slLatest = Math.max(0, ...((slRes?.items ?? []).map((i: { createdAt: string }) => new Date(i.createdAt).getTime())));
        let wlItems: { createdAt: string }[] = [];
        if (wlRes?.role === "CHILD") wlItems = wlRes.items ?? [];
        if (wlRes?.role === "ADULT") wlItems = (wlRes.children ?? []).flatMap((c: { items: { createdAt: string }[] }) => c.items);
        const wlLatest = Math.max(0, ...wlItems.map((i) => new Date(i.createdAt).getTime()));

        setBadges({
          shoppingList: hasNewSince("shopping-list", slLatest),
          wishlist: hasNewSince("wishlist", wlLatest),
        });
      } catch {
        // Badge is a nice-to-have; silently skip on error.
      }
    }

    poll();
    const id = setInterval(poll, BADGE_POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [pathname]);

  return (
    // Outer element only handles fixed positioning across the full viewport —
    // the visible bar itself (background/border/shadow) is capped to the same
    // 480px content width as every page, centered. Without this split, on a
    // wide desktop window the white bar stretched edge-to-edge while the tabs
    // stayed clustered in the middle — a visible seam against the narrower
    // content column above it. Capping the bar's own width fixes that; on
    // phone-width viewports this is visually identical to a full-bleed bar.
    <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 20, display: "flex", justifyContent: "center" }}>
      <div style={{
        width: "100%", maxWidth: "var(--content-max-width)", display: "flex",
        background: "#fff", border: "1px solid #E4E3DE", borderBottom: "none",
        borderRadius: "16px 16px 0 0",
        boxShadow: "0 -2px 12px rgba(0,0,0,0.06)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}>
        {TABS.map(tab => {
          const active = tab.match(pathname);
          const showBadge = tab.key === "shopping-list" ? badges.shoppingList : tab.key === "wishlist" ? badges.wishlist : false;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                padding: "10px 0 8px", textDecoration: "none",
                color: active ? "#1C1C28" : "#A0A6B8",
                fontFamily: FONT,
              }}
            >
              <span style={{ position: "relative", display: "flex" }}>
                <Icon />
                {showBadge && (
                  <span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: "#E4574A", border: "1.5px solid #fff" }} />
                )}
              </span>
              <span style={{ fontSize: 11, fontWeight: active ? 800 : 600 }}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
