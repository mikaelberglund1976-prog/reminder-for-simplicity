"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
};

const CATEGORY_LABELS: Record<string, string> = {
  SUBSCRIPTION: "Subscription",
  BIRTHDAY: "Birthday",
  INSURANCE: "Insurance",
  CONTRACT: "Contract",
  HEALTH: "Health",
  BILL: "Bill",
  OTHER: "Other",
};

const RECURRENCE_LABELS: Record<string, string> = {
  ONCE: "Once",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

const BRAND_COLORS: Record<string, { bg: string; text: string }> = {
  spotify: { bg: "#1DB954", text: "#fff" },
  netflix: { bg: "#E50914", text: "#fff" },
  youtube: { bg: "#FF0000", text: "#fff" },
  apple: { bg: "#000000", text: "#fff" },
  google: { bg: "#4285F4", text: "#fff" },
  amazon: { bg: "#FF9900", text: "#fff" },
  microsoft: { bg: "#00A4EF", text: "#fff" },
  adobe: { bg: "#FF0000", text: "#fff" },
  dropbox: { bg: "#0061FF", text: "#fff" },
  slack: { bg: "#4A154B", text: "#fff" },
  github: { bg: "#24292E", text: "#fff" },
  notion: { bg: "#000000", text: "#fff" },
  figma: { bg: "#F24E1E", text: "#fff" },
  linkedin: { bg: "#0A66C2", text: "#fff" },
  twitter: { bg: "#1DA1F2", text: "#fff" },
  default: { bg: "#5B9CF5", text: "#fff" },
};

function getBrandColor(name: string) {
  const lower = name.toLowerCase();
  for (const brand in BRAND_COLORS) {
    if (lower.includes(brand)) return BRAND_COLORS[brand];
  }
  return BRAND_COLORS.default;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  SUBSCRIPTION: { bg: "#D6E8FF", text: "#3A78D4" },
  BIRTHDAY: { bg: "#FFE8F5", text: "#C4367A" },
  INSURANCE: { bg: "#D4F4E6", text: "#1E7D52" },
  CONTRACT: { bg: "#FFF0E0", text: "#C06010" },
  HEALTH: { bg: "#FFE8E8", text: "#C44444" },
  BILL: { bg: "#EDE8FF", text: "#6A44CC" },
  OTHER: { bg: "#E8EDF4", text: "#5A6080" },
};

function ServiceLogo({ name, category }: { name: string; category: string }) {
  const brand = getBrandColor(name);
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ width: 40, height: 40, borderRadius: 12, background: brand.bg, color: brand.text, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function getDaysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: sameYear ? undefined : "numeric" });
}

function DaysChip({ days }: { days: number }) {
  if (days < 0) return <span className="badge" style={{ background: "#FFE8E8", color: "#D94F4F" }}>{Math.abs(days)}d ago</span>;
  if (days === 0) return <span className="badge" style={{ background: "#FFF0E0", color: "#C06010" }}>Today</span>;
  if (days <= 7) return <span className="badge" style={{ background: "#FFF0E0", color: "#C06010" }}>{days}d</span>;
  return <span className="badge" style={{ background: "#EBF3FF", color: "#3A78D4" }}>{days}d</span>;
}

const FILTER_CATEGORIES = [
  { value: "ALL", label: "All" },
  { value: "SUBSCRIPTION", label: "Subscriptions" },
  { value: "BIRTHDAY", label: "Birthdays" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "CONTRACT", label: "Contracts" },
  { value: "HEALTH", label: "Health" },
  { value: "BILL", label: "Bills" },
  { value: "OTHER", label: "Other" },
];

