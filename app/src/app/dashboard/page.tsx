"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format, differenceInDays, isPast } from "date-fns";
import { sv } from "date-fns/locale";

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
  SUBSCRIPTION: "Abonnemang",
  BIRTHDAY: "Födelsedag",
  INSURANCE: "Försäkring",
  CONTRACT: "Avtal",
  HEALTH: "Hälsa",
  OTHER: "Övrigt",
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchReminders();
    }
  }, [status]);

  async function fetchReminders() {
    try {
      const res = await fetch("/api/reminders");
      const data = await res.json();
      setReminders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered =
    filter === "ALL"
      ? reminders
      : reminders.filter((r) => r.category === filter);

  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    return differenceInDays(date, new Date());
  };

  const getUrgencyColor = (daysUntil: number) => {
    if (daysUntil < 0) return "text-red-500";
    if (daysUntil <= 3) return "text-orange-500";
    if (daysUntil <= 7) return "text-yellow-600";
    return "text-green-600";
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-[#1A1A2E]">🔔 Reminder for Simplicity</h1>
            <p className="text-sm text-gray-500">Hej {session?.user?.name?.split(" ")[0]}!</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Logga ut
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card text-center">
            <div className="text-3xl font-bold text-[#4F6EF7]">{reminders.length}</div>
            <div className="text-sm text-gray-500 mt-1">Totalt</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-orange-500">
              {reminders.filter((r) => getDaysUntil(r.date) <= 7 && getDaysUntil(r.date) >= 0).length}
            </div>
            <div className="text-sm text-gray-500 mt-1">Inom 7 dagar</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-[#4ECDC4]">
              {reminders.filter((r) => r.amount).reduce((sum, r) => sum + (r.amount || 0), 0).toLocaleString("sv-SE")} kr
            </div>
            <div className="text-sm text-gray-500 mt-1">Totalt/år</div>
          </div>
        </div>

        {/* Filter + Ny reminder */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2 flex-wrap">
            {["ALL", "SUBSCRIPTION", "BIRTHDAY", "INSURANCE", "CONTRACT", "OTHER"].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === cat
                    ? "bg-[#4F6EF7] text-white"
                    : "bg-white border text-gray-600 hover:bg-gray-50"
                }`}
              >
                {cat === "ALL" ? "Alla" : `${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]}`}
              </button>
            ))}
          </div>
          <button
            onClick={() => router.push("/dashboard/new")}
            className="btn-primary text-sm py-2 px-4"
          >
            + Ny reminder
          </button>
        </div>

        {/* Reminder-lista */}
        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-lg font-semibold text-[#1A1A2E] mb-2">Inga reminders än</h3>
            <p className="text-gray-500 mb-6">Lägg till det du inte vill glömma!</p>
            <button
              onClick={() => router.push("/dashboard/new")}
              className="btn-primary"
            >
              Skapa din första reminder
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((reminder) => {
              const daysUntil = getDaysUntil(reminder.date);
              return (
                <div
                  key={reminder.id}
                  className="card hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between"
                  onClick={() => router.push(`/dashboard/${reminder.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{CATEGORY_ICONS[reminder.category]}</span>
                    <div>
                      <h3 className="font-semibold text-[#1A1A2E]">{reminder.name}</h3>
                      <p className="text-sm text-gray-500">
                        {format(new Date(reminder.date), "d MMMM yyyy", { locale: sv })}
                        {reminder.amount && (
                          <span className="ml-2 text-[#4F6EF7] font-medium">
                            • {reminder.amount} {reminder.currency}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className={`text-sm font-semibold ${getUrgencyColor(daysUntil)}`}>
                    {daysUntil < 0
                      ? `${Math.abs(daysUntil)}d sedan`
                      : daysUntil === 0
                      ? "Idag!"
                      : `${daysUntil}d kvar`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
