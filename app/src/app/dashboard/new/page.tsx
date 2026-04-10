"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CATEGORIES = [
  { value: "SUBSCRIPTION", label: "Subscription", icon: "💳" },
  { value: "BIRTHDAY", label: "Birthday", icon: "🎂" },
  { value: "INSURANCE", label: "Insurance", icon: "🛡️" },
  { value: "CONTRACT", label: "Contract", icon: "📄" },
  { value: "BILL", label: "Bill", icon: "🧾" },
  { value: "HEALTH", label: "Health", icon: "❤️" },
  { value: "OTHER", label: "Other", icon: "📌" },
];

const RECURRENCES = [
  { value: "ONCE", label: "Once" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

const REMINDER_DAYS = ["1", "3", "7", "14", "30"];
const CURRENCIES = ["SEK", "EUR", "USD", "GBP", "NOK", "DKK"];

export default function NewReminderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", category: "SUBSCRIPTION", date: "", recurrence: "YEARLY", amount: "", currency: "SEK", note: "", reminderDaysBefore: "3" });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = { name: form.name, category: form.category, date: new Date(form.date).toISOString(), recurrence: form.recurrence, amount: form.amount ? parseFloat(form.amount) : null, currency: form.currency || "SEK", note: form.note || null, reminderDaysBefore: parseInt(form.reminderDaysBefore) };
      const res = await fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Something went wrong."); }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <header className="bg-white border-b border-[#E8EDF4] px-5 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="text-[14px] font-medium text-[#8B90A4] hover:text-[#1A2340] transition-colors">← Back</Link>
          <span className="text-[#E8EDF4]">|</span>
          <h1 className="text-[16px] font-semibold text-[#1A2340]">New reminder</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-5 py-6 pb-12">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="bg-[#FFF0F0] border border-[#F5CCCC] text-[#D94F4F] rounded-xl px-4 py-3 text-[14px]">{error}</div>}

          <div className="card">
            <label className="label">Name *</label>
            <input type="text" className="input" placeholder="e.g. Spotify, Netflix, Mom's birthday" value={form.name} onChange={(e) => set("name", e.target.value)} required autoFocus />
          </div>

          <div className="card">
            <label className="label">Category *</label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button key={cat.value} type="button" onClick={() => set("category", cat.value)} className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-[13px] font-semibold transition-all ${form.category === cat.value ? "pill-active" : "pill-inactive"}`}>
                  <span className="text-[15px]">{cat.icon}</span><span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <label className="label">Date *</label>
            <input type="date" className="input" value={form.date} onChange={(e) => set("date", e.target.value)} required />
          </div>

          <div className="card">
            <label className="label">Recurrence</label>
            <div className="flex gap-2 flex-wrap">
              {RECURRENCES.map((rec) => (
                <button key={rec.value} type="button" onClick={() => set("recurrence", rec.value)} className={`px-5 py-2 rounded-full border text-[13px] font-semibold transition-all ${form.recurrence === rec.value ? "pill-active" : "pill-inactive"}`}>{rec.label}</button>
              ))}
            </div>
          </div>

          <div className="card">
            <label className="label">Remind me</label>
            <div className="flex gap-2 flex-wrap">
              {REMINDER_DAYS.map((days) => (
                <button key={days} type="button" onClick={() => set("reminderDaysBefore", days)} className={`px-5 py-2 rounded-full border text-[13px] font-semibold transition-all ${form.reminderDaysBefore === days ? "pill-active" : "pill-inactive"}`}>{days}d before</button>
              ))}
            </div>
          </div>

          <div className="card">
            <label className="label">Amount (optional)</label>
            <div className="flex gap-3">
              <input type="number" className="input" placeholder="0.00" value={form.amount} onChange={(e) => set("amount", e.target.value)} min="0" step="0.01" />
              <select className="input flex-shrink-0" style={{ width: 96 }} value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="card">
            <label className="label">Note (optional)</label>
            <textarea className="input resize-none" rows={3} placeholder="Add a comment or extra details…" value={form.note} onChange={(e) => set("note", e.target.value)} />
          </div>

          <div className="flex gap-3">
            <Link href="/dashboard" className="btn-secondary flex-1 text-center">Cancel</Link>
            <button type="submit" className="btn-accent flex-1" disabled={loading}>{loading ? "Saving…" : "Save reminder"}</button>
          </div>
        </form>
      </main>
    </div>
  );
}"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CATEGORIES = [
  { value: "SUBSCRIPTION", label: "Subscription", icon: "💳" },
  { value: "BIRTHDAY", label: "Birthday", icon: "🎂" },
  { value: "INSURANCE", label: "Insurance", icon: "🛡️" },
  { value: "CONTRACT", label: "Contract", icon: "📄" },
  { value: "HEALTH", label: "Health", icon: "❤️" },
  { value: "OTHER", label: "Other", icon: "📌" },
];

const RECURRENCES = [
  { value: "ONCE", label: "Once" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

const REMINDER_DAYS = ["1", "3", "7", "14", "30"];

const CURRENCIES = ["SEK", "EUR", "USD", "GBP", "NOK", "DKK"];

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
        throw new Error(data.error || "Something went wrong.");
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      {/* Header */}
      <header className="bg-white border-b border-[#E4E3DE] px-6 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-[14px] font-medium text-[#7C7C8A] hover:text-[#1C1C28] transition-colors"
          >
            ← Back
          </Link>
          <span className="text-[#E4E3DE]">|</span>
          <h1 className="text-[16px] font-semibold text-[#1C1C28]">New reminder</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-7">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-[14px]">
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="label">Name *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Spotify, Netflix, Mom's birthday"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="label">Category *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => set("category", cat.value)}
                    className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-[14px] font-medium transition-all ${
                      form.category === cat.value
                        ? "bg-[#4A5FD5] text-white border-[#4A5FD5] shadow-sm"
                        : "bg-white text-[#7C7C8A] border-[#E4E3DE] hover:bg-[#F5F4F0] hover:text-[#1C1C28]"
                    }`}
                  >
                    <span className="text-[18px]">{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="label">Date *</label>
              <input
                type="date"
                className="input"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                required
              />
            </div>

            {/* Recurrence */}
            <div>
              <label className="label">Recurrence</label>
              <div className="flex gap-2">
                {RECURRENCES.map((rec) => (
                  <button
                    key={rec.value}
                    type="button"
                    onClick={() => set("recurrence", rec.value)}
                    className={`flex-1 py-2.5 rounded-xl border text-[14px] font-medium transition-all ${
                      form.recurrence === rec.value
                        ? "bg-[#4A5FD5] text-white border-[#4A5FD5] shadow-sm"
                        : "bg-white text-[#7C7C8A] border-[#E4E3DE] hover:bg-[#F5F4F0] hover:text-[#1C1C28]"
                    }`}
                  >
                    {rec.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Remind me */}
            <div>
              <label className="label">Remind me how many days before?</label>
              <div className="flex gap-2">
                {REMINDER_DAYS.map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => set("reminderDaysBefore", days)}
                    className={`flex-1 py-2.5 rounded-xl border text-[14px] font-medium transition-all ${
                      form.reminderDaysBefore === days
                        ? "bg-[#4A5FD5] text-white border-[#4A5FD5] shadow-sm"
                        : "bg-white text-[#7C7C8A] border-[#E4E3DE] hover:bg-[#F5F4F0] hover:text-[#1C1C28]"
                    }`}
                  >
                    {days}d
                  </button>
                ))}
              </div>
            </div>

            {/* Amount + Currency */}
            <div>
              <label className="label">Amount (optional)</label>
              <div className="flex gap-3">
                <input
                  type="number"
                  className="input"
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  min="0"
                  step="0.01"
                />
                <select
                  className="input w-28 flex-shrink-0"
                  value={form.currency}
                  onChange={(e) => set("currency", e.target.value)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="label">Note (optional)</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Add a comment or extra details…"
                value={form.note}
                onChange={(e) => set("note", e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Link href="/dashboard" className="btn-secondary flex-1 text-center">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={loading}
              >
                {loading ? "Saving…" : "Save reminder"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
