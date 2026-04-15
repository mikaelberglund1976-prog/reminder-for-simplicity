"use client";

import { useState, useEffect } from "react";
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

const TEMPLATES = [
  {
    id: "SUBSCRIPTION",
    emoji: "🔄",
    label: "Subscription",
    hint: "Monthly or yearly",
    defaults: { category: "SUBSCRIPTION", recurrence: "MONTHLY", reminderDaysBefore: "3" },
  },
  {
    id: "INSURANCE",
    emoji: "🛡️",
    label: "Insurance",
    hint: "Yearly renewal",
    defaults: { category: "INSURANCE", recurrence: "YEARLY", reminderDaysBefore: "30" },
  },
  {
    id: "FAMILY_ACTIVITY",
    emoji: "🏠",
    label: "Family activity",
    hint: "One-time event",
    defaults: { category: "OTHER", recurrence: "ONCE", reminderDaysBefore: "1" },
  },
  {
    id: "IMPORTANT_RENEWAL",
    emoji: "📋",
    label: "Important renewal",
    hint: "Don't let it lapse",
    defaults: { category: "CONTRACT", recurrence: "YEARLY", reminderDaysBefore: "30" },
  },
];

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

function defaultDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
}
function nextFriday() {
  const d = new Date();
  const day = d.getDay();
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilFriday);
  return d.toISOString().split("T")[0];
}
function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
function today()    { return new Date().toISOString().split("T")[0]; }
function tomorrow() { return addDays(1); }
function in30Days() { return addDays(30); }

type HouseholdMember = { id: string; userId: string; user: { id: string; name: string | null; email: string } };

