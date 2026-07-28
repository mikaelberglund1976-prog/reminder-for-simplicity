"use client";

// Calendar tab — 4th bottom-nav tab alongside Reminders/Shopping list/Wishlist
// (added 2026-07-28 per direct instruction, on top of the earlier "keep the
// bottom nav to 3 tabs" discipline noted in COMPETITOR_ANALYSIS_BEST4FAMILY.md
// — a deliberate exception, not a reversal of that principle).
//
// Deliberately a *view*, not a new data model: every dot on this grid comes
// from data that already existed (Reminder.date/recurrence for reminders,
// the same fields plus choreRecurrenceDays for chores, which are just
// Reminder rows with category=CHORE — see /api/family/chores). No schema
// change, no new write path. Occurrence expansion (turning one stored date +
// a recurrence rule into every matching day in the visible month) lives in
// `@/lib/recurrence` so it's testable on its own.
//
// Explicitly out of scope for this pass (see ROADMAP.md Fas 3): syncing to
// Google/Apple Calendar. That's a separate, later step — this is the in-app
// view it builds on top of.

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import HamburgerMenu from "@/components/HamburgerMenu";
import { getOccurrencesInRange, dateKey, type RecurringItem } from "@/lib/recurrence";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function IcBack()  { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6"/></svg>; }
function IcLeft()  { return <svg width={18} height={18} viewBox="0 0 24 24" {...STR} strokeWidth={2.5}><polyline points="15 18 9 12 15 6"/></svg>; }
function IcRight() { return <svg width={18} height={18} viewBox="0 0 24 24" {...STR} strokeWidth={2.5}><polyline points="9 18 15 12 9 6"/></svg>; }
function IcChevRight() { return <svg width={15} height={15} viewBox="0 0 24 24" {...STR} strokeWidth={2.5}><polyline points="9 18 15 12 9 6"/></svg>; }

// Note: SCHOOL is deliberately absent here — School is its own category
// section (see /dashboard/school), never created through the general
// Reminders flow, so it never appears with a "reminder" kind below.
const CATEGORY_LABELS: Record<string, string> = {
  SUBSCRIPTION: "Subscription", BIRTHDAY: "Birthday", INSURANCE: "Insurance",
  CONTRACT: "Contract", HEALTH: "Health", BILL: "Bill", OTHER: "Other",
};

const CATEGORY_COLOR: Record<string, string> = {
  SUBSCRIPTION: "#3A4FC5", BIRTHDAY: "#C4367A", INSURANCE: "#1E7D52",
  CONTRACT: "#C06010", HEALTH: "#C44444", BILL: "#6A44CC", OTHER: "#5A6080",
};

const CHORE_COLOR = "#0E9F8E";
// Matches the mockup shown to Mikael 2026-07-28: coral for Training, so it
// reads as a distinct "kind" from both reminders and chores at a glance.
const TRAINING_COLOR = "#D85A30";
// School is its own section (not routed through general Reminders — see
// /dashboard/school and /dashboard/family/child), but still shows up here
// since everything syncs to the calendar. Indigo, matching the mockup.
const SCHOOL_COLOR = "#3730A3";

const RECURRENCE_LABELS: Record<string, string> = {
  ONCE: "Once", DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly", YEARLY: "Yearly",
};

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Reminder = {
  id: string; name: string; category: string; date: string;
  recurrence: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  amount: number | null; currency: string | null;
};

type Chore = {
  id: string; name: string; date: string;
  recurrence: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  choreRecurrenceDays: string | null;
  assignedUser: { id: string; name: string | null; email: string } | null;
};

type CalendarEntry = {
  occDate: Date;
  id: string;
  name: string;
  kind: "reminder" | "chore" | "training" | "school";
  color: string;
  subtitle: string;
};

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function CalendarPage() {
  const { status } = useSession();
  const router = useRouter();

  const [checkedChild, setCheckedChild] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [trainings, setTrainings] = useState<Chore[]>([]);
  const [schoolItems, setSchoolItems] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    (async () => {
      // Children get their own simplified world (chore list, no reminders
      // dashboard) — same redirect the main dashboard already does, so the
      // calendar doesn't become a side door into the adult view.
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const d = await res.json();
          if (d.isChildProfile) { router.replace("/dashboard/family/child"); return; }
        }
      } catch { /* fall through — worst case an adult-shaped calendar for an edge-case session */ }
      setCheckedChild(true);
      fetchAll();
    })();
  }, [status]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [remindersRes, choresRes, trainingsRes, schoolRes] = await Promise.all([
        fetch("/api/reminders").then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch("/api/family/chores?category=CHORE").then((r) => (r.ok ? r.json() : { chores: [] })).catch(() => ({ chores: [] })),
        fetch("/api/family/chores?category=TRAINING").then((r) => (r.ok ? r.json() : { chores: [] })).catch(() => ({ chores: [] })),
        fetch("/api/family/chores?category=SCHOOL").then((r) => (r.ok ? r.json() : { chores: [] })).catch(() => ({ chores: [] })),
      ]);
      setReminders(Array.isArray(remindersRes) ? remindersRes : []);
      setChores(Array.isArray(choresRes?.chores) ? choresRes.chores : []);
      setTrainings(Array.isArray(trainingsRes?.chores) ? trainingsRes.chores : []);
      setSchoolItems(Array.isArray(schoolRes?.chores) ? schoolRes.chores : []);
    } finally {
      setLoading(false);
    }
  }

  const gridStart = useMemo(() => {
    const first = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const day = first.getDay(); // 0 = Sun .. 6 = Sat
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const d = new Date(first);
    d.setDate(d.getDate() + mondayOffset);
    return d;
  }, [currentMonth]);

  const gridDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [gridStart]);

  const entriesByDay = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    const gridEnd = gridDays[gridDays.length - 1];

    for (const r of reminders) {
      const occs = getOccurrencesInRange(r as RecurringItem, gridStart, gridEnd);
      for (const occ of occs) {
        const key = dateKey(occ);
        const list = map.get(key) ?? [];
        list.push({
          occDate: occ, id: r.id, name: r.name, kind: "reminder",
          color: CATEGORY_COLOR[r.category] ?? CATEGORY_COLOR.OTHER,
          subtitle: `${CATEGORY_LABELS[r.category] ?? r.category}${r.recurrence !== "ONCE" ? " · " + RECURRENCE_LABELS[r.recurrence] : ""}`,
        });
        map.set(key, list);
      }
    }

    for (const c of chores) {
      const occs = getOccurrencesInRange(c as RecurringItem, gridStart, gridEnd);
      const who = c.assignedUser?.name?.split(" ")[0] ?? c.assignedUser?.email?.split("@")[0] ?? "Unassigned";
      for (const occ of occs) {
        const key = dateKey(occ);
        const list = map.get(key) ?? [];
        list.push({ occDate: occ, id: c.id, name: c.name, kind: "chore", color: CHORE_COLOR, subtitle: `Chore · ${who}` });
        map.set(key, list);
      }
    }

    for (const t of trainings) {
      const occs = getOccurrencesInRange(t as RecurringItem, gridStart, gridEnd);
      const who = t.assignedUser?.name?.split(" ")[0] ?? t.assignedUser?.email?.split("@")[0] ?? "Unassigned";
      for (const occ of occs) {
        const key = dateKey(occ);
        const list = map.get(key) ?? [];
        list.push({ occDate: occ, id: t.id, name: t.name, kind: "training", color: TRAINING_COLOR, subtitle: `Training · ${who}` });
        map.set(key, list);
      }
    }

    for (const s of schoolItems) {
      const occs = getOccurrencesInRange(s as RecurringItem, gridStart, gridEnd);
      const who = s.assignedUser?.name?.split(" ")[0] ?? s.assignedUser?.email?.split("@")[0] ?? "Unassigned";
      for (const occ of occs) {
        const key = dateKey(occ);
        const list = map.get(key) ?? [];
        list.push({ occDate: occ, id: s.id, name: s.name, kind: "school", color: SCHOOL_COLOR, subtitle: `School · ${who}` });
        map.set(key, list);
      }
    }

    const KIND_ORDER: Record<CalendarEntry["kind"], number> = { reminder: 0, training: 1, school: 2, chore: 3 };
    for (const list of Array.from(map.values())) {
      list.sort((a: CalendarEntry, b: CalendarEntry) => (a.kind === b.kind ? a.name.localeCompare(b.name) : KIND_ORDER[a.kind] - KIND_ORDER[b.kind]));
    }
    return map;
  }, [reminders, chores, trainings, schoolItems, gridStart, gridDays]);

  const selectedEntries = entriesByDay.get(dateKey(selectedDate)) ?? [];

  function goToMonth(delta: number) {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  function goToToday() {
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  }

  function openEntry(entry: CalendarEntry) {
    // Chores/trainings are managed from the Family hub; School has its own
    // dedicated section (see /dashboard/school).
    if (entry.kind === "reminder") router.push(`/dashboard/${entry.id}`);
    else if (entry.kind === "school") router.push("/dashboard/school");
    else router.push("/dashboard/family");
  }

  if (status === "loading" || !checkedChild) {
    return (
      <div style={{ minHeight: "100vh", background: "#F5F4F0", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "#7C7C8A", fontSize: 15 }}>Loading calendar…</div>
      </div>
    );
  }

  const monthLabel = currentMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div style={{ minHeight: "100vh", background: "#F5F4F0", fontFamily: FONT }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #E4E3DE", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", cursor: "pointer", color: "#4B5563", display: "flex", padding: 4 }}>
            <IcBack />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: 0, flex: 1 }}>Calendar</h1>
          <HamburgerMenu />
        </div>
      </div>

      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "20px 20px 40px", paddingBottom: 96 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#7C7C8A", fontSize: 14 }}>Loading…</div>
        ) : (
          <>
            {/* Month navigation */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <button onClick={() => goToMonth(-1)} aria-label="Previous month" style={navBtnStyle}><IcLeft /></button>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#0F172A" }}>{monthLabel}</span>
                <button onClick={goToToday} style={{ fontSize: 11, fontWeight: 700, color: "#4A5FD5", background: "#EEF0FD", border: "none", borderRadius: 50, padding: "4px 10px", cursor: "pointer", fontFamily: FONT }}>
                  Today
                </button>
              </div>
              <button onClick={() => goToMonth(1)} aria-label="Next month" style={navBtnStyle}><IcRight /></button>
            </div>

            {/* Weekday header */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
              {WEEKDAY_HEADERS.map((w) => (
                <div key={w} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#9CA3AF", padding: "4px 0" }}>{w}</div>
              ))}
            </div>

            {/* Month grid */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4,
              background: "#fff", border: "1px solid #E4E3DE", borderRadius: 16, padding: 6,
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}>
              {gridDays.map((day) => {
                const inMonth = day.getMonth() === currentMonth.getMonth();
                const isToday = isSameDay(day, today);
                const isSelected = isSameDay(day, selectedDate);
                const entries = entriesByDay.get(dateKey(day)) ?? [];
                const shown = entries.slice(0, 3);
                const overflow = entries.length - shown.length;
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                      padding: "8px 2px 6px", borderRadius: 10, cursor: "pointer",
                      border: isSelected ? "1.5px solid #4A5FD5" : "1.5px solid transparent",
                      background: isSelected ? "#EEF0FD" : "transparent",
                      opacity: inMonth ? 1 : 0.35,
                      fontFamily: FONT, minHeight: 52,
                    }}
                  >
                    <span style={{
                      fontSize: 13, fontWeight: isToday ? 800 : 600,
                      color: isToday ? "#fff" : "#0F172A",
                      background: isToday ? "#4A5FD5" : "transparent",
                      width: 22, height: 22, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {day.getDate()}
                    </span>
                    <span style={{ display: "flex", gap: 2, height: 6, alignItems: "center" }}>
                      {shown.map((e, i) => (
                        <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: e.color }} />
                      ))}
                      {overflow > 0 && <span style={{ fontSize: 8, fontWeight: 700, color: "#9CA3AF", marginLeft: 1 }}>+{overflow}</span>}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected day panel */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#7C7C8A", marginBottom: 8 }}>
                {selectedDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              </div>

              {selectedEntries.length === 0 ? (
                <div style={{ background: "#fff", border: "1px solid #E4E3DE", borderRadius: 16, padding: "24px 16px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                  Nothing on this day.
                </div>
              ) : (
                <div style={{ background: "#fff", border: "1px solid #E4E3DE", borderRadius: 16, overflow: "hidden" }}>
                  {selectedEntries.map((e, i) => (
                    <div
                      key={`${e.kind}-${e.id}-${i}`}
                      onClick={() => openEntry(e)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                        borderTop: i === 0 ? "none" : "1px solid #F0F3F8", cursor: "pointer",
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: e.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{e.name}</div>
                        <div style={{ fontSize: 12, color: "#7C7C8A", marginTop: 2 }}>{e.subtitle}</div>
                      </div>
                      <span style={{ color: "#C0C5D0", flexShrink: 0, display: "flex" }}><IcChevRight /></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: "50%", border: "1px solid #E4E3DE", background: "#fff",
  color: "#4B5563", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
};
