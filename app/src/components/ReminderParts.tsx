"use client";

// 2026-10-18: shared between Home and the new Reminders page (Navigation 2.0).
// Moved here unchanged from app/dashboard/page.tsx.
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import type { BirthdayMeta } from "@/lib/birthdayLabel";

export type HouseholdMember = { id: string; userId: string; role?: string; user: { id: string; name: string | null; email: string } };

export type Reminder = {
  id: string;
  name: string;
  category: string;
  date: string;
  recurrence: string;
  amount: number | null;
  currency: string | null;
  note: string | null;
  reminderDaysBefore: number;
  lastSentAt: string | null;
  userId: string;
  visibility: string;
  assignedTo?: string | null;
  user?: { id: string; name: string | null };
  startTime?: string | null;
  birthday?: BirthdayMeta | null;
};

// 2026-10-04: category / recurrence words come from messages.reminders.

export const CATEGORY_BADGE: Record<string, { bg: string; color: string }> = {
  SUBSCRIPTION: { bg: "var(--tint-accent)", color: "var(--accent-strong)" },
  BIRTHDAY:     { bg: "var(--tint-pink)", color: "var(--pink)" },
  INSURANCE:    { bg: "var(--tint-success)", color: "var(--success)" },
  CONTRACT:     { bg: "var(--tint-warning)", color: "var(--warning)" },
  HEALTH:       { bg: "var(--tint-danger)", color: "var(--danger)" },
  BILL:         { bg: "var(--tint-violet)", color: "var(--violet)" },
  OTHER:        { bg: "var(--border)", color: "var(--slate)" },
};

export const BRAND_COLORS: Record<string, { bg: string; text: string }> = {
  spotify:   { bg: "#1DB954", text: "#fff" },
  netflix:   { bg: "#E50914", text: "#fff" },
  youtube:   { bg: "#FF0000", text: "#fff" },
  apple:     { bg: "#000000", text: "#fff" },
  google:    { bg: "#4285F4", text: "#fff" },
  amazon:    { bg: "#FF9900", text: "#000" },
  microsoft: { bg: "#00A4EF", text: "#fff" },
  adobe:     { bg: "#FF0000", text: "#fff" },
  dropbox:   { bg: "#0061FF", text: "#fff" },
  slack:     { bg: "#4A154B", text: "#fff" },
  github:    { bg: "#24292E", text: "#fff" },
  notion:    { bg: "#000000", text: "#fff" },
  figma:     { bg: "#F24E1E", text: "#fff" },
  linkedin:  { bg: "#0A66C2", text: "#fff" },
  twitter:   { bg: "#1DA1F2", text: "#fff" },
  discord:   { bg: "#5865F2", text: "#fff" },
  zoom:      { bg: "#2D8CFF", text: "#fff" },
  hulu:      { bg: "#1CE783", text: "#000" },
  disney:    { bg: "#113CCF", text: "#fff" },
  telia:     { bg: "#990AE3", text: "#fff" },
};

export const BRAND_DOMAINS: Record<string, string> = {
  spotify:   "spotify.com",
  netflix:   "netflix.com",
  youtube:   "youtube.com",
  apple:     "apple.com",
  google:    "google.com",
  amazon:    "amazon.com",
  microsoft: "microsoft.com",
  adobe:     "adobe.com",
  dropbox:   "dropbox.com",
  slack:     "slack.com",
  github:    "github.com",
  notion:    "notion.so",
  figma:     "figma.com",
  linkedin:  "linkedin.com",
  twitter:   "twitter.com",
  discord:   "discord.com",
  zoom:      "zoom.us",
  hulu:      "hulu.com",
  disney:    "disneyplus.com",
  telia:     "telia.com",
};

export function getBrandInfo(name: string) {
  const lower = name.toLowerCase();
  for (const brand in BRAND_COLORS) {
    if (lower.includes(brand)) {
      return { color: BRAND_COLORS[brand], domain: BRAND_DOMAINS[brand] ?? null };
    }
  }
  return { color: { bg: "var(--accent-bg)", text: "var(--on-accent)" }, domain: null };
}

