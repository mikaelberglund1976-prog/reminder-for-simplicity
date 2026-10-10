"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

// Labels come from messages.reminders / messages.reminderForm (2026-10-04).
const CATEGORIES = ["SUBSCRIPTION", "BIRTHDAY", "INSURANCE", "CONTRACT", "BILL", "HEALTH", "OTHER"].map((value) => ({ value }));
const RECURRENCES_MAIN = ["ONCE", "MONTHLY", "YEARLY"].map((value) => ({ value }));
const RECURRENCES_MORE = ["DAILY", "WEEKLY"].map((value) => ({ value }));
const REMINDER_DAYS = ["1", "3", "7", "14", "30"].map((value) => ({ value }));

const CURRENCIES = ["SEK", "EUR", "USD", "GBP", "NOK", "DKK"];

const VISIBILITY_OPTIONS = ["PRIVATE", "HOUSEHOLD", "PARENTS"].map((value) => ({ value }));

type FormState = {
  name: string; category: string; date: string; recurrence: string;
  amount: string; currency: string; note: string; reminderDaysBefore: string;
  visibility: string; startTime: string;
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      {label && <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)", marginBottom: 10 }}>{label}</div>}
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 14,
  padding: "13px 16px", fontSize: 15, color: "var(--fg)", outline: "none",
  fontFamily: FONT, boxSizing: "border-box", boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
};

function pillStyle(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", padding: "9px 16px", borderRadius: 50,
    border: active ? "none" : "1.5px solid var(--border)", fontSize: 13, fontWeight: 600,
    cursor: "pointer", background: active ? "var(--accent-bg)" : "var(--surface)",
    color: active ? "var(--on-accent)" : "var(--muted)", transition: "all 0.15s", fontFamily: FONT,
  };
}

