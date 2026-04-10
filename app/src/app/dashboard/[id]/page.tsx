"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const CATEGORY_LABELS = { SUBSCRIPTION: "Subscription", BIRTHDAY: "Birthday", INSURANCE: "Insurance", CONTRACT: "Contract", HEALTH: "Health", BILL: "Bill", OTHER: "Other" };
const CATEGORY_COLORS = { SUBSCRIPTION: { bg: "#D6E8FF", text: "#3A78D4" }, BIRTHDAY: { bg: "#FFE8F5", text: "#C4367A" }, INSURANCE: { bg: "#D4F4E6", text: "#1E7D52" }, CONTRACT: { bg: "#FFF0E0", text: "#C06010" }, HEALTH: { bg: "#FFE8E8", text: "#C44444" }, BILL: { bg: "#EDE8FF", text: "#6A44CC" }, OTHER: { bg: "#E8EDF4", text: "#5A6080" } };
const RECURRENCE_LABELS = { ONCE: "Once", DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly", YEARLY: "Yearly" };
const BRAND_COLORS = { spotify: { bg: "#1DB954", text: "#fff" }, netflix: { bg: "#E50914", text: "#fff" }, youtube: { bg: "#FF0000", text: "#fff" }, apple: { bg: "#000000", text: "#fff" }, google: { bg: "#4285F4", text: "#fff" }, amazon: { bg: "#FF9900", text: "#fff" }, microsoft: { bg: "#00A4EF", text: "#fff" }, adobe: { bg: "#FF0000", text: "#fff" }, dropbox: { bg: "#0061FF", text: "#fff" }, slack: { bg: "#4A154B", text: "#fff" }, github: { bg: "#24292E", text: "#fff" }, notion: { bg: "#000000", text: "#fff" }, figma: { bg: "#F24E1E", text: "#fff" }, linkedin: { bg: "#0A66C2", text: "#fff" }, default: { bg: "#5B9CF5", text: "#fff" } };

function getBrandColor(name) {
  const lower = name.toLowerCase();
  for (const brand in BRAND_COLORS) { if (lower.includes(brand)) return BRAND_COLORS[brand]; }
  return BRAND_COLORS.default;
}

function ServiceLogo({ name }) {
  const brand = getBrandColor(name);
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return <div style={{ width: 64, height: 64, borderRadius: 18, background: brand.bg, color: brand.text, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 22, flexShrink: 0 }}>{initials}</div>;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function ReminderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const [reminder, setReminder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { if (id) fetchReminder(); }, [id]);

  async function fetchReminder() {
    try {
      const res = await fetch(`/api/reminders/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setReminder(data);
    } catch { router.push("/dashboard"); }
    finally { setLoading(false); }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this reminder?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/reminders/${id}`, { method: "DELETE" });
      router.push("/dashboard");
    } catch { setDeleting(false); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F5F6FA]"><div className="text-[#8B90A4] text-[15px]">Loading…</div></div>;
  if (!reminder) return null;

  const daysUntil = Math.ceil((new Date(reminder.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const daysLabel = daysUntil < 0 ? `${Math.abs(daysUntil)} days ago` : daysUntil === 0 ? "Today" : `${daysUntil} days left`;
  const daysColor = daysUntil < 0 ? "#D94F4F" : daysUntil <= 7 ? "#C06010" : "#2A9D6F";
  const catColor = CATEGORY_COLORS[reminder.category] || CATEGORY_COLORS.OTHER;

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <header className="bg-white border-b border-[#E8EDF4] px-5 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="text-[14px] font-medium text-[#8B90A4] hover:text-[#1A2340] transition-colors">← Back</Link>
          <span className="text-[#E8EDF4]">|</span>
          <h1 className="text-[16px] font-semibold text-[#1A2340]">Reminder</h1>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 sm:px-5 py-6">
        <div className="card">
          <div className="flex items-center gap-4 mb-6">
            <ServiceLogo name={reminder.name} />
            <div className="min-w-0">
              <h2 className="text-[22px] font-bold text-[#1A2340] tracking-tight truncate">{reminder.name}</h2>
              <span className="badge mt-1 text-[12px]" style={{ background: catColor.bg, color: catColor.text }}>{CATEGORY_LABELS[reminder.category]}</span>
            </div>
          </div>
          <div className="divide-y divide-[#E8EDF4]">
            <div className="flex justify-between items-center py-3.5"><span className="flex items-center gap-2 text-[14px] text-[#8B90A4]">📅 Date</span><span className="text-[14px] font-semibold text-[#1A2340]">{formatDate(reminder.date)}</span></div>
            <div className="flex justify-between items-center py-3.5"><span className="flex items-center gap-2 text-[14px] text-[#8B90A4]">⏳ Time</span><span className="text-[15px] font-bold" style={{ color: daysColor }}>{daysLabel}</span></div>
            <div className="flex justify-between items-center py-3.5"><span className="flex items-center gap-2 text-[14px] text-[#8B90A4]">🔁 Recurrence</span><span className="text-[14px] font-semibold text-[#1A2340]">{RECURRENCE_LABELS[reminder.recurrence]}</span></div>
            {reminder.amount != null && <div className="flex justify-between items-center py-3.5"><span className="flex items-center gap-2 text-[14px] text-[#8B90A4]">💰 Amount</span><span className="text-[16px] font-bold text-[#5B9CF5]">{reminder.amount.toLocaleString("en")} {reminder.currency}</span></div>}
            <div className="flex justify-between items-center py-3.5"><span className="flex items-center gap-2 text-[14px] text-[#8B90A4]">🔔 Remind me</span><span className="text-[14px] font-semibold text-[#1A2340]">{reminder.reminderDaysBefore} day{reminder.reminderDaysBefore !== 1 ? "s" : ""} before</span></div>
            {reminder.lastSentAt && <div className="flex justify-between items-center py-3.5"><span className="flex items-center gap-2 text-[14px] text-[#8B90A4]">✉️ Last notified</span><span className="text-[13px] text-[#8B90A4]">{new Date(reminder.lastSentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span></div>}
            {reminder.note && <div className="py-3.5"><span className="flex items-center gap-2 text-[14px] text-[#8B90A4] mb-1.5">📝 Note</span><p className="text-[14px] text-[#1A2340] leading-relaxed pl-6">{reminder.note}</p></div>}
          </div>
          <div className="mt-6 pt-5 border-t border-[#E8EDF4] flex flex-col gap-3">
            <Link href={`/dashboard/${reminder.id}/edit`} className="btn-secondary w-full text-center">Edit reminder</Link>
            <button onClick={handleDelete} disabled={deleting} className="btn-danger w-full">{deleting ? "Deleting…" : "Delete reminder"}</button>
          </div>
        </div>
      </main>
    </div>
  );
}
