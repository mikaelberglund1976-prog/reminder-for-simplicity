"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CATEGORIES = [
  { value: "ALL", label: "All" },
  { value: "SUBSCRIPTION", label: "Subscription" },
  { value: "BIRTHDAY", label: "Birthday" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "CONTRACT", label: "Contract" },
  { value: "BILL", label: "Bill" },
  { value: "HEALTH", label: "Health" },
  { value: "OTHER", label: "Other" },
];

const CATEGORY_COLORS = {
  SUBSCRIPTION: { bg: "#D6E8FF", text: "#3A78D4" },
  BIRTHDAY: { bg: "#FFE8F5", text: "#C4367A" },
  INSURANCE: { bg: "#D4F4E6", text: "#1E7D52" },
  CONTRACT: { bg: "#FFF0E0", text: "#C06010" },
  HEALTH: { bg: "#FFE8E8", text: "#C44444" },
  BILL: { bg: "#EDE8FF", text: "#6A44CC" },
  OTHER: { bg: "#E8EDF4", text: "#5A6080" },
};

const BRAND_COLORS = {
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
  default: { bg: "#5B9CF5", text: "#fff" },
};

function getBrandColor(name) {
  const lower = name.toLowerCase();
  for (const brand in BRAND_COLORS) {
    if (lower.includes(brand)) return BRAND_COLORS[brand];
  }
  return BRAND_COLORS.default;
}

function ServiceLogo({ name }) {
  const brand = getBrandColor(name);
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ width: 44, height: 44, borderRadius: 12, background: brand.bg, color: brand.text, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function DaysChip({ date }) {
  const days = Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const label = days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? "Today" : `${days}d left`;
  const color = days < 0 ? { bg: "#FFEAEA", text: "#D94F4F" } : days <= 7 ? { bg: "#FFF3E0", text: "#C06010" } : { bg: "#E6F7F0", text: "#1E7D52" };
  return <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ background: color.bg, color: color.text }}>{label}</span>;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [sort, setSort] = useState("date_asc");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") fetchReminders();
  }, [status]);

  async function fetchReminders() {
    try {
      const res = await fetch("/api/reminders");
      const data = await res.json();
      setReminders(Array.isArray(data) ? data : []);
    } catch {
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }

  const firstName = session?.user?.name?.split(" ")[0] || session?.user?.email || "there";
  const now = new Date();
  const upcoming = reminders.filter((r) => new Date(r.date) >= now).length;
  const monthly = reminders.filter((r) => r.amount != null).reduce((sum, r) => sum + (r.amount || 0), 0);
  const notified = reminders.filter((r) => new Date(r.date) < now).length;
  const filtered = filter === "ALL" ? reminders : reminders.filter((r) => r.category === filter);
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "date_asc") return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sort === "date_desc") return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sort === "name_asc") return a.name.localeCompare(b.name);
    return 0;
  });

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F5F6FA]"><div className="text-[#8B90A4] text-[15px]">Loading…</div></div>;
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA] pb-24">
      <header className="bg-white border-b border-[#E8EDF4] px-5 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-[12px] text-[#8B90A4] font-medium uppercase tracking-wide">Reminder for Simplicity</p>
            <h1 className="text-[20px] font-bold text-[#1A2340]">Welcome back, {firstName} 👋</h1>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 sm:px-5 py-6 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="card-sm text-center"><p className="text-[24px] font-bold text-[#1A2340]">{upcoming}</p><p className="text-[11px] text-[#8B90A4] font-medium mt-0.5">Upcoming</p></div>
          <div className="card-sm text-center"><p className="text-[24px] font-bold text-[#5B9CF5]">{monthly > 0 ? monthly.toLocaleString("en", { maximumFractionDigits: 0 }) : "—"}</p><p className="text-[11px] text-[#8B90A4] font-medium mt-0.5">Total value</p></div>
          <div className="card-sm text-center"><p className="text-[24px] font-bold text-[#D94F4F]">{notified}</p><p className="text-[11px] text-[#8B90A4] font-medium mt-0.5">Past due</p></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/dashboard/new" className="card-sm flex items-center gap-3 hover:bg-[#EEF4FF] transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#5B9CF5] flex items-center justify-center text-white text-[20px]">+</div>
            <div><p className="text-[14px] font-semibold text-[#1A2340]">New reminder</p><p className="text-[12px] text-[#8B90A4]">Add one now</p></div>
          </Link>
          <div className="card-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E6F7F0] flex items-center justify-center text-[20px]">📅</div>
            <div><p className="text-[14px] font-semibold text-[#1A2340]">What&apos;s next</p><p className="text-[12px] text-[#8B90A4]">{sorted.length > 0 ? sorted[0].name : "Nothing upcoming"}</p></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 overflow-x-auto flex-1 pb-1 hide-scrollbar">
            {CATEGORIES.map((cat) => (
              <button key={cat.value} onClick={() => setFilter(cat.value)} className={`px-4 py-1.5 rounded-full border text-[13px] font-semibold whitespace-nowrap transition-all ${filter === cat.value ? "pill-active" : "pill-inactive"}`}>{cat.label}</button>
            ))}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="text-[13px] border border-[#E8EDF4] rounded-lg px-2 py-1.5 bg-white text-[#1A2340] flex-shrink-0">
            <option value="date_asc">Soonest</option>
            <option value="date_desc">Latest</option>
            <option value="name_asc">A–Z</option>
          </select>
        </div>
        {sorted.length === 0 ? (
          <div className="card text-center py-10"><p className="text-[40px] mb-3">🔔</p><p className="text-[16px] font-semibold text-[#1A2340]">No reminders yet</p><p className="text-[14px] text-[#8B90A4] mt-1">Add your first one with the + button</p></div>
        ) : (
          <div className="space-y-3">
            {sorted.map((r) => {
              const catColor = CATEGORY_COLORS[r.category] || CATEGORY_COLORS.OTHER;
              return (
                <Link key={r.id} href={`/dashboard/${r.id}`} className="card flex items-center gap-4 hover:bg-[#EEF4FF] transition-colors">
                  <ServiceLogo name={r.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-[#1A2340] truncate">{r.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="badge text-[11px]" style={{ background: catColor.bg, color: catColor.text }}>{r.category.charAt(0) + r.category.slice(1).toLowerCase()}</span>
                      {r.amount != null && <span className="text-[12px] text-[#8B90A4]">{r.amount.toLocaleString("en")} {r.currency}</span>}
                    </div>
                  </div>
                  <DaysChip date={r.date} />
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8EDF4] z-20">
        <div className="max-w-2xl mx-auto flex items-center justify-around px-4 py-2 relative">
          <button className="flex flex-col items-center gap-0.5 text-[#5B9CF5]"><span className="text-[22px]">🏠</span><span className="text-[10px] font-medium">Home</span></button>
          <div className="w-16" />
          <button className="flex flex-col items-center gap-0.5 text-[#8B90A4]"><span className="text-[22px]">⚙️</span><span className="text-[10px] font-medium">Settings</span></button>
          <Link href="/dashboard/new" className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-[#5B9CF5] text-white flex items-center justify-center text-[28px] shadow-lg hover:bg-[#4A8CE0] transition-colors">+</Link>
        </div>
      </nav>
    </div>
  );
}
