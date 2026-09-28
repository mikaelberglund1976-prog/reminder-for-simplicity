"use client";

// 2026-09-27: shared School (homework & tests) section, used by both the
// child's start page (dashboard/family/child, mode="child" — shown FIRST so a
// child sees what's coming as soon as they log in) and the family overview
// (dashboard/school, mode="overview" — grouped per person).
// Mikael: "viktigt för barnen att när man loggar in så ser man det som är
// skapat" + "ska även kunna se i kalendervy om man väljer det".
import { useEffect, useState } from "react";
import UpgradeGate from "@/components/UpgradeGate";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

export type SchoolKind = "HOMEWORK" | "TEST" | "OTHER";

export type SchoolItem = {
  id: string;
  name: string;
  note: string | null;
  date: string;
  userId: string;
  schoolKind: SchoolKind | null;
  subject: string | null;
  completedAt: string | null;
  showInCalendar: boolean;
  assignedUser: { id: string; name: string | null; email: string } | null;
};

export const KIND_META: Record<SchoolKind, { label: string; icon: string; color: string; bg: string }> = {
  HOMEWORK: { label: "Homework", icon: "📝", color: "var(--school)", bg: "var(--tint-school)" },
  TEST:     { label: "Test",     icon: "🧪", color: "var(--danger)", bg: "var(--tint-danger)" },
  OTHER:    { label: "Other",    icon: "📌", color: "var(--fg-2)", bg: "var(--surface-3)" },
};

const SUBJECTS = ["Maths", "Swedish", "English", "Science", "History", "Geography", "Religion", "Civics", "Music", "Art", "PE", "Spanish", "French", "German"];

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

export function countdown(dateStr: string): { text: string; tone: "overdue" | "soon" | "later" } {
  const days = Math.round((startOfDay(new Date(dateStr)).getTime() - startOfDay(new Date()).getTime()) / 86400000);
  if (days < 0) return { text: days === -1 ? "Yesterday" : `${-days} days ago`, tone: "overdue" };
  if (days === 0) return { text: "Today", tone: "soon" };
  if (days === 1) return { text: "Tomorrow", tone: "soon" };
  return { text: `In ${days} days`, tone: days <= 3 ? "soon" : "later" };
}

type Props = {
  mode: "child" | "overview";
  // overview only: who an item can be assigned to
  members?: { id: string; name: string; role?: string }[];
  // calendar "+" can deep-link with a date prefilled
  initialDate?: string | null;
  // child mode opened by a parent for one child ("Child view"): only that
  // child's items.
  onlyUserId?: string;
};

