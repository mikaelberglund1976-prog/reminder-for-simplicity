"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ADMIN_EMAIL } from "@/lib/adminConfig";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function IcMenu() { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>; }
function IcHome()  { return <svg width={17} height={17} viewBox="0 0 24 24" {...STR}><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>; }
function IcUsers() { return <svg width={17} height={17} viewBox="0 0 24 24" {...STR}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function IcGear()  { return <svg width={17} height={17} viewBox="0 0 24 24" {...STR}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }
function IcShield() { return <svg width={17} height={17} viewBox="0 0 24 24" {...STR}><path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4z"/></svg>; }
function IcLogout() { return <svg width={17} height={17} viewBox="0 0 24 24" {...STR}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }

// Overflow menu for anything that doesn't have its own bottom tab — Family
// hub, Settings, Admin (only shown to the admin account), Sign out. Lives in
// the top-right corner of a page header, as a flex sibling next to the title
// (not a separately fixed element), so it can't collide with header text on
// narrow screens the way an independently-positioned floating button could.
export default function HamburgerMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Menu"
        aria-expanded={open}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 36, height: 36, borderRadius: "50%",
          background: open ? "#F0F3FA" : "transparent", border: "none",
          color: "#4B5563", cursor: "pointer",
        }}
      >
        <IcMenu />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: 44, right: 0, zIndex: 30,
          width: 200, background: "#fff", borderRadius: 14,
          border: "1px solid #E4E3DE", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          padding: 6, fontFamily: FONT,
        }}>
          <MenuLink href="/dashboard" icon={<IcHome />} label="Reminders" onClick={() => setOpen(false)} />
          <MenuLink href="/dashboard/family" icon={<IcUsers />} label="Family" onClick={() => setOpen(false)} />
          <MenuLink href="/profile" icon={<IcGear />} label="Settings" onClick={() => setOpen(false)} />
          {isAdmin && (
            <MenuLink href="/admin" icon={<IcShield />} label="Admin" onClick={() => setOpen(false)} />
          )}
          <div style={{ borderTop: "1px solid #F0F3F8", margin: "4px 0" }} />
          <button
            onClick={() => { setOpen(false); signOut({ callbackUrl: "/login" }); }}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "9px 10px", borderRadius: 10, border: "none", background: "none",
              color: "#D94F4F", fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: FONT, textAlign: "left",
            }}
          >
            <IcLogout /> Sign out
          </button>
        </div>
      )}
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
        color: "#1C1C28", fontSize: 13, fontWeight: 600,
        textDecoration: "none",
      }}
    >
      {icon} {label}
    </Link>
  );
}
