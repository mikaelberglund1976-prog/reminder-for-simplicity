"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type HouseholdMember = { id: string; userId: string; user: { id: string; name: string | null; email: string } };

type Reminder = {
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
};

const CATEGORY_LABELS: Record<string, string> = {
  SUBSCRIPTION: "Subscription",
  BIRTHDAY:     "Birthday",
  INSURANCE:    "Insurance",
  CONTRACT:     "Contract",
  HEALTH:       "Health",
  BILL:         "Bill",
  OTHER:        "Other",
};

const RECURRENCE_LABELS: Record<string, string> = {
  ONCE:    "Once",
  DAILY:   "Daily",
  WEEKLY:  "Weekly",
  MONTHLY: "Monthly",
  YEARLY:  "Yearly",
};

const CATEGORY_BADGE: Record<string, { bg: string; color: string }> = {
  SUBSCRIPTION: { bg: "#D6E8FF", color: "#3A78D4" },
  BIRTHDAY:     { bg: "#FFE8F5", color: "#C4367A" },
  INSURANCE:    { bg: "#D4F4E6", color: "#1E7D52" },
  CONTRACT:     { bg: "#FFF0E0", color: "#C06010" },
  HEALTH:       { bg: "#FFE8E8", color: "#C44444" },
  BILL:         { bg: "#EDE8FF", color: "#6A44CC" },
  OTHER:        { bg: "#E8EDF4", color: "#5A6080" },
};

const BRAND_COLORS: Record<string, { bg: string; text: string }> = {
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

const BRAND_DOMAINS: Record<string, string> = {
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

function getBrandInfo(name: string) {
  const lower = name.toLowerCase();
  for (const brand in BRAND_COLORS) {
    if (lower.includes(brand)) {
      return { color: BRAND_COLORS[brand], domain: BRAND_DOMAINS[brand] ?? null };
    }
  }
  return { color: { bg: "#5B9CF5", text: "#fff" }, domain: null };
}

function getDaysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getRelativeTime(dateStr: string): string {
  const days = getDaysUntil(dateStr);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days <= 6) return "On " + new Date(dateStr).toLocaleDateString("en-GB", { weekday: "long" });
  if (days <= 13) return "In " + days + " days";
  if (days <= 59) return "In " + Math.ceil(days / 7) + " weeks";
  return "In " + Math.ceil(days / 30) + " months";
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function ServiceLogo({ name }: { name: string }) {
  const [imgError, setImgError] = useState(false);
  const { color, domain } = getBrandInfo(name);
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: 44, height: 44, borderRadius: 14, overflow: "hidden", flexShrink: 0,
      background: (!domain || imgError) ? color.bg : "#f0f0f0",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {domain && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`https://logo.clearbit.com/${domain}`} alt={name} width={44} height={44}
          onError={() => setImgError(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ color: color.text, fontWeight: 700, fontSize: 15 }}>{initials}</span>
      )}
    </div>
  );
}

