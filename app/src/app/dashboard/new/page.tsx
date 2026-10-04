"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";

// Labels come from messages.reminders / messages.reminderForm (2026-10-04).
const CATEGORIES = ["SUBSCRIPTION", "BIRTHDAY", "INSURANCE", "CONTRACT", "BILL", "HEALTH", "OTHER"].map((value) => ({ value }));
const RECURRENCES_MAIN = ["ONCE", "MONTHLY", "YEARLY"].map((value) => ({ value }));
const RECURRENCES_MORE = ["DAILY", "WEEKLY"].map((value) => ({ value }));
const REMINDER_DAYS = ["0", "1", "3", "7", "14", "30"].map((value) => ({ value }));
const VISIBILITY_OPTIONS = ["PRIVATE", "HOUSEHOLD", "PARENTS"].map((value) => ({ value }));

const TEMPLATES = [
  {
    id: "SUBSCRIPTION",
    emoji: "🔄",
    defaults: { category: "SUBSCRIPTION", recurrence: "MONTHLY", reminderDaysBefore: "3" },
  },
  {
    id: "INSURANCE",
    emoji: "🛡️",
    defaults: { category: "INSURANCE", recurrence: "YEARLY", reminderDaysBefore: "30" },
  },
  {
    id: "FAMILY_ACTIVITY",
    emoji: "🏠",
    defaults: { category: "OTHER", recurrence: "ONCE", reminderDaysBefore: "1" },
  },
  {
    id: "IMPORTANT_RENEWAL",
    emoji: "📋",
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

// 2026-07-28: next build's static prerender step requires any component that
// calls useSearchParams() to sit inside a <Suspense> boundary — tsc doesn't
// catch this (it's a build/prerender-time check, not a type error), which is
// how this shipped broken once already. Keep the searchParams-reading logic
// in an inner component so the outer default export can wrap it in Suspense.
export default function NewReminderPage() {
  return (
    <Suspense fallback={null}>
      <NewReminderForm />
    </Suspense>
  );
}

function NewReminderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { m: msg, err: tErr } = useI18n();
  const t = msg.reminderForm;
  // 2026-07-28: the Calendar's "+" button passes a chosen date through here
  // (type first, then date, then details — see dashboard/calendar/page.tsx)
  // so the date step isn't repeated on this screen.
  const dateFromQuery = searchParams.get("date");
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
    date: dateFromQuery ?? defaultDate(),
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
    const tpl = TEMPLATES.find(x => x.id === templateId);
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
        throw new Error(data.error ? tErr(data.error) : t.somethingWrong);
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.somethingWrong);
    } finally {
      setLoading(false);
    }
  }

  const allRec = showMoreRec ? [...RECURRENCES_MAIN, ...RECURRENCES_MORE] : RECURRENCES_MAIN;

  const QUICK_DATES = [
    { label: t.today,       value: today() },
    { label: t.tomorrow,    value: tomorrow() },
    { label: t.nextFriday, value: nextFriday() },
    { label: t.in30Days,  value: in30Days() },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT, paddingBottom: 40 }}>

      {/* Back arrow */}
      <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "20px 20px 0" }}>
        <Link href="/dashboard" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          color: "var(--muted)", fontSize: 14, fontWeight: 500, textDecoration: "none",
        }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {t.back}
        </Link>
      </div>

      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "20px 20px 0" }}>

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--fg)", margin: 0, letterSpacing: "-0.5px" }}>
            {t.addTitle}
          </h1>
          <p style={{ fontSize: 14, color: "var(--fg-2)", margin: "6px 0 0", lineHeight: 1.5 }}>
            {t.addIntro}
          </p>
        </div>

        {/* ── Templates — P8 ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            {t.startWithTemplate}
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
                  background: selectedTemplate === tpl.id ? "var(--tint-accent)" : "var(--surface)",
                  border: selectedTemplate === tpl.id ? "2px solid var(--accent)" : "1.5px solid var(--border)",
                  fontFamily: FONT, textAlign: "left" as const,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 20, marginBottom: 6 }}>{tpl.emoji}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>{t.templates[tpl.id]?.label}</span>
                <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{t.templates[tpl.id]?.hint}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSelectedTemplate("MANUAL")}
            style={{
              width: "100%", padding: "10px",
              background: selectedTemplate === "MANUAL" ? "var(--tint-accent)" : "none",
              border: selectedTemplate === "MANUAL" ? "1.5px solid var(--accent)" : "1.5px dashed var(--border)",
              borderRadius: 10, fontSize: 13, fontWeight: 600,
              color: selectedTemplate === "MANUAL" ? "var(--accent)" : "var(--muted)",
              cursor: "pointer", fontFamily: FONT, boxSizing: "border-box" as const,
            }}
          >
            {t.manual}
          </button>
        </div>

        {error && (
          <div style={{
            background: "var(--tint-danger)", border: "1px solid var(--border-danger)", color: "var(--danger)",
            borderRadius: 12, padding: "12px 16px", fontSize: 14, marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* 1. Name */}
          <Section label={t.name}>
            <input
              type="text"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder={t.namePlaceholder}
              required
              autoFocus
              style={inputStyle}
            />
          </Section>

          {/* 2. Due date */}
          <Section label={t.dueDate}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              {QUICK_DATES.map(qd => (
                <button
                  key={qd.label}
                  type="button"
                  onClick={() => set("date", qd.value)}
                  style={{
                    padding: "7px 14px", borderRadius: 50,
                    border: form.date === qd.value ? "none" : "1.5px solid var(--border)",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: form.date === qd.value ? "var(--accent-bg)" : "var(--surface)",
                    color: form.date === qd.value ? "#fff" : "var(--muted)",
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
                style={{ ...inputStyle, color: form.date ? "var(--fg)" : "var(--subtle)", paddingRight: 44 }}
              />
              <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
            </div>
          </Section>

          {/* 3. Repeats */}
          <Section label={t.repeats}>
            <div style={{
              display: "flex", gap: 0, background: "var(--surface-3)", borderRadius: 50,
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
                    background: form.recurrence === rec.value ? "var(--accent-bg)" : "transparent",
                    color: form.recurrence === rec.value ? "#fff" : "var(--muted)",
                    transition: "all 0.15s", fontFamily: FONT,
                  }}
                >
                  {msg.reminders.recurrence[rec.value]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowMoreRec(v => !v)}
                style={{
                  padding: "9px 14px", borderRadius: 50, border: "none",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: "transparent", color: "var(--muted)",
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
            <Section label={t.owner}>
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
                  {t.unassigned}
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
                    {m.userId === currentUserId ? t.meSuffix : ""}
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
                background: showMoreDetails ? "var(--tint-accent)" : "var(--surface)",
                border: showMoreDetails ? "1.5px solid var(--border)" : "1.5px solid var(--border)",
                fontSize: 14, fontWeight: 600,
                color: showMoreDetails ? "var(--accent)" : "var(--muted)",
                cursor: "pointer", fontFamily: FONT,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                boxSizing: "border-box" as const,
              }}
            >
              {t.moreDetails}
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: showMoreDetails ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showMoreDetails && (
              <div style={{ paddingTop: 16 }}>

                {/* Amount */}
                <Section label={t.amount}>
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
                      style={{ ...inputStyle, flex: 1, color: "var(--muted)", cursor: "default" }}
                    />
                  </div>
                </Section>

                {/* Category */}
                <Section label={t.category}>
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
                        {msg.reminders.categories[cat.value]}
                      </button>
                    ))}
                  </div>
                </Section>

                {/* Remind me */}
                <Section label={t.remindMe}>
                  <div style={{ position: "relative" }}>
                    <select
                      value={form.reminderDaysBefore}
                      onChange={e => set("reminderDaysBefore", e.target.value)}
                      style={{ ...inputStyle, appearance: "none", WebkitAppearance: "none", paddingRight: 36, cursor: "pointer" }}
                    >
                      {REMINDER_DAYS.map(d => (
                        <option key={d.value} value={d.value}>{t.remindDays[d.value]}</option>
                      ))}
                    </select>
                    <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--muted)" }}>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </div>
                  </div>
                </Section>

                {/* Notes */}
                <Section label="">
                  <textarea
                    value={form.note}
                    onChange={e => set("note", e.target.value)}
                    placeholder={t.notesPlaceholder}
                    rows={3}
                    style={{ ...inputStyle, resize: "none" as const, lineHeight: 1.5, fontFamily: FONT }}
                  />
                </Section>

                {/* Visibility \u2014 Pro households only */}
                {hasProHousehold && (
                  <Section label={t.visibleTo}>
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
                          {t.visibilityOptions[opt.value]}
                        </button>
                      ))}
                    </div>
                    <p style={{ fontSize: 12, color: "var(--subtle)", margin: "8px 0 0" }}>
                      {form.visibility === "PRIVATE" && t.visPrivate}
                      {form.visibility === "HOUSEHOLD" && t.visHousehold}
                      {form.visibility === "PARENTS" && t.visParents}
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
                background: loading ? "#7C7C8A" : "var(--ink)",
                border: "none", fontSize: 16, fontWeight: 700, color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 2px 10px rgba(26,35,64,0.22)",
                fontFamily: FONT, transition: "all 0.15s",
              }}
            >
              {loading ? t.saving : t.saveItem}
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
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)", marginBottom: 10 }}>
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--surface)",
  border: "1.5px solid var(--border)",
  borderRadius: 14,
  padding: "13px 16px",
  fontSize: 15,
  color: "var(--fg)",
  outline: "none",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
  boxSizing: "border-box",
  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
};

function pillStyle(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center",
    padding: "9px 16px", borderRadius: 50,
    border: active ? "none" : "1.5px solid var(--border)",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    background: active ? "var(--accent-bg)" : "var(--surface)",
    color: active ? "#fff" : "var(--muted)",
    transition: "all 0.15s",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
  };
}