export function getDaysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDate(dateStr: string, dateLocale: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toLocaleDateString(dateLocale, {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

// 2026-09-29 (GDPR review): logos used to be loaded from logo.clearbit.com
// straight from the browser, which sent every visitor's IP address (and which
// subscriptions they have) to a US third party. Brand colour + initials now,
// nothing leaves the app.
export function ServiceLogo({ name }: { name: string }) {
  // 2026-10-10: birthdays are named "🎂 Elsa turns 13" — show the emoji.
  const emoji = ["🎂", "🎈", "🐾"].find((e) => name.startsWith(e + " "));
  if (emoji) {
    return (
      <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, background: "var(--tint-pink)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }} aria-hidden>{emoji}</div>
    );
  }
  const { color } = getBrandInfo(name);
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: 44, height: 44, borderRadius: 14, overflow: "hidden", flexShrink: 0,
      background: color.bg, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{ color: color.text, fontWeight: 700, fontSize: 15 }}>{initials}</span>
    </div>
  );
}


export function compactAmount(n: number) {
  if (n >= 100000) return Math.round(n / 1000) + "k";
  if (n >= 10000) return (n / 1000).toFixed(1).replace(".0", "") + "k";
  return Math.round(n).toLocaleString("sv");
}


export function StatCard({ icon, iconColor, iconBg, value, label }: {
  icon: React.ReactNode; iconColor: string; iconBg: string; value: number | string; label: string;
}) {
  return (
    <div style={{ background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)", padding: "14px 12px", boxShadow: "var(--shadow)", height: "100%", boxSizing: "border-box" }}>
      <div style={{ background: iconBg, borderRadius: 10, padding: 8, color: iconColor, display: "inline-flex", marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--fg)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
    </div>
  );
}

export const VISIBILITY_CHIP: Record<string, { icon: string; bg: string; color: string }> = {
  PRIVATE: { icon: "🔒", bg: "var(--background)", color: "var(--muted)" },
  PARENTS: { icon: "👪", bg: "var(--tint-warning)", color: "var(--warning)" },
  // HOUSEHOLD isn't shown as a chip — it's the "everyone sees this" default
  // once you're in a household, so flagging it would just be noise next to
  // the other badges.
};

export function ReminderRow({ reminder, badge, isFirst, onClick, currentUserId, householdMembers = [], hasHousehold = false }: {
  reminder: Reminder; badge: { bg: string; color: string }; isFirst: boolean; onClick: () => void; currentUserId?: string; householdMembers?: HouseholdMember[]; hasHousehold?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const { m: msg, dateLocale } = useI18n();
  const showAmount = reminder.amount != null && reminder.amount > 0;
  const showRecurrence = reminder.recurrence !== "ONCE" || showAmount;
  const isShared = reminder.user && reminder.user.id !== currentUserId;
  const sharedByName = isShared ? (reminder.user?.name?.split(" ")[0] ?? msg.home.someone) : null;
  const ownerMember = reminder.assignedTo ? householdMembers.find(m => m.userId === reminder.assignedTo) : null;
  const ownerName = ownerMember ? (ownerMember.user.name?.split(" ")[0] ?? ownerMember.user.email.split("@")[0]) : null;
  const isUnassigned = householdMembers.length > 1 && !reminder.assignedTo && reminder.category !== "BIRTHDAY";
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
        borderTop: isFirst ? "none" : "1px solid var(--border-soft)", cursor: "pointer",
        background: hovered ? "var(--surface-2)" : "transparent", transition: "background 0.12s",
      }}>
      <ServiceLogo name={reminder.name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>{reminder.name}</span>
          <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 50, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color }}>
            {msg.reminders.categories[reminder.category] ?? reminder.category}
          </span>
          {isShared && (
            <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 50, fontSize: 10, fontWeight: 700, background: "var(--tint-accent)", color: "var(--accent-strong)", gap: 3 }}>
              👤 {sharedByName}
            </span>
          )}
          {ownerName && !isShared && (
            <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 50, fontSize: 10, fontWeight: 700, background: "var(--tint-accent)", color: "var(--accent-strong)", gap: 3 }}>
              👤 {ownerName}
            </span>
          )}
          {isUnassigned && !isShared && (
            <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 50, fontSize: 10, fontWeight: 700, background: "var(--background)", color: "var(--subtle)" }}>
              {msg.common.unassigned}
            </span>
          )}
          {/* Visibility chip — visibility (PRIVATE/HOUSEHOLD/PARENTS) already
              existed in the schema but was never surfaced to the user. Only
              shown once there's a household to be private *from* — for a
              solo user every reminder is trivially private, so the chip
              would just be noise. HOUSEHOLD itself has no chip (the "seen by
              everyone" default), see VISIBILITY_CHIP above. */}
          {hasHousehold && VISIBILITY_CHIP[reminder.visibility] && (
            <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 50, fontSize: 10, fontWeight: 700, background: VISIBILITY_CHIP[reminder.visibility].bg, color: VISIBILITY_CHIP[reminder.visibility].color, gap: 3 }}>
              {VISIBILITY_CHIP[reminder.visibility].icon} {msg.reminders.visibility[reminder.visibility]}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
          {formatDate(reminder.date, dateLocale)}{reminder.startTime ? ` · ${reminder.startTime}` : ""}
          {showAmount && <> &middot; {reminder.amount!.toLocaleString(dateLocale)} {reminder.currency}</>}
          {showRecurrence && <> &middot; {msg.reminders.recurrence[reminder.recurrence] ?? reminder.recurrence}</>}
        </div>
      </div>
      <div style={{ color: "var(--faint)", flexShrink: 0 }}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>
  );
}