export default function SchoolSection({ mode, members = [], initialDate, onlyUserId }: Props) {
  const [items, setItems] = useState<SchoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [showAdd, setShowAdd] = useState(!!initialDate);
  const [showDone, setShowDone] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [kind, setKind] = useState<SchoolKind>("HOMEWORK");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(initialDate ?? "");
  const [note, setNote] = useState("");
  const [inCalendar, setInCalendar] = useState(true);
  const [assignee, setAssignee] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!assignee && members.length) setAssignee(members[0].id);
  }, [members, assignee]);

  async function load() {
    try {
      const res = await fetch("/api/family/chores?category=SCHOOL");
      if (res.ok) {
        const data = await res.json();
        setLocked(data.access === "LOCKED");
        const all: SchoolItem[] = data.chores ?? [];
        setItems(onlyUserId ? all.filter((i) => i.assignedUser?.id === onlyUserId) : all);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function resetForm() {
    setName(""); setSubject(""); setDate(""); setNote(""); setKind("HOMEWORK"); setInCalendar(true); setError(null);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (mode === "overview" && !assignee) return;
    setAdding(true); setError(null);
    try {
      const res = await fetch("/api/family/chores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "SCHOOL",
          name: name.trim(),
          schoolKind: kind,
          subject: subject.trim() || undefined,
          note: note.trim() || undefined,
          showInCalendar: inCalendar,
          assignedTo: mode === "overview" ? assignee : onlyUserId,
          startDate: date ? new Date(date + "T12:00:00").toISOString() : undefined,
        }),
      });
      if (res.ok) { resetForm(); setShowAdd(false); await load(); }
      else { const d = await res.json().catch(() => ({})); setError(d?.error ?? "Could not add"); }
    } catch { setError("Something went wrong"); }
    finally { setAdding(false); }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    // optimistic
    setItems(prev => prev.map(i => i.id !== id ? i : {
      ...i,
      ...(typeof body.completed === "boolean" ? { completedAt: body.completed ? new Date().toISOString() : null } : {}),
      ...(typeof body.showInCalendar === "boolean" ? { showInCalendar: body.showInCalendar as boolean } : {}),
    }));
    try {
      const res = await fetch(`/api/family/school/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) await load();
    } catch { await load(); }
    finally { setBusy(null); }
  }

  async function remove(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/family/school/${id}`, { method: "DELETE" });
      if (res.ok) setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error(e); }
    finally { setBusy(null); }
  }

  if (loading) return <div style={{ fontSize: 13, color: "var(--subtle)", padding: "8px 2px", fontFamily: FONT }}>Loading homework & tests…</div>;
  if (locked) {
    return <UpgradeGate compact feature="Homework & tests" emoji="📚" />;
  }

  const byDate = (a: SchoolItem, b: SchoolItem) => new Date(a.date).getTime() - new Date(b.date).getTime();
  const upcoming = items.filter(i => !i.completedAt).sort(byDate);
  const done = items.filter(i => i.completedAt).sort((a, b) => byDate(b, a));

  const renderList = (list: SchoolItem[]) => (
    <div style={{ background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)", marginBottom: 10 }}>
      {list.map((item, i) => <Row key={item.id} item={item} first={i === 0} busy={busy === item.id} showOwner={mode === "overview" && members.length > 1}
        onToggle={() => patch(item.id, { completed: !item.completedAt })}
        onCalendar={() => patch(item.id, { showInCalendar: !item.showInCalendar })}
        onDelete={() => remove(item.id)} />)}
    </div>
  );

  // Overview: group upcoming per person
  const groups: { id: string; name: string; role?: string; list: SchoolItem[] }[] = mode === "overview"
    ? members.map(m => ({ id: m.id, name: m.name, role: m.role, list: upcoming.filter(i => i.assignedUser?.id === m.id) }))
        // adults without anything coming up are just noise here
        .filter(g => g.list.length > 0 || !g.role || g.role === "CHILD")
    : [];

  return (
    <div style={{ marginBottom: 20, fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--school)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          📚 Homework & tests {upcoming.length > 0 && `· ${upcoming.length}`}
        </div>
      </div>

      {mode === "child" && (upcoming.length > 0
        ? renderList(upcoming)
        : !showAdd && <div style={{ fontSize: 13, color: "var(--subtle)", padding: "4px 2px 12px" }}>Nothing coming up. 🎉</div>)}

      {mode === "overview" && groups.map(g => (
        <div key={g.id} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            {g.name} · {g.list.length}
          </div>
          {g.list.length ? renderList(g.list) : <div style={{ fontSize: 13, color: "var(--subtle)", padding: "4px 2px" }}>Nothing coming up.</div>}
        </div>
      ))}

      {!showAdd ? (
        <button onClick={() => { setShowAdd(true); setError(null); }} style={{
          width: "100%", padding: "14px 16px", borderRadius: 14,
          background: mode === "overview" ? "var(--school-bg)" : "var(--surface)",
          border: mode === "overview" ? "none" : "1.5px dashed var(--accent-border)",
          color: mode === "overview" ? "#fff" : "var(--school)",
          fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add homework or a test
        </button>
      ) : (
        <form onSubmit={handleAdd} style={{ background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", padding: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {(Object.keys(KIND_META) as SchoolKind[]).map(k => {
              const m = KIND_META[k]; const on = kind === k;
              return (
                <button key={k} type="button" onClick={() => setKind(k)} style={{
                  flex: 1, padding: "10px 6px", borderRadius: 12, cursor: "pointer", fontFamily: FONT,
                  fontSize: 13, fontWeight: 700, border: on ? `1.5px solid ${m.color}` : "1.5px solid var(--border)",
                  background: on ? m.bg : "var(--background)", color: on ? m.color : "var(--muted)",
                }}>{m.icon} {m.label}</button>
              );
            })}
          </div>

          {mode === "overview" && members.length > 1 && (
            <select value={assignee} onChange={e => setAssignee(e.target.value)} disabled={adding} style={input}>
              {members.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          <input type="text" placeholder={kind === "TEST" ? "e.g. Chapter 4 test" : "e.g. Read pages 20–30"} value={name}
            onChange={e => setName(e.target.value)} disabled={adding} autoFocus style={input} />
          <input type="text" list="school-subjects" placeholder="Subject (e.g. Maths)" value={subject}
            onChange={e => setSubject(e.target.value)} disabled={adding} style={input} />
          <datalist id="school-subjects">{SUBJECTS.map(s => <option key={s} value={s} />)}</datalist>
          <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, display: "block", marginBottom: 4 }}>
            {kind === "TEST" ? "Test date" : "Due date"}
          </label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} disabled={adding} style={input} />
          <input type="text" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} disabled={adding} style={input} />

          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--fg)", margin: "2px 2px 12px", cursor: "pointer" }}>
            <input type="checkbox" checked={inCalendar} onChange={e => setInCalendar(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--school)" }} />
            Show in calendar
          </label>

          {error && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => { setShowAdd(false); resetForm(); }} disabled={adding} style={{
              flex: 1, padding: "12px 14px", borderRadius: 12, background: "var(--background)", border: "1.5px solid var(--border)",
              color: "var(--fg-2)", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
            }}>Cancel</button>
            <button type="submit" disabled={adding || !name.trim()} style={{
              flex: 1, padding: "12px 14px", borderRadius: 12, border: "none", color: "#fff", fontSize: 14, fontWeight: 700,
              background: !name.trim() || adding ? "var(--faint)" : "var(--school-bg)", cursor: !name.trim() || adding ? "not-allowed" : "pointer", fontFamily: FONT,
            }}>{adding ? "Adding…" : "Add"}</button>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10, textAlign: "center" }}>
            You'll get an email reminder the day before.
          </div>
        </form>
      )}

      {done.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <button onClick={() => setShowDone(v => !v)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "4px 2px", fontFamily: FONT }}>
            {showDone ? "▾" : "▸"} Done · {done.length}
          </button>
          {showDone && <div style={{ marginTop: 8 }}>{renderList(done)}</div>}
        </div>
      )}
    </div>
  );
}

