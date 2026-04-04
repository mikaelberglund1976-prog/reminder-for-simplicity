"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { differenceInDays } from "date-fns";
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
    return <span className="font-semibold text-[#D94F4F] text-[13px]">{Math.abs(days)}d ago</span>;
  if (days === 0)
    return <span className="font-semibold text-[#E5873A] text-[13px]">Today</span>;
  if (days <= 7)
    return <span className="font-semibold text-[#E5873A] text-[13px]">{days}d</span>;
  return <span className="font-semibold text-[#1C1C28] text-[13px]">{days}d</span>;
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

  // Stats
  const nextRenewal = sorted.find((r) => getDaysUntil(r.date) >= 0);
  const monthlyTotal = reminders
    .filter((r) => r.recurrence === "MONTHLY" && r.amount)
    .reduce((sum, r) => sum + (r.amount || 0), 0);
  const yearlyTotal =
    reminders.filter((r) => r.amount).reduce((sum, r) => {
      if (r.recurrence === "MONTHLY") return sum + (r.amount || 0) * 12;
      return sum + (r.amount || 0);
    }, 0);

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F4F0]">
        <div className="text-[#7C7C8A] text-[15px]">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F4F0] pb-24 sm:pb-8">
      {/* Header */}
      <header className="bg-white border-b border-[#E4E3DE] px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔔</span>
            <span className="font-semibold text-[#1C1C28] text-[15px] hidden sm:block">
              Reminder for Simplicity
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/profile"
              className="text-[14px] font-medium text-[#7C7C8A] hover:text-[#1C1C28] transition-colors"
            >
              Profile
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-[14px] font-medium text-[#7C7C8A] hover:text-[#1C1C28] transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-bold text-[#1C1C28] tracking-tight">
              Welcome, {firstName}
            </h1>
            <p className="text-[14px] text-[#7C7C8A] mt-0.5">
              {reminders.length === 0
                ? "No reminders yet"
                : `${reminders.length} active reminder${reminders.length === 1 ? "" : "s"}`}
            </p>
          </div>
          {/* Desktop add button */}
          <Link href="/dashboard/new" className="btn-primary hidden sm:inline-flex">
            + Add reminder
          </Link>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="card-sm">
            <div className="text-[28px] font-bold text-[#1C1C28] leading-none">{reminders.length}</div>
            <div className="text-[12px] text-[#7C7C8A] mt-1.5 font-medium">Active reminders</div>
          </div>

          <div className="card-sm">
            {nextRenewal ? (
              <>
                <div className="text-[15px] font-bold text-[#1C1C28] leading-tight truncate">
                  {nextRenewal.name}
                </div>
                <div className="text-[12px] text-[#7C7C8A] mt-1.5 font-medium">
                  Next renewal ·{" "}
                  <span className={getDaysUntil(nextRenewal.date) <= 7 ? "text-[#E5873A]" : ""}>
                    {getDaysUntil(nextRenewal.date) === 0
                      ? "today"
                      : `${getDaysUntil(nextRenewal.date)}d`}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="text-[18px] font-bold text-[#7C7C8A]">—</div>
                <div className="text-[12px] text-[#7C7C8A] mt-1.5 font-medium">Next renewal</div>
              </>
            )}
          </div>

          <div className="card-sm">
            <div className="text-[20px] font-bold text-[#1C1C28] leading-none">
              {monthlyTotal > 0
                ? `${monthlyTotal.toLocaleString("en")} ${preferredCurrency}`
                : "—"}
            </div>
            <div className="text-[12px] text-[#7C7C8A] mt-1.5 font-medium">Monthly cost</div>
          </div>

          <div className="card-sm">
            <div className="text-[20px] font-bold text-[#1C1C28] leading-none">
              {yearlyTotal > 0
                ? `${Math.round(yearlyTotal).toLocaleString("en")} ${preferredCurrency}`
                : "—"}
            </div>
            <div className="text-[12px] text-[#7C7C8A] mt-1.5 font-medium">
              Yearly total
              {reminders.some((r) => r.currency && r.currency !== preferredCurrency) && (
                <span className="block text-[11px] text-[#7C7C8A] opacity-60 font-normal mt-0.5">
                  not converted
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                filter === cat ? "pill-active" : "pill-inactive"
              }`}
            >
              {cat === "ALL"
                ? "All"
                : `${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]}`}
            </button>
          ))}
        </div>

        {/* Reminder table / empty state */}
        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-[17px] font-semibold text-[#1C1C28] mb-2">
              {filter === "ALL" ? "No reminders yet" : `No ${CATEGORY_LABELS[filter]?.toLowerCase() ?? ""} reminders`}
            </h3>
            <p className="text-[14px] text-[#7C7C8A] mb-6">
              {filter === "ALL" ? "Add the things you don't want to forget." : "Try a different category or add a new one."}
            </p>
            {filter === "ALL" && (
              <Link href="/dashboard/new" className="btn-primary">
                Add your first reminder
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E4E3DE] overflow-hidden">
            {/* Table header — desktop only */}
            <div className="hidden sm:grid grid-cols-[32px_1fr_90px_70px_90px_100px] gap-4 px-5 py-3 border-b border-[#E4E3DE] bg-[#F5F4F0]">
              <div />
              <div className="text-[12px] font-semibold text-[#7C7C8A] uppercase tracking-wide">Name</div>
              <div className="text-[12px] font-semibold text-[#7C7C8A] uppercase tracking-wide">Date</div>
              <div className="text-[12px] font-semibold text-[#7C7C8A] uppercase tracking-wide">Left</div>
              <div className="text-[12px] font-semibold text-[#7C7C8A] uppercase tracking-wide">Recurrence</div>
              <div className="text-[12px] font-semibold text-[#7C7C8A] uppercase tracking-wide text-right">Amount</div>
            </div>

            {/* Rows */}
            {filtered.map((reminder, i) => {
              const days = getDaysUntil(reminder.date);
              return (
                <div
                  key={reminder.id}
                  onClick={() => router.push(`/dashboard/${reminder.id}`)}
                  className={`cursor-pointer hover:bg-[#F5F4F0] transition-colors ${
                    i !== 0 ? "border-t border-[#E4E3DE]" : ""
                  }`}
                >
                  {/* Desktop row */}
                  <div className="hidden sm:grid grid-cols-[32px_1fr_90px_70px_90px_100px] gap-4 items-center px-5 py-4">
                    <span className="text-[20px]">{CATEGORY_ICONS[reminder.category]}</span>
                    <span className="font-medium text-[#1C1C28] text-[14px] truncate">{reminder.name}</span>
                    <span className="text-[#7C7C8A] text-[13px]">{formatDate(reminder.date)}</span>
                    <DaysLeft days={days} />
                    <span className="text-[#7C7C8A] text-[13px]">
                      {RECURRENCE_LABELS[reminder.recurrence]}
                    </span>
                    <span className="text-[14px] font-medium text-[#1C1C28] text-right">
                      {reminder.amount
                        ? `${reminder.amount.toLocaleString("en")} ${reminder.currency}`
                        : <span className="text-[#7C7C8A]">—</span>}
                    </span>
                  </div>

                  {/* Mobile row */}
                  <div className="flex sm:hidden items-center gap-3 px-4 py-3.5">
                    <span className="text-[22px] flex-shrink-0">{CATEGORY_ICONS[reminder.category]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[#1C1C28] text-[14px] truncate">{reminder.name}</div>
                      <div className="text-[12px] text-[#7C7C8A] mt-0.5">
                        {formatDate(reminder.date)} · {RECURRENCE_LABELS[reminder.recurrence]}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <DaysLeft days={days} />
                      {reminder.amount && (
                        <span className="text-[12px] text-[#7C7C8A]">
                          {reminder.amount.toLocaleString("en")} {reminder.currency}
                        </span>
                      )}
                    </div>
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
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#4A5FD5] text-white rounded-full flex items-center justify-center text-2xl shadow-lg hover:bg-[#3A4FC5] transition-colors z-20"
        aria-label="Add reminder"
      >
        +
      </Link>
    </div>
  );
}
