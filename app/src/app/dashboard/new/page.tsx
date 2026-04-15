"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CATEGORIES = [
  { value: "SUBSCRIPTION", label: "Subscription" },
  { value: "BIRTHDAY",     label: "Birthday" },
  { value: "INSURANCE",    label: "Insurance" },
  { value: "CONTRACT",     label: "Contract" },
  { value: "BILL",         label: "Bill" },
  { value: "HEALTH",       label: "Health" },
  { value: "OTHER",        label: "Other" },
];

const RECURRENCES_MAIN = [
  { value: "ONCE",    label: "Once" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY",  label: "Yearly" },
];

const RECURRENCES_MORE = [
  { value: "DAILY",  label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
];

const REMINDER_DAYS = [
  { value: "0",  label: "At time of event" },
  { value: "1",  label: "1 day before" },
  { value: "3",  label: "3 days before" },
  { value: "7",  label: "7 days before" },
  { value: "14", label: "14 days before" },
  { value: "30", label: "30 days before" },
];

const VISIBILITY_OPTIONS = [
  { value: "PRIVATE",   label: "Just me" },
  { value: "HOUSEHOLD", label: "All" },
  { value: "PARENTS",   label: "Parents" },
];

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

// Default date = 1 month from today
function defaultDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
}

function nextFriday() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 5=Fri
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilFriday);
  return d.toISOString().split("T")[0];
}

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function tomorrow() {
  return addDays(1);
}

function in30Days() {
  return addDays(30);
}