const input: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 12, background: "var(--background)", border: "1.5px solid var(--border)",
  fontSize: 14, color: "var(--fg)", outline: "none", fontFamily: FONT, boxSizing: "border-box", marginBottom: 10,
};

function Row({ item, first, busy, showOwner, onToggle, onCalendar, onDelete }: {
  item: SchoolItem; first: boolean; busy: boolean; showOwner: boolean;
  onToggle: () => void; onCalendar: () => void; onDelete: () => void;
}) {
  const meta = KIND_META[item.schoolKind ?? "OTHER"];
  const isDone = !!item.completedAt;
  const cd = countdown(item.date);
  const toneColor = isDone ? "var(--subtle)" : cd.tone === "overdue" ? "var(--danger)" : cd.tone === "soon" ? "var(--warning)" : "var(--muted)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderTop: first ? "none" : "1px solid var(--border-soft)", opacity: busy ? 0.6 : 1 }}>
      <button onClick={onToggle} aria-label={isDone ? "Mark as not done" : "Mark as done"} style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
        border: isDone ? "none" : "2px solid var(--accent-border)", background: isDone ? "#16A34A" : "var(--surface)",
        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, padding: 0,
      }}>{isDone ? "✓" : ""}</button>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }} title={meta.label}>
        {meta.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: isDone ? "var(--subtle)" : "var(--fg)", lineHeight: 1.3, textDecoration: isDone ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.subject ? <span style={{ color: isDone ? "var(--subtle)" : meta.color }}>{item.subject} · </span> : null}{item.name}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
          <span style={{ color: toneColor, fontWeight: 700 }}>{cd.text}</span>
          {" · "}{new Date(item.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
          {showOwner && item.assignedUser?.name ? ` · ${item.assignedUser.name}` : ""}
          {item.note ? ` · ${item.note}` : ""}
        </div>
      </div>
      <button onClick={onCalendar} title={item.showInCalendar ? "Shown in calendar — tap to hide" : "Hidden from calendar — tap to show"} aria-label="Toggle calendar" style={{
        background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 4, opacity: item.showInCalendar ? 1 : 0.25, filter: item.showInCalendar ? "none" : "grayscale(1)",
      }}>📅</button>
      <button onClick={onDelete} aria-label="Remove" style={{ background: "none", border: "none", color: "var(--faint)", fontSize: 18, cursor: "pointer", padding: 4, lineHeight: 1 }}>×</button>
    </div>
  );
}