export default function NewReminderPage() {
  const router = useRouter();
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [showMoreRec, setShowMoreRec]   = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [hasHousehold, setHasHousehold] = useState(false);
  const [hasProHousehold, setHasProHousehold] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [form, setFormState] = useState({
    name: "",
    category: "SUBSCRIPTION",
    date: defaultDate(),
    recurrence: "MONTHLY",
    amount: "",
    currency: "SEK",
    note: "",
    reminderDaysBefore: "1",
    visibility: "PRIVATE",
    assignedTo: "",
  });

  useEffect(() => {
    fetch("/api/household").then(r => r.json()).then(d => {
      if (d.household) {
        setHasHousehold(true);
        setHasProHousehold(!!d.household.is_pro);
        setHouseholdMembers(d.household.members ?? []);
      }
    }).catch(() => {});
    fetch("/api/profile").then(r => r.json()).then(d => {
      if (d.id) setCurrentUserId(d.id);
    }).catch(() => {});
  }, []);

  function set(field: string, value: string) {
    setFormState(prev => ({ ...prev, [field]: value }));
  }

  function applyTemplate(templateId: string) {
    const tpl = TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return;
    setFormState(prev => ({ ...prev, ...tpl.defaults }));
    setSelectedTemplate(templateId);
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
          assignedTo: form.assignedTo || null,
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

  const allRec = showMoreRec ? [...RECURRENCES_MAIN, ...RECURRENCES_MORE] : RECURRENCES_MAIN;

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
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1A2340", margin: 0, letterSpacing: "-0.5px" }}>
            Add item
          </h1>
          <p style={{ fontSize: 14, color: "#4B5563", margin: "6px 0 0", lineHeight: 1.5 }}>
            Add something your household needs to track.
          </p>
        </div>

        {/* ── Templates — P8 ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Start with a template
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            {TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl.id)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "flex-start",
                  padding: "12px 14px", borderRadius: 14, cursor: "pointer",
                  background: selectedTemplate === tpl.id ? "#EEF5FF" : "#fff",
                  border: selectedTemplate === tpl.id ? "2px solid #5B9CF5" : "1.5px solid #E8EDF4",
                  fontFamily: FONT, textAlign: "left" as const,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 20, marginBottom: 6 }}>{tpl.emoji}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1A2340" }}>{tpl.label}</span>
                <span style={{ fontSize: 11, color: "#8B90A4", marginTop: 2 }}>{tpl.hint}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSelectedTemplate("MANUAL")}
            style={{
              width: "100%", padding: "10px",
              background: selectedTemplate === "MANUAL" ? "#F0F6FF" : "none",
              border: selectedTemplate === "MANUAL" ? "1.5px solid #5B9CF5" : "1.5px dashed #D0D7E8",
              borderRadius: 10, fontSize: 13, fontWeight: 600,
              color: selectedTemplate === "MANUAL" ? "#2563EB" : "#8B90A4",
              cursor: "pointer", fontFamily: FONT, boxSizing: "border-box" as const,
            }}
          >
            + Create manually without a template
          </button>
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

          {/* 1. Name */}
          <Section label="Name">
            <input
              type="text"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="e.g. Netflix, Home insurance, School trip"
              required
              autoFocus
              style={inputStyle}
            />
          </Section>

          {/* 2. Due date */}
          <Section label="Due date *">
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
                    transition: "all 0.15s", fontFamily: FONT,
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

          {/* 3. Repeats */}
          <Section label="Repeats">
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
                    transition: "all 0.15s", fontFamily: FONT,
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
                  display: "flex", alignItems: "center", fontFamily: FONT,
                }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: showMoreRec ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          </Section>

          {/* 4. Owner — surfaced early for household positioning */}
          {hasHousehold && householdMembers.length > 1 && (
            <Section label="Owner">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => set("assignedTo", "")}
                  style={pillStyle(form.assignedTo === "")}
                >
                  {form.assignedTo === "" && (
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  Unassigned
                </button>
                {householdMembers.map(m => (
                  <button
                    key={m.userId}
                    type="button"
                    onClick={() => set("assignedTo", m.userId)}
                    style={pillStyle(form.assignedTo === m.userId)}
                  >
                    {form.assignedTo === m.userId && (
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {m.user.name ?? m.user.email.split("@")[0]}
                    {m.userId === currentUserId ? " (me)" : ""}
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* 5. More details — collapsible */}
          <div style={{ marginBottom: 24 }}>
            <button
              type="button"
              onClick={() => setShowMoreDetails(v => !v)}
              style={{
                width: "100%", padding: "13px 16px", borderRadius: 14,
                background: showMoreDetails ? "#F0F6FF" : "#fff",
                border: showMoreDetails ? "1.5px solid #C0D8F8" : "1.5px solid #E8EDF4",
                fontSize: 14, fontWeight: 600,
                color: showMoreDetails ? "#2563EB" : "#8B90A4",
                cursor: "pointer", fontFamily: FONT,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                boxSizing: "border-box" as const,
              }}
            >
              More details
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: showMoreDetails ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showMoreDetails && (
              <div style={{ paddingTop: 16 }}>

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

                {/* Notes */}
                <Section label="">
                  <textarea
                    value={form.note}
                    onChange={e => set("note", e.target.value)}
                    placeholder="Optional notes..."
                    rows={3}
                    style={{ ...inputStyle, resize: "none" as const, lineHeight: 1.5, fontFamily: FONT }}
                  />
                </Section>

                {/* Visibility \u2014 Pro households only */}
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
                      {form.visibility === "PRIVATE" && "Only you will see this item."}
                      {form.visibility === "HOUSEHOLD" && "All household members will see this."}
                      {form.visibility === "PARENTS" && "Only parents and adults in the household will see this."}
                    </p>
                  </Section>
                )}

              </div>
            )}
          </div>

          {/* Save */}
          <div style={{ marginTop: 8 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "17px", borderRadius: 50,
                background: loading ? "#8B90A4" : "#1A2340",
                border: "none", fontSize: 16, fontWeight: 700, color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 2px 10px rgba(26,35,64,0.22)",
                fontFamily: FONT, transition: "all 0.15s",
              }}
            >
              {loading ? "Saving..." : "Save item"}
            </button>
          </div>

        </form>
      </main>
    </div>
  );
}

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