export default function NewReminderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showMoreRec, setShowMoreRec] = useState(false);
  const [hasProHousehold, setHasProHousehold] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "SUBSCRIPTION",
    date: defaultDate(),
    recurrence: "MONTHLY",
    amount: "",
    currency: "SEK",
    note: "",
    reminderDaysBefore: "1",
    visibility: "PRIVATE",
  });

  // Kolla om användaren har ett Pro-hushåll
  useState(() => {
    fetch("/api/household").then(r => r.json()).then(d => {
      if (d.household?.is_pro) setHasProHousehold(true);
    }).catch(() => {});
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          date: new Date(form.date).toISOString(),
          recurrence: form.recurrence,
          amount: form.amount ? parseFloat(form.amount) : null,
          currency: form.currency || "SEK",
          note: form.note || null,
          reminderDaysBefore: parseInt(form.reminderDaysBefore),
          visibility: form.visibility,
        }),
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

  const allRec = showMoreRec
    ? [...RECURRENCES_MAIN, ...RECURRENCES_MORE]
    : RECURRENCES_MAIN;

  const QUICK_DATES = [
    { label: "Today",       value: today() },
    { label: "Tomorrow",    value: tomorrow() },
    { label: "Next Friday", value: nextFriday() },
    { label: "In 30 days",  value: in30Days() },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F5F6FA", fontFamily: FONT, paddingBottom: 40 }}>

      {/* Back arrow */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 20px 0" }}>
        <Link href="/dashboard" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          color: "#8B90A4", fontSize: 14, fontWeight: 500, textDecoration: "none",
        }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </Link>
      </div>

      <main style={{ maxWidth: 480, margin: "0 auto", padding: "20px 20px 0" }}>

        {/* Title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1A2340", margin: 0, letterSpacing: "-0.5px" }}>
            New reminder
          </h1>
          <p style={{ fontSize: 14, color: "#4B5563", margin: "6px 0 0", lineHeight: 1.5 }}>
            Add a reminder for something you<br />do not want to miss.
          </p>
        </div>

        {error && (
          <div style={{
            background: "#FFF0F0", border: "1px solid #F5CCCC", color: "#D94F4F",
            borderRadius: 12, padding: "12px 16px", fontSize: 14, marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* Name */}
          <Section label="Name">
            <input
              type="text"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="e.g. Spotify, Netflix, Mom's"
              required
              autoFocus
              style={inputStyle}
            />
          </Section>

          {/* Category */}
          <Section label="Category">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => set("category", cat.value)}
                  style={pillStyle(form.category === cat.value)}
                >
                  {form.category === cat.value && (
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {cat.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Date */}
          <Section label="Date *">
            {/* Quick date selection */}
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              {QUICK_DATES.map(qd => (
                <button
                  key={qd.label}
                  type="button"
                  onClick={() => set("date", qd.value)}
                  style={{
                    padding: "7px 14px", borderRadius: 50,
                    border: form.date === qd.value ? "none" : "1.5px solid #E8EDF4",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: form.date === qd.value ? "#5B9CF5" : "#fff",
                    color: form.date === qd.value ? "#fff" : "#8B90A4",
                    transition: "all 0.15s",
                    fontFamily: FONT,
                  }}
                >
                  {qd.label}
                </button>
              ))}
            </div>
            <div style={{ position: "relative" }}>
              <input
                type="date"
                value={form.date}
                onChange={e => set("date", e.target.value)}
                required
                style={{ ...inputStyle, color: form.date ? "#1A2340" : "#B0B7C8", paddingRight: 44 }}
              />
              <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#8B90A4", pointerEvents: "none" }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
            </div>
          </Section>

          {/* Recurrence */}
          <Section label="Recurrence">
            <div style={{
              display: "flex", gap: 0, background: "#ECEEF4", borderRadius: 50,
              padding: 3, width: "fit-content", alignItems: "center",
            }}>
              {allRec.map(rec => (
                <button
                  key={rec.value}
                  type="button"
                  onClick={() => set("recurrence", rec.value)}
                  style={{
                    padding: "9px 18px", borderRadius: 50, border: "none",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    background: form.recurrence === rec.value ? "#5B9CF5" : "transparent",
                    color: form.recurrence === rec.value ? "#fff" : "#8B90A4",
                    transition: "all 0.15s",
                    fontFamily: FONT,
                  }}
                >
                  {rec.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowMoreRec(v => !v)}
                style={{
                  padding: "9px 14px", borderRadius: 50, border: "none",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: "transparent", color: "#8B90A4",
                  display: "flex", alignItems: "center",
                  fontFamily: FONT,
                }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: showMoreRec ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          </Section>

          {/* Remind me */}
          <Section label="Remind me">
            <div style={{ position: "relative" }}>
              <select
                value={form.reminderDaysBefore}
                onChange={e => set("reminderDaysBefore", e.target.value)}
                style={{ ...inputStyle, appearance: "none", WebkitAppearance: "none", paddingRight: 36, cursor: "pointer" }}
              >
                {REMINDER_DAYS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
              <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#8B90A4" }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </div>
          </Section>

          {/* Amount */}
          <Section label="Amount">
            <div style={{ display: "flex", gap: 10 }}>
              <input
                type="number"
                value={form.amount}
                onChange={e => set("amount", e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                style={{ ...inputStyle, width: 110, flexShrink: 0 }}
              />
              <input
                type="text"
                value={form.currency}
                readOnly
                style={{ ...inputStyle, flex: 1, color: "#8B90A4", cursor: "default" }}
              />
            </div>
          </Section>

          {/* Visibility — only if Pro household */}
          {hasProHousehold && (
            <Section label="Visible to">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {VISIBILITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("visibility", opt.value)}
                    style={pillStyle(form.visibility === opt.value)}
                  >
                    {form.visibility === opt.value && (
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {opt.label}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 12, color: "#9CA3AF", margin: "8px 0 0" }}>
                {form.visibility === "PRIVATE" && "Only you will see this reminder."}
                {form.visibility === "HOUSEHOLD" && "All household members will see this."}
                {form.visibility === "PARENTS" && "Only parents and adults in the household will see this."}
              </p>
            </Section>
          )}

          {/* Notes */}
          <Section label="">
            <textarea
              value={form.note}
              onChange={e => set("note", e.target.value)}
              placeholder="Optional notes..."
              rows={3}
              style={{
                ...inputStyle,
                resize: "none" as const,
                lineHeight: 1.5,
                fontFamily: FONT,
              }}
            />
          </Section>

          {/* Save button */}
          <div style={{ marginTop: 8 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "17px", borderRadius: 50,
                background: loading ? "#8B90A4" : "#1A2340",
                border: "none",
                fontSize: 16, fontWeight: 700,
                color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 2px 10px rgba(26,35,64,0.22)",
                fontFamily: FONT,
                transition: "all 0.15s",
              }}
            >
              {loading ? "Saving..." : "Save reminder"}
            </button>
          </div>

        </form>
      </main>
    </div>
  );
}

// -- Helpers --
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      {label && (
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 10 }}>
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#fff",
  border: "1.5px solid #E8EDF4",
  borderRadius: 14,
  padding: "13px 16px",
  fontSize: 15,
  color: "#1A2340",
  outline: "none",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
  boxSizing: "border-box",
  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
};

function pillStyle(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center",
    padding: "9px 16px", borderRadius: 50,
    border: active ? "none" : "1.5px solid #E8EDF4",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    background: active ? "#5B9CF5" : "#fff",
    color: active ? "#fff" : "#8B90A4",
    transition: "all 0.15s",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
  };
}
