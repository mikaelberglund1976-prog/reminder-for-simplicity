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
  // 2026-10-03: came from the child's SchoolSoft link
  imported?: boolean;
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
  // 2026-10-03: the SchoolSoft card on the School page asks for a reload after a sync/reset.
  useEffect(() => {
    const h = () => { load(); };
    window.addEventListener("rfs:school-reload", h);
    return () => window.removeEventListener("rfs:school-reload", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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

  async function saveEdit(id: string, fields: { name: string; subject: string; schoolKind: SchoolKind; date: string }) {
    setBusy(id);
    try {
      const res = await fetch(`/api/family/school/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) });
      await load();
      return res.ok;
    } catch { return false; }
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
      {list.map((item, i) => {
        // A child can't remove or rewrite what came from SchoolSoft — a parent can.
        const adultView = mode === "overview";
        const canChange = adultView || !item.imported;
        return <Row key={item.id} item={item} first={i === 0} busy={busy === item.id} showOwner={adultView && members.length > 1}
          canEdit={canChange} canDelete={canChange}
          onToggle={() => patch(item.id, { completed: !item.completedAt })}
          onCalendar={() => patch(item.id, { showInCalendar: !item.showInCalendar })}
          onSave={(fields) => saveEdit(item.id, fields)}
          onDelete={() => remove(item.id)} />;
      })}
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
      <datalist id="school-subjects">{SUBJECTS.map(s => <option key={s} value={s} />)}</datalist>
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

function toDateInput(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Row({ item, first, busy, showOwner, canEdit, canDelete, onToggle, onCalendar, onSave, onDelete }: {
  item: SchoolItem; first: boolean; busy: boolean; showOwner: boolean; canEdit: boolean; canDelete: boolean;
  onToggle: () => void; onCalendar: () => void; onDelete: () => void;
  onSave: (f: { name: string; subject: string; schoolKind: SchoolKind; date: string }) => Promise<boolean>;
}) {
  const meta = KIND_META[item.schoolKind ?? "OTHER"];
  const isDone = !!item.completedAt;
  const cd = countdown(item.date);
  const toneColor = isDone ? "var(--subtle)" : cd.tone === "overdue" ? "var(--danger)" : cd.tone === "soon" ? "var(--warning)" : "var(--muted)";
  const [editing, setEditing] = useState(false);
  const [eName, setEName] = useState(item.name);
  const [eSubject, setESubject] = useState(item.subject ?? "");
  const [eKind, setEKind] = useState<SchoolKind>(item.schoolKind ?? "OTHER");
  const [eDate, setEDate] = useState(toDateInput(item.date));

  function startEdit() {
    if (!canEdit) return;
    setEName(item.name); setESubject(item.subject ?? ""); setEKind(item.schoolKind ?? "OTHER"); setEDate(toDateInput(item.date));
    setEditing(true);
  }

  if (editing) {
    return (
      <form onSubmit={async (e) => { e.preventDefault(); if (!eName.trim()) return; if (await onSave({ name: eName.trim(), subject: eSubject.trim(), schoolKind: eKind, date: eDate })) setEditing(false); }}
        style={{ padding: "12px 14px", borderTop: first ? "none" : "1px solid var(--border-soft)", background: "var(--surface-2)", fontFamily: FONT }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {(Object.keys(KIND_META) as SchoolKind[]).map(k => {
            const m = KIND_META[k]; const on = eKind === k;
            return (
              <button key={k} type="button" onClick={() => setEKind(k)} style={{
                flex: 1, padding: "8px 4px", borderRadius: 10, cursor: "pointer", fontFamily: FONT, fontSize: 12.5, fontWeight: 700,
                border: on ? `1.5px solid ${m.color}` : "1.5px solid var(--border)", background: on ? m.bg : "var(--background)", color: on ? m.color : "var(--muted)",
              }}>{m.icon} {m.label}</button>
            );
          })}
        </div>
        <input value={eName} onChange={e => setEName(e.target.value)} style={input} aria-label="Name" />
        <div style={{ display: "flex", gap: 8 }}>
          <input value={eSubject} onChange={e => setESubject(e.target.value)} list="school-subjects" placeholder="Subject" style={{ ...input, flex: 1 }} aria-label="Subject" />
          <input type="date" value={eDate} onChange={e => setEDate(e.target.value)} style={{ ...input, flex: 1 }} aria-label="Date" />
        </div>
        {item.imported && <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 10, lineHeight: 1.4 }}>From SchoolSoft — after you save, SchoolSoft won&apos;t overwrite your changes.</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setEditing(false)} style={{ flex: 1, padding: "10px", borderRadius: 12, background: "var(--background)", border: "1.5px solid var(--border)", color: "var(--fg-2)", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>Cancel</button>
          <button type="submit" disabled={busy || !eName.trim()} style={{ flex: 1, padding: "10px", borderRadius: 12, background: "var(--school-bg)", border: "none", color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT, opacity: busy ? 0.6 : 1 }}>Save</button>
        </div>
      </form>
    );
  }

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
      <div onClick={startEdit} role={canEdit ? "button" : undefined} title={canEdit ? "Tap to change" : undefined} style={{ flex: 1, minWidth: 0, cursor: canEdit ? "pointer" : "default" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: isDone ? "var(--subtle)" : "var(--fg)", lineHeight: 1.3, textDecoration: isDone ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.subject ? <span style={{ color: isDone ? "var(--subtle)" : meta.color }}>{item.subject} · </span> : null}{item.name}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
          <span style={{ color: toneColor, fontWeight: 700 }}>{cd.text}</span>
          {" · "}{new Date(item.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
          {showOwner && item.assignedUser?.name ? ` · ${item.assignedUser.name}` : ""}
          {item.imported && <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 800, padding: "1px 6px", borderRadius: 6, background: "var(--tint-success)", color: "var(--success)" }}>SchoolSoft</span>}
        </div>
        {item.note && !isDone && <div style={{ fontSize: 12, color: "var(--subtle)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.note}</div>}
      </div>
      <button onClick={onCalendar} title={item.showInCalendar ? "Shown in calendar — tap to hide" : "Hidden from calendar — tap to show"} aria-label="Toggle calendar" style={{
        background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 4, opacity: item.showInCalendar ? 1 : 0.25, filter: item.showInCalendar ? "none" : "grayscale(1)",
      }}>📅</button>
      {canDelete && <button onClick={onDelete} aria-label="Remove" style={{ background: "none", border: "none", color: "var(--faint)", fontSize: 18, cursor: "pointer", padding: 4, lineHeight: 1 }}>×</button>}
    </div>
  );
}
