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
function IcCalendar() { return <svg width={22} height={22} viewBox="0 0 24 24" {...STR}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function IcChecklist() { return <svg width={22} height={22} viewBox="0 0 24 24" {...STR}><path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="m4 6 1 1 2-2"/><path d="m4 12 1 1 2-2"/><path d="m4 18 1 1 2-2"/></svg>; }
function IcTraining() { return <svg width={22} height={22} viewBox="0 0 24 24" {...STR}><path d="M6.5 6.5 17.5 17.5"/><path d="m21 3-3.5 3.5"/><path d="M17.5 6.5 21 3"/><path d="m3 21 3.5-3.5"/><path d="M6.5 17.5 3 21"/><rect x="15" y="15" width="5" height="5" rx="1.5" transform="rotate(45 17.5 17.5)"/><rect x="4" y="4" width="5" height="5" rx="1.5" transform="rotate(45 6.5 6.5)"/></svg>; }
function IcSchool() { return <svg width={22} height={22} viewBox="0 0 24 24" {...STR}><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12.5V17c0 1.5 2.5 3 6 3s6-1.5 6-3v-4.5"/></svg>; }

type TabDef = {
  key: string; href: string; label: string;
  icon: () => React.ReactElement;
  match: (p: string) => boolean;
};

// Every app that CAN appear in the bottom nav, keyed the same way as
// User.bottomNavTabs (see /api/profile). Calendar isn't in this list — it's
// handled separately below since it's always present and always first
// (2026-07-28 direct decision: "Calendar den enda man inte kan röra").
const APP_TABS: Record<string, TabDef> = {
  reminders: {
    key: "reminders", href: "/dashboard", label: "Reminders", icon: IcBell,
    // Anything under /dashboard that isn't one of the other apps counts as
    // "Reminders" — covers the root list plus create/edit reminder screens.
    match: (p) => p.startsWith("/dashboard") && !p.startsWith("/dashboard/family/shopping-list") && !p.startsWith("/dashboard/wishlist")
      && !p.startsWith("/dashboard/calendar") && !p.startsWith("/dashboard/family") && !p.startsWith("/dashboard/training") && !p.startsWith("/dashboard/school"),
  },
  "shopping-list": { key: "shopping-list", href: "/dashboard/family/shopping-list", label: "Shopping list", icon: IcCart, match: (p) => p.startsWith("/dashboard/family/shopping-list") },
  wishlist: { key: "wishlist", href: "/dashboard/wishlist", label: "Wishlist", icon: IcGift, match: (p) => p.startsWith("/dashboard/wishlist") },
  chores: { key: "chores", href: "/dashboard/family", label: "Chores", icon: IcChecklist, match: (p) => p.startsWith("/dashboard/family") && !p.startsWith("/dashboard/family/shopping-list") },
  training: { key: "training", href: "/dashboard/training", label: "Training", icon: IcTraining, match: (p) => p.startsWith("/dashboard/training") },
  school: { key: "school", href: "/dashboard/school", label: "School", icon: IcSchool, match: (p) => p.startsWith("/dashboard/school") },
};

const CALENDAR_TAB: TabDef = { key: "calendar", href: "/dashboard/calendar", label: "Calendar", icon: IcCalendar, match: (p) => p.startsWith("/dashboard/calendar") };

// Default, used whenever a person hasn't picked their own set yet
// (User.bottomNavTabs is null) — matches the agreed default: "Calendar,
// Reminder, Shopping list, School".
const DEFAULT_APP_TABS = ["reminders", "shopping-list", "school"];

export default function BottomNav() {
  const pathname = usePathname() || "/dashboard";
  const [badges, setBadges] = useState<{ shoppingList: boolean; wishlist: boolean }>({ shoppingList: false, wishlist: false });
  const [appKeys, setAppKeys] = useState<string[]>(DEFAULT_APP_TABS);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile").then(r => (r.ok ? r.json() : null)).then((d) => {
      if (cancelled || !d) return;
      const saved: string | null = d.bottomNavTabs ?? null;
      if (saved) {
        const keys = saved.split(",").filter((k: string) => APP_TABS[k]);
        if (keys.length >= 3) setAppKeys(keys);
      }
    }).catch(() => { /* keep default on error */ });
    return () => { cancelled = true; };
  }, []);

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

  // Calendar is always first and always present — everything else is the
  // person's own pick (2026-07-28).
  const tabs: TabDef[] = [CALENDAR_TAB, ...appKeys.map((k) => APP_TABS[k]).filter(Boolean)];

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
        {tabs.map(tab => {
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
