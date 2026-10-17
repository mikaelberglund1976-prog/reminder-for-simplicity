"use client";

// 2026-10-18 (Navigation 2.0, spec §10): "More" — the app's complete catalogue,
// opened from the rightmost tab of the bottom nav. Grouped Planning / Family /
// App. Ideas & voting moved to Settings → Help & feedback, Admin is only in
// Settings for the admin account, appearance lives in Settings.
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useM } from "@/lib/i18n/client";
import type { Messages } from "@/lib/i18n/messages";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const I = (d: React.ReactNode) => function Icon() { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}>{d}</svg>; };

const IcCalendar = I(<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>);
const IcBell = I(<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>);
const IcSchool = I(<><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12.5V17c0 1.5 2.5 3 6 3s6-1.5 6-3v-4.5"/></>);
const IcTraining = I(<><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18M3 12h18"/></>);
const IcChecklist = I(<><path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="m4 6 1 1 2-2"/><path d="m4 12 1 1 2-2"/><path d="m4 18 1 1 2-2"/></>);
const IcCart = I(<><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 6H5.6"/></>);
const IcCake = I(<><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3M12 8v3M17 8v3"/></>);
const IcGift = I(<><rect x="3" y="8" width="18" height="4"/><rect x="4" y="12" width="16" height="9"/><path d="M12 8v13M12 8c-1.5-3-5-3-5-1s2 1 5 1zM12 8c1.5-3 5-3 5-1s-2 1-5 1z"/></>);
const IcSuitcase = I(<><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>);
const IcUsers = I(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>);
const IcGear = I(<><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></>);
const IcLogout = I(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>);

type Item = { href: string; label: keyof Messages["nav"]; Icon: () => React.ReactElement; tint: string; color: string };
type Group = { title: keyof Messages["nav"]; items: Item[] };

const ADULT: Group[] = [
  { title: "groupPlanning", items: [
    { href: "/dashboard/calendar", label: "calendar", Icon: IcCalendar, tint: "var(--tint-accent)", color: "var(--accent)" },
    { href: "/dashboard/reminders", label: "reminders", Icon: IcBell, tint: "var(--tint-accent)", color: "var(--accent)" },
    { href: "/dashboard/school", label: "school", Icon: IcSchool, tint: "var(--tint-school)", color: "var(--school)" },
    { href: "/dashboard/training", label: "activities", Icon: IcTraining, tint: "var(--tint-warning)", color: "var(--warning)" },
    { href: "/dashboard/family", label: "chores", Icon: IcChecklist, tint: "var(--tint-warning)", color: "var(--warning)" },
  ] },
  { title: "groupFamily", items: [
    { href: "/dashboard/family/shopping-list", label: "shoppingList", Icon: IcCart, tint: "var(--tint-success)", color: "var(--success)" },
    { href: "/dashboard/birthdays", label: "birthdays", Icon: IcCake, tint: "var(--tint-pink)", color: "var(--pink)" },
    { href: "/dashboard/wishlist", label: "wishlist", Icon: IcGift, tint: "var(--tint-danger)", color: "var(--danger)" },
    { href: "/dashboard/trips", label: "trips", Icon: IcSuitcase, tint: "var(--tint-accent)", color: "var(--accent)" },
  ] },
  { title: "groupApp", items: [
    { href: "/dashboard/family/members", label: "familyMembers", Icon: IcUsers, tint: "var(--surface-3)", color: "var(--fg-2)" },
    { href: "/profile", label: "settings", Icon: IcGear, tint: "var(--surface-3)", color: "var(--fg-2)" },
  ] },
];

// A child only gets their own things (2026-09-28, row 38).
const CHILD: Group[] = [
  { title: "groupPlanning", items: [
    { href: "/dashboard/calendar", label: "calendar", Icon: IcCalendar, tint: "var(--tint-accent)", color: "var(--accent)" },
    { href: "/dashboard/school", label: "school", Icon: IcSchool, tint: "var(--tint-school)", color: "var(--school)" },
    { href: "/dashboard/training", label: "activities", Icon: IcTraining, tint: "var(--tint-warning)", color: "var(--warning)" },
  ] },
  { title: "groupFamily", items: [
    { href: "/dashboard/family/shopping-list", label: "shoppingList", Icon: IcCart, tint: "var(--tint-success)", color: "var(--success)" },
    { href: "/dashboard/wishlist", label: "myWishlist", Icon: IcGift, tint: "var(--tint-danger)", color: "var(--danger)" },
    { href: "/dashboard/birthdays", label: "birthdays", Icon: IcCake, tint: "var(--tint-pink)", color: "var(--pink)" },
    { href: "/dashboard/trips", label: "trips", Icon: IcSuitcase, tint: "var(--tint-accent)", color: "var(--accent)" },
  ] },
  { title: "groupApp", items: [
    { href: "/profile", label: "settings", Icon: IcGear, tint: "var(--surface-3)", color: "var(--fg-2)" },
  ] },
];

export default function MoreSheet({ open, onClose, isChild }: { open: boolean; onClose: () => void; isChild: boolean }) {
  const m = useM();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  const groups = isChild ? CHILD : ADULT;

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 18, background: "rgba(10,12,20,0.38)", display: "flex", alignItems: "flex-end", justifyContent: "center", fontFamily: FONT }}>
      <div
        role="dialog" aria-modal="true" aria-label={m.nav.more}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "var(--content-max-width)", maxHeight: "86dvh", overflowY: "auto", overscrollBehavior: "contain",
          background: "var(--surface)", borderRadius: "24px 24px 0 0", border: "1px solid var(--border)", borderBottom: "none",
          boxShadow: "0 -12px 40px rgba(0,0,0,0.2)",
          padding: "10px 16px calc(env(safe-area-inset-bottom, 0px) + 96px)", boxSizing: "border-box",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 4, background: "var(--border)", margin: "0 auto 12px" }} aria-hidden />
        {groups.map((g) => (
          <section key={g.title} style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 12, fontWeight: 800, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 4px 8px" }}>{m.nav[g.title]}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {g.items.map(({ href, label, Icon, tint, color }) => (
                <Link key={href} href={href} onClick={onClose} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "12px 6px",
                  borderRadius: 16, border: "1px solid var(--border)", background: "var(--surface-2)", textDecoration: "none",
                }}>
                  <span style={{ width: 38, height: 38, borderRadius: 12, background: tint, color, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon /></span>
                  <span lang={m.nav.home === "Hem" ? "sv" : "en"} style={{ fontSize: 12, fontWeight: 700, color: "var(--fg)", textAlign: "center", lineHeight: 1.2, hyphens: "auto", overflowWrap: "anywhere", maxWidth: "100%" }}>{m.nav[label]}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
        <button
          type="button"
          onClick={() => { onClose(); signOut({ callbackUrl: "/login" }); }}
          style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 10px", border: "none", background: "none", color: "var(--danger)", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}
        >
          <IcLogout /> {m.common.signOut}
        </button>
      </div>
    </div>,
    document.body,
  );
}
