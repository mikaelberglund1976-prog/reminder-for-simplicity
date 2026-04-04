"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const CATEGORY_ICONS: Record<string, string> = {
  SUBSCRIPTION: "💳",
  BIRTHDAY: "🎂",
  INSURANCE: "🛡️",
  CONTRACT: "📄",
  HEALTH: "❤️",
  OTHER: "📌",
};

const CATEGORY_LABELS: Record<string, string> = {
  SUBSCRIPTION: "Subscription",
  BIRTHDAY: "Birthday",
  INSURANCE: "Insurance",
  CONTRACT: "Contract",
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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ReminderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) fetchReminder();
  }, [id]);

  async function fetchReminder() {
    try {
      const res = await fetch(`/api/reminders/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setReminder(data);
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this reminder?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/reminders/${id}`, { method: "DELETE" });
      router.push("/dashboard");
    } catch {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F4F0]">
        <div className="text-[#7C7C8A] text-[15px]">Loading…</div>
      </div>
    );
  }

  if (!reminder) return null;

  const daysUntil = Math.ceil(
    (new Date(reminder.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const daysColor =
    daysUntil < 0
      ? "text-[#D94F4F]"
      : daysUntil <= 7
      ? "text-[#E5873A]"
      : "text-[#2A9D6F]";

  const daysLabel =
    daysUntil < 0
      ? `${Math.abs(daysUntil)} days ago`
      : daysUntil === 0
      ? "Today"
      : `${daysUntil} days left`;

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      <header className="bg-white border-b border-[#E4E3DE] px-6 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-[14px] font-medium text-[#7C7C8A] hover:text-[#1C1C28] transition-colors"
          >
            ← Back
          </Link>
          <span className="text-[#E4E3DE]">|</span>
          <h1 className="text-[16px] font-semibold text-[#1C1C28]">Reminder</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="card">
          {/* Icon + title */}
          <div className="flex items-center gap-4 mb-8">
            <div className="text-5xl">{CATEGORY_ICONS[reminder.category]}</div>
            <div>
              <h2 className="text-[22px] font-bold text-[#1C1C28] tracking-tight">{reminder.name}</h2>
              <p className="text-[14px] text-[#7C7C8A]">{CATEGORY_LABELS[reminder.category]}</p>
            </div>
          </div>

          {/* Info rows */}
          <div className="divide-y divide-[#E4E3DE]">
            <div className="flex justify-between items-center py-3.5">
              <span className="text-[14px] text-[#7C7C8A]">Date</span>
              <span className="text-[14px] font-medium text-[#1C1C28]">{formatDate(reminder.date)}</span>
            </div>

            <div className="flex justify-between items-center py-3.5">
              <span className="text-[14px] text-[#7C7C8A]">Days left</span>
              <span className={`text-[16px] font-bold ${daysColor}`}>{daysLabel}</span>
            </div>

            <div className="flex justify-between items-center py-3.5">
              <span className="text-[14px] text-[#7C7C8A]">Recurrence</span>
              <span className="text-[14px] font-medium text-[#1C1C28]">
                {RECURRENCE_LABELS[reminder.recurrence]}
              </span>
            </div>

            {reminder.amount != null && (
              <div className="flex justify-between items-center py-3.5">
                <span className="text-[14px] text-[#7C7C8A]">Amount</span>
                <span className="text-[16px] font-bold text-[#4A5FD5]">
                  {reminder.amount.toLocaleString("en")} {reminder.currency}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center py-3.5">
              <span className="text-[14px] text-[#7C7C8A]">Remind me</span>
              <span className="text-[14px] font-medium text-[#1C1C28]">
                {reminder.reminderDaysBefore} day{reminder.reminderDaysBefore !== 1 ? "s" : ""} before
              </span>
            </div>

            {reminder.note && (
              <div className="py-3.5">
                <span className="text-[14px] text-[#7C7C8A] block mb-1.5">Note</span>
                <p className="text-[14px] text-[#1C1C28] leading-relaxed">{reminder.note}</p>
              </div>
            )}
          </div>

          {/* Delete */}
          <div className="mt-8 pt-5 border-t border-[#E4E3DE]">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-danger w-full"
            >
              {deleting ? "Deleting…" : "Delete reminder"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