const SZ = { width: 20, height: 20 };
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function IcBell()    { return <svg {...SZ} viewBox="0 0 24 24" {...STR}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
function IcCard()    { return <svg {...SZ} viewBox="0 0 24 24" {...STR}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>; }
function IcAlert()   { return <svg {...SZ} viewBox="0 0 24 24" {...STR}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>; }
function IcCheck()   { return <svg {...SZ} viewBox="0 0 24 24" {...STR}><polyline points="20 6 9 17 4 12"/></svg>; }
function IcStar()    { return <svg {...SZ} viewBox="0 0 24 24" {...STR}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>; }
function IcRight()   { return <svg width={16} height={16} viewBox="0 0 24 24" {...STR} strokeWidth={2.5}><polyline points="9 18 15 12 9 6"/></svg>; }
function IcDown()    { return <svg width={13} height={13} viewBox="0 0 24 24" {...STR} strokeWidth={2.5}><polyline points="6 9 12 15 18 9"/></svg>; }
function IcPlus()    { return <svg width={22} height={22} viewBox="0 0 24 24" {...STR}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function IcHistory() { return <svg width={22} height={22} viewBox="0 0 24 24" {...STR} strokeWidth={1.8}><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 0 .5-4H3"/><polyline points="3 3 3 7 7 7"/></svg>; }
function IcGear()    { return <svg width={22} height={22} viewBox="0 0 24 24" {...STR} strokeWidth={1.8}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }
function IcNavCal()  { return <svg width={22} height={22} viewBox="0 0 24 24" {...STR} strokeWidth={1.8}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

function StatCard({ icon, iconColor, iconBg, value, label }: {
  icon: React.ReactNode; iconColor: string; iconBg: string; value: number | string; label: string;
}) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E8EDF4", padding: "14px 12px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ background: iconBg, borderRadius: 10, padding: 8, color: iconColor, display: "inline-flex", marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function NavBtn({ label, icon, active, onClick }: {
  label: string; icon: React.ReactNode; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 3, background: "none", border: "none",
      cursor: "pointer", color: active ? "#5B9CF5" : "#8B90A4", padding: "8px 0",
      fontFamily: FONT,
    }}>
      {icon}
      <span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
    </button>
  );
}

function ReminderRow({ reminder, badge, isFirst, onClick, currentUserId, householdMembers = [] }: {
  reminder: Reminder; badge: { bg: string; color: string }; isFirst: boolean; onClick: () => void; currentUserId?: string; householdMembers?: HouseholdMember[];
}) {
  const [hovered, setHovered] = useState(false);
  const showAmount = reminder.amount != null && reminder.amount > 0;
  const showRecurrence = reminder.recurrence !== "ONCE" || showAmount;
  const isShared = reminder.user && reminder.user.id !== currentUserId;
  const sharedByName = isShared ? (reminder.user?.name?.split(" ")[0] ?? "someone") : null;
  const ownerMember = reminder.assignedTo ? householdMembers.find(m => m.userId === reminder.assignedTo) : null;
  const ownerName = ownerMember ? (ownerMember.user.name?.split(" ")[0] ?? ownerMember.user.email.split("@")[0]) : null;
  const isUnassigned = householdMembers.length > 1 && !reminder.assignedTo;
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
        borderTop: isFirst ? "none" : "1px solid #F0F3F8", cursor: "pointer",
        background: hovered ? "#F8FAFD" : "transparent", transition: "background 0.12s",
      }}>
      <ServiceLogo name={reminder.name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{reminder.name}</span>
          <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 50, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color }}>
            {CATEGORY_LABELS[reminder.category] ?? reminder.category}
          </span>
          {isShared && (
            <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 50, fontSize: 10, fontWeight: 700, background: "#EEF5FF", color: "#3A78D4", gap: 3 }}>
              👤 {sharedByName}
            </span>
          )}
          {ownerName && !isShared && (
            <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 50, fontSize: 10, fontWeight: 700, background: "#EEF5FF", color: "#3A78D4", gap: 3 }}>
              👤 {ownerName}
            </span>
          )}
          {isUnassigned && !isShared && (
            <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 50, fontSize: 10, fontWeight: 700, background: "#F5F6FA", color: "#9CA3AF" }}>
              Unassigned
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "#8B90A4", marginTop: 3 }}>
          {formatDate(reminder.date)}
          {showAmount && <> &middot; {reminder.amount!.toLocaleString("sv")} {reminder.currency}</>}
          {showRecurrence && <> &middot; {RECURRENCE_LABELS[reminder.recurrence] ?? reminder.recurrence}</>}
        </div>
      </div>
      <div style={{ color: "#C0C5D0", flexShrink: 0 }}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reminders, setReminders]        = useState<Reminder[]>([]);
  const [loading, setLoading]            = useState(true);
  const [preferredCurrency, setCurrency] = useState("SEK");
  const [activeSection, setSection]      = useState<"reminders" | "family">("reminders");
  const [filterCategory, setFilter]      = useState("ALL");
  const [sortBy, setSort]                = useState("date_asc");
  const [activeTab, setTab]              = useState<"reminders" | "history" | "settings">("reminders");
  const [hasHousehold, setHasHousehold]  = useState(false);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") { fetchReminders(); fetchProfile(); fetchHousehold(); }
  }, [status]);

  async function fetchReminders() {
    try {
      const res = await fetch("/api/reminders");
      const data = await res.json();
      setReminders(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function fetchProfile() {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) { const d = await res.json(); if (d.preferredCurrency) setCurrency(d.preferredCurrency); }
    } catch (e) { console.error(e); }
  }

  async function fetchHousehold() {
    try {
      const res = await fetch("/api/household");
      if (res.ok) {
        const d = await res.json();
        if (d.household) {
          setHasHousehold(true);
          setHouseholdMembers(d.household.members ?? []);
        }
      }
    } catch (e) { console.error(e); }
  }

  // Stats
  const totalActive   = reminders.length;
  const passedCount   = reminders.filter(r => getDaysUntil(r.date) < 0).length;
  const attentionItems = [...reminders]
    .filter(r => getDaysUntil(r.date) <= 7)
    .sort((a, b) => getDaysUntil(a.date) - getDaysUntil(b.date));
  const completedLast30 = reminders.filter(r => {
    if (!r.lastSentAt) return false;
    return (Date.now() - new Date(r.lastSentAt).getTime()) < 30 * 24 * 60 * 60 * 1000;
  }).length;

  // Yearly budget — annualise each amount by recurrence
  const yearlyTotal = reminders
    .filter(r => r.amount != null && r.amount > 0)
    .reduce((sum, r) => {
      const a = r.amount ?? 0;
      switch (r.recurrence) {
        case "MONTHLY": return sum + a * 12;
        case "WEEKLY":  return sum + a * 52;
        case "DAILY":   return sum + a * 365;
        default:        return sum + a; // ONCE, YEARLY
      }
    }, 0);

  // IQ Spotlight — nearest upcoming reminder
  const spotlight = [...reminders]
    .filter(r => getDaysUntil(r.date) >= 0)
    .sort((a, b) => getDaysUntil(a.date) - getDaysUntil(b.date))[0] ?? null;

  const myReminders     = reminders.filter(r => !r.user || r.user.id === session?.user?.id);
  const sharedReminders = reminders.filter(r => r.user && r.user.id !== session?.user?.id);

  const sorted = [...reminders].sort((a, b) => {
    if (sortBy === "date_asc")    return getDaysUntil(a.date) - getDaysUntil(b.date);
    if (sortBy === "date_desc")   return getDaysUntil(b.date) - getDaysUntil(a.date);
    if (sortBy === "name_asc")    return a.name.localeCompare(b.name);
    if (sortBy === "amount_desc") return (b.amount ?? 0) - (a.amount ?? 0);
    return 0;
  });
  const filtered = sorted.filter(r => {
    if (filterCategory === "FAMILY")     return r.user && r.user.id !== session?.user?.id;
    if (filterCategory === "UNASSIGNED") return !r.assignedTo;
    if (filterCategory !== "ALL")        return r.category === filterCategory;
    return true;
  });
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F5F6FA", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "#8B90A4", fontSize: 15 }}>AssistIQ is thinking…</div>
      </div>
    );
  }

  const dropdownStyle = {
    width: "100%", appearance: "none" as const, WebkitAppearance: "none" as const,
    background: "#fff", border: "1.5px solid #E8EDF4", borderRadius: 12,
    padding: "11px 38px 11px 14px", fontSize: 13, fontWeight: 600, color: "#1A2340",
    cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", fontFamily: FONT,
  };

  const sectionCardStyle = (active: boolean) => ({
    background: "#fff",
    border: active ? "2px solid #5B9CF5" : "1.5px solid #E8EDF4",
    borderRadius: 18, padding: "16px 14px", cursor: "pointer", textAlign: "left" as const,
    boxShadow: active ? "0 2px 12px rgba(91,156,245,0.18)" : "0 1px 4px rgba(0,0,0,0.04)",
    transition: "all 0.15s",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#F5F6FA", paddingBottom: 88, fontFamily: FONT }}>
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "32px 20px 0" }}>

        {/* Welcome */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", margin: 0, letterSpacing: "-0.5px" }}>
            Welcome back, {firstName}
          </h1>
          <p style={{ fontSize: 14, color: "#4B5563", margin: "6px 0 0", lineHeight: 1.5 }}>
            Get a quick overview of what is coming up and what needs your attention.
          </p>
        </div>

        {/* Needs your attention */}
        {attentionItems.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", margin: 0 }}>
                Needs your attention
              </h2>
              <span style={{ fontSize: 12, color: "#DC2626", fontWeight: 700 }}>
                {attentionItems.length} item{attentionItems.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #FFD9D4", overflow: "hidden", boxShadow: "0 1px 6px rgba(220,38,38,0.07)" }}>
              {attentionItems.slice(0, 3).map((r, i) => (
                <ReminderRow key={r.id} reminder={r} badge={CATEGORY_BADGE[r.category] ?? CATEGORY_BADGE.OTHER}
                  isFirst={i === 0} onClick={() => router.push(`/dashboard/${r.id}`)} currentUserId={session?.user?.id} householdMembers={householdMembers} />
              ))}
              {attentionItems.length > 3 && (
                <div style={{ padding: "12px 16px", borderTop: "1px solid #F0F3F8", textAlign: "center" }}>
                  <button
                    onClick={() => { setSort("date_asc"); setSection("reminders"); }}
                    style={{ background: "none", border: "none", color: "#DC2626", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}
                  >
                    View all {attentionItems.length} items →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* IQ Spotlight */}
        {spotlight ? (
          <div style={{
            background: "linear-gradient(135deg, #1A2340 0%, #2C3E6E 100%)",
            borderRadius: 20, padding: "18px 20px", marginBottom: 12,
            display: "flex", alignItems: "center", gap: 16,
            boxShadow: "0 4px 20px rgba(26,35,64,0.18)",
          }}>
            <div style={{ background: "rgba(91,156,245,0.2)", borderRadius: 14, padding: 10, flexShrink: 0 }}>
              <IcStar />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
                IQ Spotlight · Up next
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {spotlight.name}
              </div>
            </div>
            <div style={{
              background: "rgba(91,156,245,0.25)", borderRadius: 50,
              padding: "6px 14px", fontSize: 13, fontWeight: 700, color: "#7BB8FF",
              whiteSpace: "nowrap", flexShrink: 0,
            }}>
              {getRelativeTime(spotlight.date)}
            </div>
          </div>
        ) : null}

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <StatCard icon={<IcBell />}  iconColor="#5B9CF5" iconBg="#EBF3FF"
            value={totalActive} label="Reminders" />
          <StatCard icon={<IcAlert />} iconColor="#D94F4F" iconBg="#FFE8E8"
            value={passedCount} label="Needs attention" />
        </div>

        {/* Budget action card */}
        <div
          onClick={() => { setSort("amount_desc"); setSection("reminders"); }}
          style={{
            background: "#fff", borderRadius: 16, border: "1px solid #E8EDF4",
            padding: "16px", marginBottom: 12, cursor: "pointer",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            display: "flex", alignItems: "center", gap: 14,
          }}
        >
          <div style={{ background: "#D4F4E6", borderRadius: 10, padding: 8, color: "#2A9D6F", display: "inline-flex", flexShrink: 0 }}>
            <IcCard />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>Recurring costs this year</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", lineHeight: 1.1, marginTop: 2 }}>
              {yearlyTotal > 0 ? yearlyTotal.toLocaleString("sv") + " " + preferredCurrency : "—"}
            </div>
            <div style={{ fontSize: 12, color: "#8B90A4", marginTop: 3 }}>See what&apos;s coming up and where you can cut back</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700, color: "#2A9D6F", flexShrink: 0 }}>
            Review costs <IcRight />
          </div>
        </div>

        {/* Activity strip */}
        <div style={{
          background: "#fff", borderRadius: 16, border: "1px solid #E8EDF4",
          padding: "14px 16px", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 12,
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}>
          <div style={{ background: "#D4F4E6", borderRadius: 10, padding: 8, color: "#2A9D6F", display: "flex" }}><IcCheck /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>Completed last 30 days</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", lineHeight: 1.1, marginTop: 2 }}>{completedLast30}</div>
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>reminders sent</div>
        </div>

        {/* Section selector */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <button onClick={() => setSection("reminders")} style={sectionCardStyle(activeSection === "reminders")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ background: "#EBF3FF", borderRadius: 10, padding: 8, color: "#5B9CF5", display: "flex" }}><IcBell /></div>
              <div style={{ color: "#C0C5D0" }}><IcRight /></div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1A2340", marginBottom: 4 }}>My reminders</div>
            <div style={{ fontSize: 12, color: "#8B90A4", lineHeight: 1.4 }}>
              {myReminders.length} reminder{myReminders.length !== 1 ? "s" : ""}
            </div>
          </button>

          <button onClick={() => setSection("family")} style={sectionCardStyle(activeSection === "family")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ background: hasHousehold ? "#FFF0D4" : "#F0F2F7", borderRadius: 10, padding: 8, color: hasHousehold ? "#C06010" : "#B0B7C8", display: "flex", fontSize: 18, lineHeight: 1 }}>🏠</div>
              <div style={{ color: "#C0C5D0" }}><IcRight /></div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1A2340", marginBottom: 4 }}>Family</div>
            <div style={{ fontSize: 12, color: "#8B90A4", lineHeight: 1.4 }}>
              {hasHousehold
                ? sharedReminders.length > 0
                  ? `${sharedReminders.length} shared reminder${sharedReminders.length !== 1 ? "s" : ""}`
                  : "No shared reminders yet"
                : "Invite family to get started"}
            </div>
          </button>
        </div>

        {/* Section content */}
        {activeSection === "reminders" ? (
          <>
            {/* Filters */}
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <select value={filterCategory} onChange={e => setFilter(e.target.value)} style={dropdownStyle}>
                  <option value="ALL">All reminders</option>
                  {hasHousehold && sharedReminders.length > 0 && (
                    <option value="FAMILY">👪 Family shared</option>
                  )}
                  {hasHousehold && (
                    <option value="UNASSIGNED">👤 Unassigned</option>
                  )}
                  <option value="SUBSCRIPTION">Subscriptions</option>
                  <option value="BIRTHDAY">Birthdays</option>
                  <option value="INSURANCE">Insurance</option>
                  <option value="CONTRACT">Contracts</option>
                  <option value="HEALTH">Health</option>
                  <option value="BILL">Bills</option>
                  <option value="OTHER">Other</option>
                </select>
                <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#8B90A4" }}><IcDown /></div>
              </div>
              <div style={{ position: "relative", flex: 1 }}>
                <select value={sortBy} onChange={e => setSort(e.target.value)} style={dropdownStyle}>
                  <option value="date_asc">Due soonest</option>
                  <option value="date_desc">Latest first</option>
                  <option value="name_asc">Name A–Z</option>
                  <option value="amount_desc">Highest amount</option>
                </select>
                <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#8B90A4" }}><IcDown /></div>
              </div>
            </div>

            {/* List */}
            {filtered.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E8EDF4", padding: "48px 24px", textAlign: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>&#128237;</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1A2340", marginBottom: 6 }}>No reminders yet</div>
                <div style={{ fontSize: 14, color: "#8B90A4", marginBottom: 24 }}>Add the things you don&apos;t want to forget.</div>
                <Link href="/dashboard/new" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#5B9CF5", color: "#fff", borderRadius: 50, padding: "12px 28px", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                  + Add your first reminder
                </Link>
              </div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E8EDF4", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", marginBottom: 12 }}>
                {filtered.map((r, i) => (
                  <ReminderRow key={r.id} reminder={r} badge={CATEGORY_BADGE[r.category] ?? CATEGORY_BADGE.OTHER}
                    isFirst={i === 0} onClick={() => router.push(`/dashboard/${r.id}`)} currentUserId={session?.user?.id} householdMembers={householdMembers} />
                ))}
                  </div>
            )}

            {/* Add reminder */}
            <Link href="/dashboard/new" style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "100%", background: "#fff", border: "1.5px dashed #D0D7E8",
              borderRadius: 16, padding: "15px", fontSize: 14, fontWeight: 600,
              color: "#8B90A4", textDecoration: "none", boxSizing: "border-box",
            }}>
              + Add reminder
            </Link>
          </>
        ) : (
          /* Family section */
          hasHousehold ? (
            sharedReminders.length > 0 ? (
              <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E8EDF4", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                {sharedReminders.map((r, i) => (
                  <ReminderRow key={r.id} reminder={r} badge={CATEGORY_BADGE[r.category] ?? CATEGORY_BADGE.OTHER}
                    isFirst={i === 0} onClick={() => router.push(`/dashboard/${r.id}`)} currentUserId={session?.user?.id} householdMembers={householdMembers} />
                ))}
              </div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E8EDF4", padding: "48px 24px", textAlign: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>&#127968;</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1A2340", marginBottom: 6 }}>No shared reminders yet</div>
                <div style={{ fontSize: 14, color: "#8B90A4", lineHeight: 1.6 }}>
                  When a family member shares a reminder with you, it will appear here.
                </div>
              </div>
            )
          ) : (
            <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E8EDF4", padding: "48px 24px", textAlign: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>&#127968;</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1A2340", marginBottom: 6 }}>Family sharing</div>
              <div style={{ fontSize: 14, color: "#8B90A4", lineHeight: 1.6, maxWidth: 260, margin: "0 auto 24px" }}>
                Invite your family to share reminders and never miss what matters together.
              </div>
              <Link href="/profile" style={{ display: "inline-block", padding: "12px 24px", background: "#1A2340", color: "#fff", borderRadius: 50, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
                Set up family sharing \u2192
              </Link>
            </div>
          )
        )}

      </main>

      {/* Bottom nav */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #E8EDF4", paddingBottom: "env(safe-area-inset-bottom)", zIndex: 20 }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", height: 64 }}>
          <NavBtn label="Reminders" icon={<IcNavCal />} active={activeTab === "reminders"}
            onClick={() => { setTab("reminders"); setSection("reminders"); }} />
          <Link href="/dashboard/new" style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", textDecoration: "none" }}>
            <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#1A2340", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18, boxShadow: "0 4px 16px rgba(26,35,64,0.28)" }}>
              <IcPlus />
            </div>
          </Link>
          <NavBtn label="History" icon={<IcHistory />} active={activeTab === "history"}
            onClick={() => setTab("history")} />
          <NavBtn label="Settings" icon={<IcGear />} active={activeTab === "settings"}
            onClick={() => { setTab("settings"); router.push("/profile"); }} />
        </div>
      </nav>
    </div>
  );
}
