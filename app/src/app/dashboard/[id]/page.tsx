"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
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
  SUBSCRIPTION: "Abonnemang",
  BIRTHDAY: "Födelsedag",
  INSURANCE: "Försäkring",
  CONTRACT: "Avtal",
  HEALTH: "Hälsa",
  OTHER: "Övrigt",
};

const RECURRENCE_LABELS: Record<string, string> = {
  ONCE: "Engång",
  DAILY: "Dagligen",
  WEEKLY: "Varje vecka",
  MONTHLY: "Varje månad",
  YEARLY: "Varje år",
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
      if (!res.ok) throw new Error("Hittades inte");
      const data = await res.json();
      setReminder(data);
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Är du säker på att du vill ta bort denna reminder?")) return;
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  if (!reminder) return null;

  const daysUntil = Math.ceil(
    (new Date(reminder.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
            ← Tillbaka
          </Link>
          <h1 className="text-lg font-bold text-[#1A1A2E]">Reminder</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="card">
          {/* Icon + titel */}
          <div className="flex items-center gap-4 mb-6">
            <div className="text-5xl">{CATEGORY_ICONS[reminder.category]}</div>
            <div>
              <h2 className="text-2xl font-bold text-[#1A1A2E]">{reminder.name}</h2>
              <p className="text-gray-500">{CATEGORY_LABELS[reminder.category]}</p>
            </div>
          </div>

          {/* Info-rader */}
          <div className="space-y-4 divide-y divide-[#E5E7EB]">
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-500 text-sm">Datum</span>
              <span className="font-semibold">
                {format(new Date(reminder.date), "d MMMM yyyy", { locale: sv })}
              </span>
            </div>

            <div className="flex justify-between items-center py-3">
              <span className="text-gray-500 text-sm">Dagar kvar</span>
              <span className={`font-bold text-lg ${
                daysUntil < 0 ? "text-red-500" :
                daysUntil <= 7 ? "text-orange-500" : "text-green-600"
              }`}>
                {daysUntil < 0 ? `${Math.abs(daysUntil)} dagar sedan` :
                 daysUntil === 0 ? "Idag!" : `${daysUntil} dagar`}
              </span>
            </div>

            <div className="flex justify-between items-center py-3">
              <span className="text-gray-500 text-sm">Upprepning</span>
              <span className="font-semibold">{RECURRENCE_LABELS[reminder.recurrence]}</span>
            </div>

            {reminder.amount && (
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-500 text-sm">Belopp</span>
                <span className="font-semibold text-[#4F6EF7]">
                  {reminder.amount.toLocaleString("sv-SE")} {reminder.currency}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center py-3">
              <span className="text-gray-500 text-sm">Påminn</span>
              <span className="font-semibold">{reminder.reminderDaysBefore} dagar innan</span>
            </div>

            {reminder.note && (
              <div className="py-3">
                <span className="text-gray-500 text-sm block mb-1">Anteckning</span>
                <p className="text-[#1A1A2E]">{reminder.note}</p>
              </div>
            )}
          </div>

          {/* Ta bort */}
          <div className="mt-8 pt-4 border-t border-[#E5E7EB]">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full py-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors font-medium text-sm disabled:opacity-50"
            >
              {deleting ? "Tar bort..." : "🗑 Ta bort reminder"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
