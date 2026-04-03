"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CATEGORIES = [
  { value: "SUBSCRIPTION", label: "Abonnemang", icon: "💳" },
  { value: "BIRTHDAY", label: "Födelsedag", icon: "🎂" },
  { value: "INSURANCE", label: "Försäkring", icon: "🛡️" },
  { value: "CONTRACT", label: "Avtal", icon: "📄" },
  { value: "HEALTH", label: "Hälsa", icon: "❤️" },
  { value: "OTHER", label: "Övrigt", icon: "📌" },
];

const RECURRENCES = [
  { value: "ONCE", label: "Engång" },
  { value: "MONTHLY", label: "Varje månad" },
  { value: "YEARLY", label: "Varje år" },
];

export default function NewReminderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "SUBSCRIPTION",
    date: "",
    recurrence: "YEARLY",
    amount: "",
    currency: "SEK",
    note: "",
    reminderDaysBefore: "3",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        name: form.name,
        category: form.category,
        date: new Date(form.date).toISOString(),
        recurrence: form.recurrence,
        amount: form.amount ? parseFloat(form.amount) : null,
        currency: form.currency || "SEK",
        note: form.note || null,
        reminderDaysBefore: parseInt(form.reminderDaysBefore),
      };

      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Något gick fel.");
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
            ← Tillbaka
          </Link>
          <h1 className="text-lg font-bold text-[#1A1A2E]">Ny reminder</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {/* Namn */}
            <div>
              <label className="label">Namn *</label>
              <input
                type="text"
                className="input"
                placeholder="t.ex. Spotify, Mamma, Bilförsäkring"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>

            {/* Kategori */}
            <div>
              <label className="label">Kategori *</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => set("category", cat.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      form.category === cat.value
                        ? "bg-[#4F6EF7] text-white border-[#4F6EF7]"
                        : "bg-white text-gray-700 border-[#E5E7EB] hover:bg-gray-50"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Datum */}
            <div>
              <label className="label">Datum *</label>
              <input
                type="date"
                className="input"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                required
              />
            </div>

            {/* Upprepning */}
            <div>
              <label className="label">Upprepning</label>
              <div className="flex gap-2">
                {RECURRENCES.map((rec) => (
                  <button
                    key={rec.value}
                    type="button"
                    onClick={() => set("recurrence", rec.value)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                      form.recurrence === rec.value
                        ? "bg-[#4F6EF7] text-white border-[#4F6EF7]"
                        : "bg-white text-gray-700 border-[#E5E7EB] hover:bg-gray-50"
                    }`}
                  >
                    {rec.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Belopp (valfritt) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Belopp (valfritt)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="label">Valuta</label>
                <select
                  className="input"
                  value={form.currency}
                  onChange={(e) => set("currency", e.target.value)}
                >
                  <option value="SEK">SEK</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            {/* Påminn X dagar innan */}
            <div>
              <label className="label">Påminn hur många dagar innan?</label>
              <div className="flex gap-2">
                {["1", "3", "7", "14", "30"].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => set("reminderDaysBefore", days)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                      form.reminderDaysBefore === days
                        ? "bg-[#4F6EF7] text-white border-[#4F6EF7]"
                        : "bg-white text-gray-700 border-[#E5E7EB] hover:bg-gray-50"
                    }`}
                  >
                    {days}d
                  </button>
                ))}
              </div>
            </div>

            {/* Anteckning */}
            <div>
              <label className="label">Anteckning (valfritt)</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Lägg till en kommentar..."
                value={form.note}
                onChange={(e) => set("note", e.target.value)}
              />
            </div>

            {/* Knappar */}
            <div className="flex gap-3 pt-2">
              <Link href="/dashboard" className="btn-secondary flex-1 text-center">
                Avbryt
              </Link>
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={loading}
              >
                {loading ? "Sparar..." : "Spara reminder"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