const SORT_OPTIONS = [
  { value: "date_asc", label: "Date ↑" },
  { value: "date_desc", label: "Date ↓" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "amount_desc", label: "Amount ↓" },
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [sortBy, setSortBy] = useState("date_asc");
  const [preferredCurrency, setPreferredCurrency] = useState("SEK");
  const [activeTab, setActiveTab] = useState<"reminders" | "history" | "settings">("reminders");

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  useEffect(() => { if (status === "authenticated") { fetchReminders(); fetchProfile(); } }, [status]);

  async function fetchReminders() {
    try { const res = await fetch("/api/reminders"); const data = await res.json(); setReminders(Array.isArray(data) ? data : []); } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function fetchProfile() {
    try { const res = await fetch("/api/profile"); if (res.ok) { const data = await res.json(); if (data.preferredCurrency) setPreferredCurrency(data.preferredCurrency); } } catch (e) { console.error(e); }
  }

  const upcoming = reminders.filter((r) => { const d = getDaysUntil(r.date); return d >= 0 && d <= 7; });
  const monthlyTotal = reminders.filter((r) => r.recurrence === "MONTHLY" && r.amount).reduce((sum, r) => sum + (r.amount || 0), 0);
  const notified = reminders.filter((r) => r.lastSentAt).length;

  const sorted = [...reminders].sort((a, b) => {
    if (sortBy === "date_asc") return getDaysUntil(a.date) - getDaysUntil(b.date);
    if (sortBy === "date_desc") return getDaysUntil(b.date) - getDaysUntil(a.date);
    if (sortBy === "name_asc") return a.name.localeCompare(b.name);
    if (sortBy === "amount_desc") return (b.amount || 0) - (a.amount || 0);
    return 0;
  });
  const filtered = filterCategory === "ALL" ? sorted : sorted.filter((r) => r.category === filterCategory);
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  if (status === "loading" || loading) {
    return <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center"><div className="text-[#8B90A4] text-[15px]">Loading…</div></div>;
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA]" style={{ paddingBottom: 80 }}>
      <header className="bg-white border-b border-[#E8EDF4] px-5 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-base" style={{ background: "#EBF3FF" }}>🔔</div>
            <span className="font-bold text-[17px] text-[#1A2340] tracking-tight">AssistIQ</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/profile" className="btn-ghost text-[13px]">Profile</Link>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-ghost text-[13px]">Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-5 py-6">
        <div className="mb-5">
          <h1 className="text-[22px] font-bold text-[#1A2340] tracking-tight">Welcome back, {firstName}</h1>
          <p className="text-[14px] text-[#8B90A4] mt-1">{reminders.length === 0 ? "No reminders yet" : `${reminders.length} active reminder${reminders.length === 1 ? "" : "s"}`}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="card-sm flex flex-col gap-1">
            <div className="text-[24px] font-bold text-[#1A2340]">{upcoming.length}</div>
            <div className="text-[12px] text-[#8B90A4] font-medium">Upcoming</div>
            <div className="text-[11px] text-[#5B9CF5]">next 7 days</div>
          </div>
          <div className="card-sm flex flex-col gap-1">
            <div className="text-[18px] font-bold text-[#1A2340] truncate">{monthlyTotal > 0 ? `${monthlyTotal.toLocaleString("en")} ${preferredCurrency}` : "—"}</div>
            <div className="text-[12px] text-[#8B90A4] font-medium">Monthly</div>
            <div className="text-[11px] text-[#2A9D6F]">recurring cost</div>
          </div>
          <div className="card-sm flex flex-col gap-1">
            <div className="text-[24px] font-bold text-[#1A2340]">{notified}</div>
            <div className="text-[12px] text-[#8B90A4] font-medium">Notified</div>
            <div className="text-[11px] text-[#E5873A]">emails sent</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link href="/dashboard/new" className="card-sm flex items-center gap-3 no-underline hover:shadow-md transition-shadow" style={{ textDecoration: "none" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ background: "#EBF3FF" }}>＋</div>
            <div><div className="text-[14px] font-semibold text-[#1A2340]">New reminder</div><div className="text-[12px] text-[#8B90A4]">Add something new</div></div>
          </Link>
          <div className="card-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ background: "#D4F4E6" }}>📅</div>
            <div>
              <div className="text-[14px] font-semibold text-[#1A2340]">What&apos;s next</div>
              <div className="text-[12px] text-[#8B90A4]">{upcoming.length > 0 ? `${upcoming[0].name} in ${getDaysUntil(upcoming[0].date)}d` : "All clear!"}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1" style={{ scrollbarWidth: "none" }}>
            {FILTER_CATEGORIES.map((cat) => (
              <button key={cat.value} onClick={() => setFilterCategory(cat.value)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all border ${filterCategory === cat.value ? "pill-active" : "pill-inactive"}`}>{cat.label}</button>
            ))}
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="flex-shrink-0 border border-[#E8EDF4] rounded-xl px-3 py-1.5 text-[13px] text-[#1A2340] bg-white focus:outline-none focus:ring-2 focus:ring-[#5B9CF5]">
            {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="card flex flex-col items-center py-12 text-center">
            <div className="text-4xl mb-4">📭</div>
            <h3 className="text-[16px] font-bold text-[#1A2340] mb-2">{filterCategory === "ALL" ? "No reminders yet" : `No ${CATEGORY_LABELS[filterCategory]?.toLowerCase() ?? ""} reminders`}</h3>
            <p className="text-[14px] text-[#8B90A4] mb-6">{filterCategory === "ALL" ? "Add the things you don't want to forget." : "Try a different category or add a new one."}</p>
            {filterCategory === "ALL" && <Link href="/dashboard/new" className="btn-accent">+ Add your first reminder</Link>}
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            {filtered.map((reminder, i) => {
              const days = getDaysUntil(reminder.date);
              const catColor = CATEGORY_COLORS[reminder.category] || CATEGORY_COLORS.OTHER;
              return (
                <div key={reminder.id} onClick={() => router.push(`/dashboard/${reminder.id}`)} className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-[#F8FAFD] transition-colors" style={{ borderTop: i === 0 ? "none" : "1px solid #E8EDF4" }}>
                  <ServiceLogo name={reminder.name} category={reminder.category} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-semibold text-[#1A2340] truncate">{reminder.name}</span>
                      <span className="badge text-[11px]" style={{ background: catColor.bg, color: catColor.text }}>{CATEGORY_LABELS[reminder.category]}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[12px] text-[#8B90A4]">{formatDate(reminder.date)}</span>
                      <span className="text-[12px] text-[#B0B7C8]">·</span>
                      <span className="text-[12px] text-[#8B90A4]">{RECURRENCE_LABELS[reminder.recurrence]}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <DaysChip days={days} />
                    {reminder.amount != null && <span className="text-[13px] font-semibold text-[#1A2340]">{reminder.amount.toLocaleString("en")} {reminder.currency}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8EDF4] z-20" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="max-w-2xl mx-auto flex items-center justify-around h-16">
          <button onClick={() => setActiveTab("reminders")} className="flex flex-col items-center gap-0.5 flex-1 py-2">
            <span className="text-xl">🔔</span>
            <span className={`text-[11px] font-semibold ${activeTab === "reminders" ? "text-[#5B9CF5]" : "text-[#8B90A4]"}`}>Reminders</span>
          </button>
          <Link href="/dashboard/new" className="flex flex-col items-center flex-1 no-underline" style={{ textDecoration: "none" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl font-bold" style={{ background: "#5B9CF5", marginTop: -16, boxShadow: "0 4px 14px rgba(91,156,245,0.45)" }}>+</div>
          </Link>
          <Link href="/profile" onClick={() => setActiveTab("settings")} className="flex flex-col items-center gap-0.5 flex-1 py-2 no-underline" style={{ textDecoration: "none" }}>
            <span className="text-xl">⚙️</span>
            <span className={`text-[11px] font-semibold ${activeTab === "settings" ? "text-[#5B9CF5]" : "text-[#8B90A4]"}`}>Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { differenceInDays } from "date-fns";
import Link from "next/link";
import { StarBackground } from "@/components/StarBackground";

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
};

const CATEGORY_ICONS: Record<string, string> = {
  SUBSCRIPTION: "💳",
  BIRTHDAY: "🎂",
  INSURANCE: "🛡️",
  CONTRACT: "📄",
  HEALTH: "❤️",
  OTHER: "📌",
};

const CATEGORY_LABELS: Record<string, string> = {
  SUBSCRIPTION: "Subscriptions",
  BIRTHDAY: "Birthdays",
  INSURANCE: "Insurance",
  CONTRACT: "Contracts",
  HEALTH: "Health",
  OTHER: "Other",
};

const RECURRENCE_LABELS: Record<string, string> = {
  ONCE: "Once",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

const CATEGORIES = ["ALL", "SUBSCRIPTION", "BIRTHDAY", "INSURANCE", "CONTRACT", "HEALTH", "OTHER"];

function getDaysUntil(dateStr: string) {
  return differenceInDays(new Date(dateStr), new Date());
}

function DaysLeft({ days }: { days: number }) {
  if (days < 0)
    return <span style={{ fontWeight: 700, color: "#ff6b6b", fontSize: 13 }}>{Math.abs(days)}d ago</span>;
  if (days === 0)
    return <span style={{ fontWeight: 700, color: "#ffaa55", fontSize: 13 }}>Today</span>;
  if (days <= 7)
    return <span style={{ fontWeight: 700, color: "#ffaa55", fontSize: 13 }}>{days}d</span>;
  return <span style={{ fontWeight: 600, color: "rgba(200,220,255,0.8)", fontSize: 13 }}>{days}d</span>;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [preferredCurrency, setPreferredCurrency] = useState("SEK");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchReminders();
      fetchProfile();
    }
  }, [status]);

  async function fetchReminders() {
    try {
      const res = await fetch("/api/reminders");
      const data = await res.json();
      setReminders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProfile() {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        if (data.preferredCurrency) setPreferredCurrency(data.preferredCurrency);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const sorted = [...reminders].sort((a, b) => getDaysUntil(a.date) - getDaysUntil(b.date));
  const filtered = filter === "ALL" ? sorted : sorted.filter((r) => r.category === filter);

  const nextRenewal = sorted.find((r) => getDaysUntil(r.date) >= 0);
  const monthlyTotal = reminders
    .filter((r) => r.recurrence === "MONTHLY" && r.amount)
    .reduce((sum, r) => sum + (r.amount || 0), 0);
  const yearlyTotal = reminders.filter((r) => r.amount).reduce((sum, r) => {
    if (r.recurrence === "MONTHLY") return sum + (r.amount || 0) * 12;
    return sum + (r.amount || 0);
  }, 0);

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  if (status === "loading" || loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "radial-gradient(ellipse at 60% 25%, #1e3f8a 0%, #0e2268 28%, #070f3c 60%, #030820 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <StarBackground />
        <span style={{ color: "rgba(180,200,255,0.7)", fontSize: 15, position: "relative", zIndex: 1 }}>
          Loading…
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at 60% 25%, #1e3f8a 0%, #0e2268 28%, #070f3c 60%, #030820 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <StarBackground />

      {/* Sticky header */}
      <header
        style={{
          position: "sticky", top: 0, zIndex: 20,
          background: "rgba(7,15,60,0.88)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          padding: "0 32px",
          height: 64,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
            }}
          >
            🔔
          </div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 18, letterSpacing: "-0.3px" }}>
            AssistIQ
          </span>
        </Link>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/dashboard/new"
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              background: "linear-gradient(160deg, #4a7ee0 0%, #2e5ec8 100%)",
              color: "#fff", fontWeight: 700, fontSize: 14,
              padding: "9px 20px", borderRadius: 50, textDecoration: "none",
              boxShadow: "0 3px 14px rgba(46,94,200,0.45)",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: 17, lineHeight: 1, marginTop: -1 }}>+</span>
            Add reminder
          </Link>

          <Link
            href="/profile"
            style={{
              color: "rgba(180,205,255,0.6)", fontSize: 14, fontWeight: 500,
              textDecoration: "none", padding: "8px 12px",
            }}
          >
            Profile
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.13)",
              color: "rgba(180,205,255,0.75)", fontSize: 14, fontWeight: 600,
              padding: "8px 18px", borderRadius: 50, cursor: "pointer",
              letterSpacing: "-0.1px",
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main */}
      <main
        style={{
          position: "relative", zIndex: 10,
          maxWidth: 1100, margin: "0 auto",
          padding: "36px 24px 100px",
        }}
      >
        {/* Welcome */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: "#fff", fontWeight: 800, fontSize: 26, letterSpacing: "-0.5px", margin: 0 }}>
            Welcome, {firstName}
          </h1>
          <p style={{ color: "rgba(160,185,255,0.55)", fontSize: 14, marginTop: 5 }}>
            {reminders.length === 0
              ? "No reminders yet"
              : `${reminders.length} active reminder${reminders.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14, marginBottom: 36,
          }}
        >
          {[
            { value: reminders.length.toString(), label: "Active reminders", big: true },
            {
              value: nextRenewal ? nextRenewal.name : "—",
              sub: nextRenewal
                ? getDaysUntil(nextRenewal.date) === 0 ? "today" : `${getDaysUntil(nextRenewal.date)}d away`
                : undefined,
              label: "Next renewal",
            },
            {
              value: monthlyTotal > 0 ? `${monthlyTotal.toLocaleString("en")} ${preferredCurrency}` : "—",
              label: "Monthly cost",
            },
            {
              value: yearlyTotal > 0 ? `${Math.round(yearlyTotal).toLocaleString("en")} ${preferredCurrency}` : "—",
              label: "Yearly total",
            },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 14, padding: "18px 20px",
                backdropFilter: "blur(8px)",
              }}
            >
              <div
                style={{
                  color: "#fff", fontWeight: 800,
                  fontSize: stat.big ? 38 : 18,
                  lineHeight: 1.1, overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >
                {stat.value}
              </div>
              {stat.sub && (
                <div style={{ color: "rgba(255,170,80,0.9)", fontSize: 12, fontWeight: 600, marginTop: 2 }}>
                  {stat.sub}
                </div>
              )}
              <div style={{ color: "rgba(140,170,230,0.55)", fontSize: 12, fontWeight: 500, marginTop: 6 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Category filter */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 18 }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                flexShrink: 0, padding: "7px 16px", borderRadius: 50,
                fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                background:
                  filter === cat
                    ? "linear-gradient(160deg, #4a7ee0 0%, #2e5ec8 100%)"
                    : "rgba(255,255,255,0.07)",
                color: filter === cat ? "#fff" : "rgba(180,205,255,0.6)",
                boxShadow: filter === cat ? "0 2px 12px rgba(46,94,200,0.4)" : "none",
              }}
            >
              {cat === "ALL" ? "All" : `${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]}`}
            </button>
          ))}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16, padding: "60px 24px", textAlign: "center",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <h3 style={{ color: "#fff", fontSize: 17, fontWeight: 700, margin: "0 0 8px" }}>
              {filter === "ALL" ? "No reminders yet" : `No ${CATEGORY_LABELS[filter]?.toLowerCase() ?? ""} reminders`}
            </h3>
            <p style={{ color: "rgba(160,185,255,0.55)", fontSize: 14, margin: "0 0 24px" }}>
              {filter === "ALL"
                ? "Add the things you don't want to forget."
                : "Try a different category or add a new one."}
            </p>
            {filter === "ALL" && (
              <Link
                href="/dashboard/new"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "linear-gradient(160deg, #4a7ee0 0%, #2e5ec8 100%)",
                  color: "#fff", fontWeight: 700, fontSize: 15,
                  padding: "12px 28px", borderRadius: 50, textDecoration: "none",
                }}
              >
                + Add your first reminder
              </Link>
            )}
          </div>
        ) : (
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 16, overflow: "hidden",
              backdropFilter: "blur(10px)",
            }}
          >
            {/* Header row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 100px 68px 114px 130px",
                gap: 16, padding: "13px 22px",
                borderBottom: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              {[
                { label: "", align: "left" },
                { label: "Name", align: "left" },
                { label: "Date", align: "left" },
                { label: "Left", align: "left" },
                { label: "Recurrence", align: "left" },
                { label: "Amount", align: "right" },
              ].map((col, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 11, fontWeight: 700,
                    color: "rgba(130,165,230,0.55)",
                    textTransform: "uppercase", letterSpacing: "0.07em",
                    textAlign: col.align as "left" | "right",
                  }}
                >
                  {col.label}
                </div>
              ))}
            </div>

            {/* Data rows */}
            {filtered.map((reminder, i) => {
              const days = getDaysUntil(reminder.date);
              return (
                <div
                  key={reminder.id}
                  onClick={() => router.push(`/dashboard/${reminder.id}`)}
                  style={{
                    borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.07)",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.05)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLDivElement).style.background = "transparent")
                  }
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "40px 1fr 100px 68px 114px 130px",
                      gap: 16, alignItems: "center",
                      padding: "14px 22px",
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{CATEGORY_ICONS[reminder.category]}</span>

                    <div style={{ overflow: "hidden" }}>
                      <div
                        style={{
                          fontWeight: 600, color: "#fff", fontSize: 14,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}
                      >
                        {reminder.name}
                      </div>
                      {reminder.note && (
                        <div
                          style={{
                            fontSize: 12, color: "rgba(160,185,255,0.45)", marginTop: 2,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}
                        >
                          {reminder.note}
                        </div>
                      )}
                    </div>

                    <span style={{ color: "rgba(175,200,255,0.65)", fontSize: 13 }}>
                      {formatDate(reminder.date)}
                    </span>

                    <DaysLeft days={days} />

                    <span style={{ color: "rgba(175,200,255,0.65)", fontSize: 13 }}>
                      {RECURRENCE_LABELS[reminder.recurrence]}
                    </span>

                    <span
                      style={{
                        fontSize: 14, fontWeight: 600, textAlign: "right",
                        color: reminder.amount ? "#fff" : "rgba(180,205,255,0.25)",
                      }}
                    >
                      {reminder.amount
                        ? `${reminder.amount.toLocaleString("en")} ${reminder.currency}`
                        : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Mobile FAB */}
      <Link
        href="/dashboard/new"
        style={{
          position: "fixed", bottom: 24, right: 24,
          width: 56, height: 56,
          background: "linear-gradient(160deg, #4a7ee0 0%, #2e5ec8 100%)",
          color: "#fff", borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, textDecoration: "none",
          boxShadow: "0 6px 24px rgba(46,94,200,0.55)",
          zIndex: 30,
        }}
        aria-label="Add reminder"
      >
        +
      </Link>
    </div>
  );
}
