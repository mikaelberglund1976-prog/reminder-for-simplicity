"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import HamburgerMenu from "@/components/HamburgerMenu";
import AdSlot from "@/components/AdSlot";

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
  SUBSCRIPTION: { bg: "var(--tint-accent)", color: "var(--accent-strong)" },
  BIRTHDAY:     { bg: "var(--tint-pink)", color: "var(--pink)" },
  INSURANCE:    { bg: "var(--tint-success)", color: "var(--success)" },
  CONTRACT:     { bg: "var(--tint-warning)", color: "var(--warning)" },
  HEALTH:       { bg: "var(--tint-danger)", color: "var(--danger)" },
  BILL:         { bg: "var(--tint-violet)", color: "var(--violet)" },
  OTHER:        { bg: "var(--border)", color: "var(--slate)" },
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
  return { color: { bg: "var(--accent-bg)", text: "#fff" }, domain: null };
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
      background: (!domain || imgError) ? color.bg : "var(--surface-3)",
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
function IcDown()    { return <svg width={13} height={13} viewBox="0 0 24 24" {...STR} strokeWidth={2.5}><polyline points="6 9 12 15 18 9"/></svg>; }
function IcPlus()    { return <svg width={22} height={22} viewBox="0 0 24 24" {...STR}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

function IcCart()    { return <svg {...SZ} viewBox="0 0 24 24" {...STR}><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 6H5.6"/></svg>; }
function IcSchool()  { return <svg {...SZ} viewBox="0 0 24 24" {...STR}><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12.5V17c0 1.5 2.5 3 6 3s6-1.5 6-3v-4.5"/></svg>; }
function IcChecklist() { return <svg {...SZ} viewBox="0 0 24 24" {...STR}><path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="m4 6 1 1 2-2"/><path d="m4 12 1 1 2-2"/><path d="m4 18 1 1 2-2"/></svg>; }
function IcGift()    { return <svg {...SZ} viewBox="0 0 24 24" {...STR}><rect x="3" y="8" width="18" height="4"/><rect x="4" y="12" width="16" height="9"/><path d="M12 8v13M12 8c-1.5-3-5-3-5-1s2 1 5 1zM12 8c1.5-3 5-3 5-1s-2 1-5 1z"/></svg>; }
function IcCalendar() { return <svg {...SZ} viewBox="0 0 24 24" {...STR}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function IcBellPlus() { return <svg {...SZ} viewBox="0 0 24 24" {...STR}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M12 6v5M9.5 8.5h5"/></svg>; }

// Order = how often the personas reached for them in the review.
const QUICK_ACTIONS: { label: string; href: string; Icon: () => React.ReactElement; color: string; tint: string; pro?: boolean }[] = [
  { label: "New reminder",  href: "/dashboard/new",                 Icon: IcBellPlus,  color: "var(--accent)",  tint: "var(--tint-accent)" },
  { label: "Shopping list", href: "/dashboard/family/shopping-list", Icon: IcCart,      color: "var(--success)", tint: "var(--tint-success)" },
  { label: "Homework & tests", href: "/dashboard/school",           Icon: IcSchool,    color: "var(--accent)",  tint: "var(--tint-accent)" , pro: true },
  { label: "Chores",        href: "/dashboard/family",               Icon: IcChecklist, color: "var(--warning)", tint: "var(--tint-warning)" , pro: true },
  { label: "Wishlists",     href: "/dashboard/wishlist",             Icon: IcGift,      color: "var(--danger)",  tint: "var(--tint-danger)" , pro: true },
  { label: "Calendar",      href: "/dashboard/calendar",             Icon: IcCalendar,  color: "var(--fg-2)",    tint: "var(--surface-3)" },
];

function SectionTitle({ children, inline }: { children: React.ReactNode; inline?: boolean }) {
  return <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--fg)", margin: inline ? 0 : "0 0 10px", letterSpacing: "-0.2px" }}>{children}</h2>;
}

function compactAmount(n: number) {
  if (n >= 100000) return Math.round(n / 1000) + "k";
  if (n >= 10000) return (n / 1000).toFixed(1).replace(".0", "") + "k";
  return Math.round(n).toLocaleString("sv");
}


function StatCard({ icon, iconColor, iconBg, value, label }: {
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

const VISIBILITY_CHIP: Record<string, { icon: string; label: string; bg: string; color: string }> = {
  PRIVATE: { icon: "🔒", label: "Private", bg: "var(--background)", color: "var(--muted)" },
  PARENTS: { icon: "👪", label: "Parents", bg: "var(--tint-warning)", color: "var(--warning)" },
  // HOUSEHOLD isn't shown as a chip — it's the "everyone sees this" default
  // once you're in a household, so flagging it would just be noise next to
  // the other badges.
};

function ReminderRow({ reminder, badge, isFirst, onClick, currentUserId, householdMembers = [], hasHousehold = false }: {
  reminder: Reminder; badge: { bg: string; color: string }; isFirst: boolean; onClick: () => void; currentUserId?: string; householdMembers?: HouseholdMember[]; hasHousehold?: boolean;
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
        borderTop: isFirst ? "none" : "1px solid var(--border-soft)", cursor: "pointer",
        background: hovered ? "var(--surface-2)" : "transparent", transition: "background 0.12s",
      }}>
      <ServiceLogo name={reminder.name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>{reminder.name}</span>
          <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 50, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color }}>
            {CATEGORY_LABELS[reminder.category] ?? reminder.category}
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
              Unassigned
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
              {VISIBILITY_CHIP[reminder.visibility].icon} {VISIBILITY_CHIP[reminder.visibility].label}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
          {formatDate(reminder.date)}
          {showAmount && <> &middot; {reminder.amount!.toLocaleString("sv")} {reminder.currency}</>}
          {showRecurrence && <> &middot; {RECURRENCE_LABELS[reminder.recurrence] ?? reminder.recurrence}</>}
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

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reminders, setReminders]        = useState<Reminder[]>([]);
  const [loading, setLoading]            = useState(true);
  const [preferredCurrency, setCurrency] = useState("SEK");
    const [filterCategory, setFilter]      = useState("ALL");
  const [sortBy, setSort]                = useState("date_asc");
  const [hasHousehold, setHasHousehold]  = useState(false);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [plan, setPlan] = useState<{ plan: "FREE" | "TRIAL" | "PRO"; trialDaysLeft: number | null } | null>(null);
  const [familySummary, setFamilySummary] = useState<{ childId: string; childName: string; total: number; done: number; pending: number }[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") { fetchReminders(); fetchProfile(); fetchHousehold(); fetchFamilyData(); }
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
      if (res.ok) {
        const d = await res.json();
        // Child profiles should never see the main reminder dashboard.
        // Kick them to their own chore overview.
        if (d.isChildProfile) {
          router.replace("/dashboard/family/child");
          return;
        }
        if (d.preferredCurrency) setCurrency(d.preferredCurrency);
      }
    } catch (e) { console.error(e); }
  }

  async function fetchHousehold() {
    try {
      const res = await fetch("/api/household");
      if (res.ok) {
        const d = await res.json();
        if (d.access) setPlan(d.access);
        if (d.household) {
          setHasHousehold(true);
          setHouseholdMembers(d.household.members ?? []);
        }
      }
    } catch (e) { console.error(e); }
  }

  const [creatingHousehold, setCreatingHousehold] = useState(false);
  async function createHousehold() {
    setCreatingHousehold(true);
    try {
      const res = await fetch("/api/household", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      if (res.ok) await fetchHousehold();
    } finally {
      setCreatingHousehold(false);
    }
  }

  async function fetchFamilyData() {
    try {
      const trialRes = await fetch("/api/family/trial");
      if (!trialRes.ok) return;
      const trialData = await trialRes.json();
      if (trialData.trialActive || trialData.isPro) {
        const weekRes = await fetch("/api/family/week");
        if (weekRes.ok) {
          const weekData = await weekRes.json();
          setFamilySummary(weekData.summary ?? []);
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

  // Pre-compute family card display values (avoids complex JSX expressions)
  const familyCardRows = familySummary.slice(0, 2).map(c => ({
    id: c.childId,
    name: c.childName,
    label: c.done + "/" + c.total,
    pct: c.total > 0 ? Math.round((c.done / c.total) * 100) : 0,
    allDone: c.done === c.total && c.total > 0,
  }));
  const pendingApprovals = familySummary.reduce((s, c) => s + c.pending, 0);

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "var(--muted)", fontSize: 15 }}>Reminder for Simplicity is thinking…</div>
      </div>
    );
  }

  const dropdownStyle = {
    width: "100%", appearance: "none" as const, WebkitAppearance: "none" as const,
    background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 12,
    padding: "11px 38px 11px 14px", fontSize: 13, fontWeight: 600, color: "var(--fg)",
    cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", fontFamily: FONT,
  };


  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", paddingBottom: 24, fontFamily: FONT }}>
      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "32px 20px 0" }}>

        {/* Header — 2026-09-27 UI review: short greeting + today's date
            instead of a paragraph of explanation (personas skimmed past it). */}
        <div style={{ marginBottom: 22, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
                {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              </span>
              {/* 2026-09-28: plan chip — always one tap from the plans page. */}
              {plan && hasHousehold && (
                <Link href="/upgrade" style={{
                  fontSize: 11, fontWeight: 800, textDecoration: "none", padding: "3px 9px", borderRadius: 50,
                  background: plan.plan === "FREE" ? "var(--surface-3)" : "var(--tint-accent)",
                  color: plan.plan === "FREE" ? "var(--muted)" : "var(--accent)",
                }}>
                  {plan.plan === "PRO" ? "⚡ Pro" : plan.plan === "TRIAL" ? `⚡ Trial · ${plan.trialDaysLeft}d left` : "Free · Try Pro"}
                </Link>
              )}
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--fg)", margin: 0, letterSpacing: "-0.6px" }}>
              Hi {firstName}
            </h1>
          </div>
          <HamburgerMenu />
        </div>

        {/* 2026-09-28: no family yet → one clear next step instead of a
            dozen buttons that lead to "set up your household first". */}
        {!hasHousehold && (
          <div style={{ background: "var(--hero-grad)", borderRadius: 20, padding: "20px 20px 18px", marginBottom: 22, color: "#fff" }}>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Set up your family</div>
            <div style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.5, marginBottom: 14 }}>
              Create your family to share reminders and a shopping list. Got an invite link from someone? Open it instead and you&apos;ll join their family.
            </div>
            <button onClick={createHousehold} disabled={creatingHousehold} style={{ background: "#fff", color: "#1C1C28", border: "none", borderRadius: 50, padding: "11px 20px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: FONT }}>
              {creatingHousehold ? "Creating…" : "Create my family"}
            </button>
          </div>
        )}

        {/* Quick actions — "What would you like to do?" row, borrowed from the
            reference app: the most common jobs one tap away, horizontally
            scrollable so the row never wraps on a phone. */}
        <SectionTitle>What would you like to do?</SectionTitle>
        <div className="rfs-hscroll" style={{ display: "flex", gap: 10, overflowX: "auto", margin: "0 -20px 24px", padding: "2px 20px 4px", scrollSnapType: "x proximity", scrollPaddingInline: 20 }}>
          {QUICK_ACTIONS.map((qa) => (
            <Link key={qa.href + qa.label} href={qa.href} style={{
              flex: "0 0 auto", width: 104, minHeight: 96, scrollSnapAlign: "start",
              background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18,
              padding: "14px 10px 12px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
              textDecoration: "none", color: "var(--fg)", boxShadow: "var(--shadow)",
            }}>
              <span style={{ position: "relative", width: 40, height: 40, borderRadius: 12, background: qa.tint, color: qa.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <qa.Icon />
                {qa.pro && plan?.plan === "FREE" && (
                  <span style={{ position: "absolute", top: -6, right: -14, fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 6, background: "var(--accent-bg)", color: "#fff" }}>PRO</span>
                )}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>{qa.label}</span>
            </Link>
          ))}
        </div>

        {/* Coming up — horizontal cards for the next 7 days (overdue first).
            Replaces both the old "Needs your attention" list (which repeated
            the same rows as the main list below) and the "IQ Spotlight" card. */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <SectionTitle inline>Coming up</SectionTitle>
          <Link href="/dashboard/calendar" style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>Calendar →</Link>
        </div>
        {attentionItems.length === 0 ? (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "18px 16px", marginBottom: 24, fontSize: 14, color: "var(--muted)" }}>
            Nothing in the next 7 days. Enjoy the calm.
          </div>
        ) : (
          <div className="rfs-hscroll" style={{ display: "flex", gap: 10, overflowX: "auto", margin: "0 -20px 24px", padding: "2px 20px 4px", scrollSnapType: "x mandatory", scrollPaddingInline: 20 }}>
            {attentionItems.slice(0, 10).map((r) => {
              const days = getDaysUntil(r.date);
              const overdue = days < 0;
              const badge = CATEGORY_BADGE[r.category] ?? CATEGORY_BADGE.OTHER;
              const owner = r.assignedTo ? householdMembers.find(m => m.userId === r.assignedTo) : null;
              const ownerName = owner ? (owner.user.name?.split(" ")[0] ?? owner.user.email.split("@")[0]) : null;
              return (
                <button key={r.id} onClick={() => router.push(`/dashboard/${r.id}`)} style={{
                  flex: "0 0 auto", width: 250, scrollSnapAlign: "start", textAlign: "left", cursor: "pointer",
                  background: "var(--surface)", border: overdue ? "1.5px solid var(--border-danger)" : "1px solid var(--border)",
                  borderRadius: 18, padding: 14, display: "flex", gap: 12, alignItems: "center", fontFamily: FONT, boxShadow: "var(--shadow)",
                }}>
                  <ServiceLogo name={r.name} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: overdue ? "var(--danger)" : days <= 1 ? "var(--warning)" : "var(--accent)", marginTop: 3 }}>
                      {overdue ? `Overdue · ${formatDate(r.date)}` : getRelativeTime(r.date)}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6, flexWrap: "nowrap", overflow: "hidden" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 50, fontSize: 10.5, fontWeight: 700, background: badge.bg, color: badge.color, whiteSpace: "nowrap" }}>
                        {CATEGORY_LABELS[r.category] ?? r.category}
                      </span>
                      {ownerName && <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>👤 {ownerName}</span>}
                      {r.amount != null && r.amount > 0 && <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>{r.amount.toLocaleString("sv")} {r.currency}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <AdSlot placement="home" style={{ marginBottom: 20 }} />

        {/* Overview tiles — three honest numbers. "Needs attention" used to
            count only overdue items while the list above said "4 items";
            it's now labelled for what it is. */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 12 }}>
          <StatCard icon={<IcBell />} iconColor="var(--accent)" iconBg="var(--tint-accent)" value={totalActive} label="Active" />
          <StatCard icon={<IcAlert />} iconColor="var(--danger)" iconBg="var(--tint-danger)" value={passedCount} label="Overdue" />
          <button onClick={() => { setSort("amount_desc"); document.getElementById("all-reminders")?.scrollIntoView({ behavior: "smooth" }); }}
            style={{ all: "unset", cursor: "pointer", display: "block" }} aria-label="Review recurring costs">
            <StatCard icon={<IcCard />} iconColor="var(--success)" iconBg="var(--tint-success)"
              value={yearlyTotal > 0 ? compactAmount(yearlyTotal) : "—"} label={`Per year${yearlyTotal > 0 ? " · " + preferredCurrency : ""}`} />
          </button>
        </div>

        {/* Family progress — only when there's something to show. */}
        {familyCardRows.length > 0 && (
          <Link href="/dashboard/family" style={{
            display: "block", textDecoration: "none", background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 18, padding: "14px 16px", marginBottom: 12, boxShadow: "var(--shadow)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>🏠 Chores this week</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: pendingApprovals > 0 ? "var(--warning)" : "var(--muted)" }}>
                {pendingApprovals > 0 ? `${pendingApprovals} waiting approval` : "Open →"}
              </span>
            </div>
            {familyCardRows.map(row => (
              <div key={row.id} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-2)" }}>{row.name}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{row.label}</span>
                </div>
                <div style={{ height: 6, background: "var(--surface-3)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: row.allDone ? "#2A9D6F" : "var(--accent-bg)", width: row.pct + "%" }} />
                </div>
              </div>
            ))}
          </Link>
        )}

        <div id="all-reminders" style={{ scrollMarginTop: 16 }} />
        <SectionTitle>All reminders</SectionTitle>

        {/* Section content */}
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
                <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--muted)" }}><IcDown /></div>
              </div>
              <div style={{ position: "relative", flex: 1 }}>
                <select value={sortBy} onChange={e => setSort(e.target.value)} style={dropdownStyle}>
                  <option value="date_asc">Due soonest</option>
                  <option value="date_desc">Latest first</option>
                  <option value="name_asc">Name A–Z</option>
                  <option value="amount_desc">Highest amount</option>
                </select>
                <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--muted)" }}><IcDown /></div>
              </div>
            </div>

            {/* List */}
            {filtered.length === 0 ? (
              <div style={{ background: "var(--surface)", borderRadius: 20, border: "1px solid var(--border)", padding: "48px 24px", textAlign: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>&#128237;</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", marginBottom: 6 }}>No reminders yet</div>
                <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>Add the things you don&apos;t want to forget.</div>
                <Link href="/dashboard/new" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--accent-bg)", color: "#fff", borderRadius: 50, padding: "12px 28px", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                  + Add your first reminder
                </Link>
              </div>
            ) : (
              <div style={{ background: "var(--surface)", borderRadius: 20, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", marginBottom: 12 }}>
                {filtered.map((r, i) => (
                  <ReminderRow key={r.id} reminder={r} badge={CATEGORY_BADGE[r.category] ?? CATEGORY_BADGE.OTHER}
                    isFirst={i === 0} onClick={() => router.push(`/dashboard/${r.id}`)} currentUserId={session?.user?.id} householdMembers={householdMembers} hasHousehold={hasHousehold} />
                ))}
                  </div>
            )}

            {/* Add reminder (hidden when the empty state above already offers it) */}
            {filtered.length > 0 && (
            <Link href="/dashboard/new" style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "100%", background: "var(--surface)", border: "1.5px dashed var(--border)",
              borderRadius: 16, padding: "15px", fontSize: 14, fontWeight: 600,
              color: "var(--muted)", textDecoration: "none", boxSizing: "border-box",
            }}>
              + Add reminder
            </Link>
            )}
          </>

      </main>

      {/* Floating "add reminder" button — sits just above the shared bottom tab bar
          (see app/dashboard/layout.tsx + components/BottomNav.tsx) instead of living
          inside its own nav row, so the two don't stack on top of each other. */}
      <Link href="/dashboard/new" aria-label="Add reminder" style={{
        position: "fixed", right: 20, bottom: "calc(env(safe-area-inset-bottom, 0px) + 92px)", zIndex: 19,
        width: 52, height: 52, borderRadius: "50%",
        background: "var(--accent-bg)", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 16px rgba(26,35,64,0.28)", textDecoration: "none",
      }}>
        <IcPlus />
      </Link>
    </div>
  );
}