export default function EditReminderPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { m: msg, err: tErr } = useI18n();
  const t = msg.reminderForm;

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [showMoreRec, setShowMoreRec] = useState(false);
  const [hasProHousehold, setHasProHousehold] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: "", category: "SUBSCRIPTION", date: "", recurrence: "MONTHLY",
    amount: "", currency: "SEK", note: "", reminderDaysBefore: "1", visibility: "PRIVATE", startTime: "",
  });

  useEffect(() => { if (id) fetchReminder(); }, [id]);

  useEffect(() => {
    fetch("/api/household").then(r => r.json()).then(d => {
      if (d.household?.is_pro) setHasProHousehold(true);
    }).catch(() => {});
  }, []);

  async function fetchReminder() {
    try {
      const res = await fetch("/api/reminders/" + id);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      const rec = data.recurrence;
      if (rec === "DAILY" || rec === "WEEKLY") setShowMoreRec(true);
      setForm({
        name: data.name,
        category: data.category,
        date: data.date ? data.date.slice(0, 10) : "",
        recurrence: data.recurrence,
        amount: data.amount != null ? String(data.amount) : "",
        currency: data.currency || "SEK",
        note: data.note || "",
        reminderDaysBefore: String(data.reminderDaysBefore ?? 1),
        visibility: data.visibility || "PRIVATE",
        startTime: data.startTime || "",
      });
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  function set(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/reminders/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, category: form.category,
          date: new Date(form.date).toISOString(),
          recurrence: form.recurrence,
          amount: form.amount ? parseFloat(form.amount) : null,
          currency: form.currency || "SEK",
          note: form.note || null,
          reminderDaysBefore: parseInt(form.reminderDaysBefore),
          visibility: form.visibility,
          startTime: form.startTime || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ? tErr(data.error) : t.somethingWrong);
      }
      router.push("/dashboard/" + id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.somethingWrong);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <span style={{ color: "var(--muted)", fontSize: 15 }}>{msg.home.thinking}</span>
      </div>
    );
  }

  const allRec = showMoreRec ? [...RECURRENCES_MAIN, ...RECURRENCES_MORE] : RECURRENCES_MAIN;
  const dropdownStyle = {
    ...inputStyle, appearance: "none" as const, WebkitAppearance: "none" as const,
    paddingRight: 36, cursor: "pointer",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT, paddingBottom: 40 }}>

      {/* Back */}
      <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "20px 20px 0" }}>
        <Link href={"/dashboard/" + id} style={{
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
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--fg)", margin: 0, letterSpacing: "-0.5px" }}>
            {t.editTitle}
          </h1>
          <p style={{ fontSize: 14, color: "var(--muted)", margin: "6px 0 0", lineHeight: 1.5 }}>
            {t.editIntro}
          </p>
        </div>

        {error && (
          <div style={{ background: "var(--tint-danger)", border: "1px solid var(--border-danger)", color: "var(--danger)", borderRadius: 12, padding: "12px 16px", fontSize: 14, marginBottom: 20 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* Name */}
          <Section label={t.name}>
            <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
              placeholder={t.editNamePlaceholder} required style={inputStyle} />
          </Section>

          {/* Category */}
          <Section label={t.category}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CATEGORIES.map(cat => (
                <button key={cat.value} type="button" onClick={() => set("category", cat.value)} style={pillStyle(form.category === cat.value)}>
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

          {/* Date */}
          <Section label={t.date}>
            <div style={{ position: "relative" }}>
              <input type="date" value={form.date} onChange={e => set("date", e.target.value)}
                required style={{ ...inputStyle, paddingRight: 44 }} />
              <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
            </div>
            {/* 2026-10-07: optional time of day */}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>
                {t.time} <span style={{ fontWeight: 400, color: "var(--subtle)" }}>{t.timeOptional}</span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="time" value={form.startTime} step={300} onChange={e => set("startTime", e.target.value)}
                  aria-label={t.time} style={{ ...inputStyle, flex: 1 }} />
                {form.startTime && (
                  <button type="button" onClick={() => set("startTime", "")}
                    style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 4, whiteSpace: "nowrap" }}>
                    {t.clearTime}
                  </button>
                )}
              </div>
            </div>
          </Section>

          {/* Recurrence */}
          <Section label={t.recurrence}>
            <div style={{ display: "flex", gap: 0, background: "var(--surface-3)", borderRadius: 50, padding: 3, width: "fit-content", alignItems: "center" }}>
              {allRec.map(rec => (
                <button key={rec.value} type="button" onClick={() => set("recurrence", rec.value)} style={{
                  padding: "9px 18px", borderRadius: 50, border: "none", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: FONT,
                  background: form.recurrence === rec.value ? "var(--accent-bg)" : "transparent",
                  color: form.recurrence === rec.value ? "var(--on-accent)" : "var(--muted)",
                  transition: "all 0.15s",
                }}>
                  {msg.reminders.recurrence[rec.value]}
                </button>
              ))}
              <button type="button" onClick={() => setShowMoreRec(v => !v)} style={{
                padding: "9px 14px", borderRadius: 50, border: "none", fontSize: 13, fontWeight: 600,
                cursor: "pointer", background: "transparent", color: "var(--muted)",
                display: "flex", alignItems: "center", fontFamily: FONT,
              }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: showMoreRec ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          </Section>

          {/* Remind me + currency */}
          <Section label={t.remindMe}>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <select value={form.reminderDaysBefore} onChange={e => set("reminderDaysBefore", e.target.value)} style={dropdownStyle}>
                  {REMINDER_DAYS.map(d => <option key={d.value} value={d.value}>{t.remindDays[d.value]}</option>)}
                </select>
                <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--muted)" }}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </div>
              </div>
              <div style={{ position: "relative", width: 90 }}>
                <select value={form.currency} onChange={e => set("currency", e.target.value)} style={dropdownStyle}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--muted)" }}>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </div>
              </div>
            </div>
          </Section>

          {/* Amount */}
          <Section label={t.amount}>
            <div style={{ display: "flex", gap: 10 }}>
              <input type="number" value={form.amount} onChange={e => set("amount", e.target.value)}
                placeholder="0" min="0" step="0.01" style={{ ...inputStyle, width: 110, flexShrink: 0 }} />
              <input type="text" value={form.currency} readOnly style={{ ...inputStyle, flex: 1, color: "var(--muted)", cursor: "default" }} />
            </div>
          </Section>

          {/* Visibility — only if Pro household */}
          {hasProHousehold && (
            <Section label={t.visibleTo}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {VISIBILITY_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => set("visibility", opt.value)} style={pillStyle(form.visibility === opt.value)}>
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
                {form.visibility === "PRIVATE" && t.visPrivateReminder}
                {form.visibility === "HOUSEHOLD" && t.visHousehold}
                {form.visibility === "PARENTS" && t.visParents}
              </p>
            </Section>
          )}

          {/* Notes */}
          <Section label="">
            <textarea value={form.note} onChange={e => set("note", e.target.value)}
              placeholder={t.notesPlaceholder} rows={3}
              style={{ ...inputStyle, resize: "none" as const, lineHeight: 1.5, fontFamily: FONT }} />
          </Section>

          {/* Save button */}
          <div style={{ marginTop: 8 }}>
            <button type="submit" disabled={saving} style={{
              width: "100%", padding: "17px", borderRadius: 50,
              background: "var(--surface)", border: "1.5px solid var(--border)",
              fontSize: 16, fontWeight: 600, color: saving ? "var(--subtle)" : "var(--accent)",
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)", fontFamily: FONT,
            }}>
              {saving ? msg.common.saving : t.saveChanges}
            </button>
          </div>

        </form>
      </main>
    </div>
  );
}
