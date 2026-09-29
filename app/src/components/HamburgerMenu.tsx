"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMe } from "@/lib/me";
import { ADMIN_EMAIL } from "@/lib/adminConfig";
import ThemeSwitcher from "@/components/ThemeSwitcher";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function IcMenu() { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>; }
function IcHome()  { return <svg width={17} height={17} viewBox="0 0 24 24" {...STR}><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>; }
function IcUsers() { return <svg width={17} height={17} viewBox="0 0 24 24" {...STR}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function IcGear()  { return <svg width={17} height={17} viewBox="0 0 24 24" {...STR}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }
function IcShield() { return <svg width={17} height={17} viewBox="0 0 24 24" {...STR}><path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4z"/></svg>; }
function IcBulb() { return <svg width={17} height={17} viewBox="0 0 24 24" {...STR}><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.5.4.8 1 .8 1.6V17h6.4v-.7c0-.6.3-1.2.8-1.6A7 7 0 0 0 12 2z"/></svg>; }
function IcChecklist() { return <svg width={17} height={17} viewBox="0 0 24 24" {...STR}><path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="m4 6 1 1 2-2"/><path d="m4 12 1 1 2-2"/><path d="m4 18 1 1 2-2"/></svg>; }
function IcSchool() { return <svg width={17} height={17} viewBox="0 0 24 24" {...STR}><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12.5V17c0 1.5 2.5 3 6 3s6-1.5 6-3v-4.5"/></svg>; }
function IcTraining() { return <svg width={17} height={17} viewBox="0 0 24 24" {...STR}><path d="M6.5 6.5 17.5 17.5"/><path d="m21 3-3.5 3.5"/><path d="M17.5 6.5 21 3"/><path d="m3 21 3.5-3.5"/><path d="M6.5 17.5 3 21"/><rect x="15" y="15" width="5" height="5" rx="1.5" transform="rotate(45 17.5 17.5)"/><rect x="4" y="4" width="5" height="5" rx="1.5" transform="rotate(45 6.5 6.5)"/></svg>; }
function IcCart() { return <svg width={17} height={17} viewBox="0 0 24 24" {...STR}><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 6H5.6"/></svg>; }
function IcGift() { return <svg width={17} height={17} viewBox="0 0 24 24" {...STR}><rect x="3" y="8" width="18" height="4"/><rect x="4" y="12" width="16" height="9"/><path d="M12 8v13M12 8c-1.5-3-5-3-5-1s2 1 5 1zM12 8c1.5-3 5-3 5-1s-2 1-5 1z"/></svg>; }
function IcCalendar() { return <svg width={17} height={17} viewBox="0 0 24 24" {...STR}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function IcLogout() { return <svg width={17} height={17} viewBox="0 0 24 24" {...STR}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }

// Overflow menu for anything that doesn't have its own bottom tab — Family
// hub, Settings, Admin (only shown to the admin account), Sign out. Lives in
// the top-right corner of a page header, as a flex sibling next to the title
// (not a separately fixed element), so it can't collide with header text on
// narrow screens the way an independently-positioned floating button could.
export default function HamburgerMenu() {
  const { data: session } = useSession();
  const me = useMe();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 60, right: 12 });

  useEffect(() => {
    function onClickOutside(e: MouseEvent | TouchEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    if (open) {
      document.addEventListener("mousedown", onClickOutside);
      document.addEventListener("touchstart", onClickOutside);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("touchstart", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    setOpen((v) => !v);
  }

  const isAdmin = session?.user?.email === ADMIN_EMAIL;
  // 2026-09-28 (row 38): a child only gets links to their own things.
  const isChild = !!me?.isChildProfile;
  const close = () => setOpen(false);

  // 2026-09-28 (test round, row 48): the menu used to be an absolutely
  // positioned child of the sticky page header — on a phone the list ran past
  // the bottom of the screen, under the floating bottom nav, and couldn't be
  // scrolled. It's now rendered in a portal on top of everything, capped to
  // the visible height and scrollable inside.
  const menu = open ? (
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: "fixed", top: pos.top, right: pos.right, zIndex: 1000,
        width: 236, maxHeight: `calc(100dvh - ${pos.top}px - 12px - env(safe-area-inset-bottom, 0px))`,
        overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch",
        background: "var(--surface)", borderRadius: 14,
        border: "1px solid var(--border)", boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
        padding: 6, fontFamily: FONT,
      }}
    >
      {isChild ? (
        <>
          <MenuLink href="/dashboard/family/child" icon={<IcHome />} label="My week" onClick={close} />
          <MenuLink href="/dashboard/family/shopping-list" icon={<IcCart />} label="Shopping list" onClick={close} />
          <MenuLink href="/dashboard/wishlist" icon={<IcGift />} label="My wishlist" onClick={close} />
          <MenuLink href="/profile" icon={<IcGear />} label="Settings" onClick={close} />
          <MenuLink href="/privacy" icon={<IcShield />} label="Privacy" onClick={close} />
        </>
      ) : (
        <>
          <MenuLink href="/dashboard" icon={<IcHome />} label="Home" onClick={close} />
          <MenuLink href="/dashboard/calendar" icon={<IcCalendar />} label="Calendar" onClick={close} />
          <MenuLink href="/dashboard/family/shopping-list" icon={<IcCart />} label="Shopping list" onClick={close} />
          <MenuLink href="/dashboard/wishlist" icon={<IcGift />} label="Wishlist" onClick={close} />
          <MenuLink href="/dashboard/family" icon={<IcChecklist />} label="Chores" onClick={close} />
          <MenuLink href="/dashboard/training" icon={<IcTraining />} label="Activities" onClick={close} />
          <MenuLink href="/dashboard/school" icon={<IcSchool />} label="School" onClick={close} />
          <MenuLink href="/dashboard/family/members" icon={<IcUsers />} label="Family members" onClick={close} />
          <MenuLink href="/dashboard/suggestions" icon={<IcBulb />} label="Ideas & voting" onClick={close} />
          <MenuLink href="/profile" icon={<IcGear />} label="Settings" onClick={close} />
          <MenuLink href="/privacy" icon={<IcShield />} label="Privacy" onClick={close} />
          {isAdmin && (
            <MenuLink href="/admin" icon={<IcShield />} label="Admin" onClick={close} />
          )}
        </>
      )}
      <div style={{ borderTop: "1px solid var(--border-soft)", margin: "4px 0" }} />
      <div style={{ padding: "4px 4px 6px" }}>
        <ThemeSwitcher compact />
      </div>
      <div style={{ borderTop: "1px solid var(--border-soft)", margin: "4px 0" }} />
      <button
        onClick={() => { close(); signOut({ callbackUrl: "/login" }); }}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "9px 10px", borderRadius: 10, border: "none", background: "none",
          color: "var(--danger)", fontSize: 13, fontWeight: 600, cursor: "pointer",
          fontFamily: FONT, textAlign: "left",
        }}
      >
        <IcLogout /> Sign out
      </button>
    </div>
  ) : null;

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        ref={btnRef}
        onClick={toggle}
        aria-label="Menu"
        aria-expanded={open}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 36, height: 36, borderRadius: "50%",
          background: open ? "var(--surface-3)" : "transparent", border: "none",
          color: "var(--fg-2)", cursor: "pointer",
        }}
      >
        <IcMenu />
      </button>
      {menu && typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </div>
  );
}

function MenuLink({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 10px", borderRadius: 10,
        color: "var(--fg)", fontSize: 13, fontWeight: 600,
        textDecoration: "none",
      }}
    >
      {icon} {label}
    </Link>
  );
}
