"use client";

// The child's start page ("My week").
// 2026-10-01 (phone test, Mikael: "startsidan har chores som en blaffa i
// mitten", "man vill komma in och ha en bra översikt"): rebuilt as an
// overview. Top: greeting with the child's own photo (tap to change it) and
// the family photo — the same picture everyone sees. Then three tiles that
// say what needs doing, then the sections in that order: homework & tests,
// today's activities, chores (compact, no big hero card), and things the
// family has shared with them. A child only ever sees their own items plus
// what's shared with them — enforced by the APIs, not just here.
// A parent can open the same page for one child (?id=…) from Chores.
import { useSession } from "next-auth/react";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SchoolSection from "@/components/SchoolSection";
import HamburgerMenu from "@/components/HamburgerMenu";
import AvatarPicker from "@/components/AvatarPicker";
import Avatar from "@/components/Avatar";
import { headerUrl, useFamilyMedia } from "@/lib/familyMedia";
import { withNextDate } from "@/lib/recurrence";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcBack()  { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6"/></svg>; }
function IcCheck() { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR} strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>; }

type Chore = {
  id: string;
  assignedTo?: string | null;
  name: string;
  note: string | null;
  requiresApproval: boolean;
  completions: { id: string; status: string }[];
};
type Activity = { id: string; name: string; note: string | null; recurrence: string; choreRecurrenceDays: string | null; assignedTo?: string | null; date?: string };
type SchoolLite = { id: string; name: string; date: string; subject: string | null; schoolKind: string | null; completedAt: string | null; assignedUser: { id: string } | null };
type SharedReminder = { id: string; name: string; date: string; category: string; userId: string; assignedTo?: string | null; user?: { id: string; name: string | null } };

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function daysUntil(dateStr: string) { return Math.round((startOfDay(new Date(dateStr)).getTime() - startOfDay(new Date()).getTime()) / 86400000); }
function whenText(dateStr: string) {
  const d = daysUntil(dateStr);
  if (d < 0) return "Overdue";
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d <= 6) return new Date(dateStr).toLocaleDateString("en-GB", { weekday: "long" });
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const SECTION_LABEL: React.CSSProperties = { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 };

function ChildViewContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const media = useFamilyMedia();
  const myId = session?.user?.id;
  const childId = searchParams.get("id") ?? myId;
  const isOwn = !!myId && childId === myId;

  const [chores, setChores] = useState<Chore[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [school, setSchool] = useState<SchoolLite[]>([]);
  const [shared, setShared] = useState<SharedReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [childName, setChildName] = useState<string | null>(null);
  const [access, setAccess] = useState<string>("TRIAL");
  const [showDone, setShowDone] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNote, setNewNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, childId]);

  async function fetchChores() {
    const res = await fetch("/api/family/chores");
    if (!res.ok) return;
    const data = await res.json();
    setAccess(data.access ?? "TRIAL");
    const all: Chore[] = data.chores ?? [];
    setChores(childId ? all.filter((c) => c.assignedTo === childId) : all);
  }

  async function load() {
    setLoading(true);
    try {
      const [, aRes, sRes, rRes, tRes] = await Promise.all([
        fetchChores(),
        fetch("/api/family/chores?category=TRAINING"),
        fetch("/api/family/chores?category=SCHOOL"),
        isOwn ? fetch("/api/reminders") : Promise.resolve(null),
        fetch("/api/family/trial"),
      ]);
      if (aRes.ok) {
        const list = ((await aRes.json()).chores ?? []) as Activity[];
        setActivities(childId ? list.filter((a) => a.assignedTo === childId) : list);
      }
      if (sRes.ok) {
        const list = ((await sRes.json()).chores ?? []) as SchoolLite[];
        setSchool(childId ? list.filter((s) => s.assignedUser?.id === childId) : list);
      }
      if (rRes && rRes.ok) {
        const list = await rRes.json();
        setShared(Array.isArray(list) ? list.map(withNextDate) : []);
      }
      if (tRes.ok) {
        const t = await tRes.json();
        const found = (t.childMembers ?? []).find((m: { id: string; name: string }) => m.id === childId);
        if (found) setChildName(found.name);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleAddChore(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true); setAddError(null);
    try {
      const res = await fetch("/api/family/chores", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), note: newNote.trim() || undefined, recurrence: "WEEKLY", ...(isOwn ? {} : { assignedTo: childId }) }),
      });
      if (res.ok) {
        setNewName(""); setNewNote(""); setShowAdd(false);
        await fetchChores();
      } else {
        const data = await res.json().catch(() => ({}));
        setAddError(data?.error ?? "Could not add chore");
      }
    } catch { setAddError("Something went wrong"); }
    finally { setAdding(false); }
  }

  async function toggleChore(choreId: string) {
    setToggling(choreId);
    try {
      const res = await fetch(`/api/family/chores/${choreId}/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      if (res.ok) await fetchChores();
    } catch (e) { console.error(e); }
    finally { setToggling(null); }
  }

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "var(--muted)", fontSize: 15 }}>Loading your week…</div>
      </div>
    );
  }

  const firstName = (isOwn ? session?.user?.name : childName)?.split(" ")[0] ?? null;

  const done    = chores.filter((c) => c.completions.some((cp) => cp.status === "APPROVED" || cp.status === "DONE"));
  const pending = chores.filter((c) => c.completions.some((cp) => cp.status === "PENDING_APPROVAL"));
  const todo    = chores.filter((c) => c.completions.length === 0);
  const pct = chores.length > 0 ? Math.round((done.length / chores.length) * 100) : 0;

  const todayDow = new Date().getDay();
  const isToday = (a: Activity) =>
    a.choreRecurrenceDays ? a.choreRecurrenceDays.split(",").map((n) => parseInt(n, 10)).includes(todayDow)
      : a.recurrence === "DAILY" ? true
      : a.recurrence === "ONCE" && a.date ? daysUntil(a.date) === 0 : false;
  const activitiesToday = activities.filter(isToday);
  const activitiesSorted = [...activitiesToday, ...activities.filter((a) => !isToday(a))];

  const schoolOpen = school
    .filter((s) => !s.completedAt && daysUntil(s.date) <= 14 && daysUntil(s.date) >= -7)
    .sort((a, b) => daysUntil(a.date) - daysUntil(b.date));
  const nextSchool = schoolOpen[0];

  // What the family has shared with me (or I made myself) — next 30 days.
  const sharedSoon = shared
    .filter((r) => daysUntil(r.date) >= 0 && daysUntil(r.date) <= 30)
    .slice(0, 6);

  const tiles: { id: string; emoji: string; value: string; label: string; sub: string; tint: string; color: string }[] = [
    {
      id: "school", emoji: "📚", value: String(schoolOpen.length), label: "School",
      sub: nextSchool ? `${nextSchool.schoolKind === "TEST" ? "Test" : "Next"} ${whenText(nextSchool.date).toLowerCase()}` : "All clear",
      tint: "var(--tint-school)", color: "var(--school)",
    },
    {
      id: "chores", emoji: "✅", value: access === "LOCKED" ? "–" : String(todo.length), label: todo.length === 1 ? "Chore left" : "Chores left",
      sub: chores.length ? `${done.length} of ${chores.length} done` : "None this week",
      tint: "var(--tint-success)", color: "var(--success)",
    },
    {
      id: "activities", emoji: "🎯", value: String(activitiesToday.length), label: "Today",
      sub: activitiesToday[0]?.name ?? (activities.length ? "Nothing today" : "No activities"),
      tint: "var(--tint-warning)", color: "#D85A30",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 20px", minHeight: 64, display: "flex", alignItems: "center", gap: 12 }}>
          {isOwn ? (
            myId && <AvatarPicker userId={myId} name={session?.user?.name} size={42} />
          ) : (
            <>
              <button onClick={() => router.back()} aria-label="Back" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-2)", display: "flex", padding: 4 }}>
                <IcBack />
              </button>
              {childId && <Avatar userId={childId} name={childName} size={36} />}
            </>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--fg)", margin: 0, letterSpacing: "-0.3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {isOwn ? `Hi${firstName ? " " + firstName : ""}` : `${firstName ?? "Child"}'s week`}
            </h1>
          </div>
          <HamburgerMenu />
        </div>
      </div>

      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "16px 20px 0" }}>
        {/* The family photo — same picture as on everyone's Home. */}
        {media.header && (
          <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "var(--shadow)", marginBottom: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={headerUrl(media.header)} alt="" style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />
          </div>
        )}

        {/* Overview — what needs doing, at a glance. */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 22 }}>
          {tiles.map((t) => (
            <button key={t.id} onClick={() => document.getElementById(`sec-${t.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              style={{ textAlign: "left", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "12px 11px", cursor: "pointer", fontFamily: FONT, boxShadow: "var(--shadow)", minWidth: 0 }}>
              <span style={{ display: "inline-flex", width: 30, height: 30, borderRadius: 9, background: t.tint, alignItems: "center", justifyContent: "center", fontSize: 15, marginBottom: 8 }}>{t.emoji}</span>
              <div style={{ fontSize: 22, fontWeight: 800, color: t.color, lineHeight: 1 }}>{t.value}</div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--fg)", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.label}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.sub}</div>
            </button>
          ))}
        </div>

        {/* 1. Homework & tests — first, it's what matters most. */}
        <div id="sec-school" style={{ scrollMarginTop: 80 }}>
          <SchoolSection mode="child" onlyUserId={!isOwn && childId ? childId : undefined} />
        </div>

        {/* 2. Activities — today's first. */}
        <div id="sec-activities" style={{ scrollMarginTop: 80, marginBottom: 20 }}>
          <div style={{ ...SECTION_LABEL, color: "#D85A30" }}>🎯 Activities {activities.length > 0 && `· ${activities.length}`}</div>
          {activities.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--subtle)", padding: "0 2px" }}>No activities yet.</div>
          ) : (
            <div style={{ background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", overflow: "hidden" }}>
              {activitiesSorted.map((a, i) => {
                const today = isToday(a);
                return (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid var(--border-soft)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)" }}>{a.name}</div>
                      {a.note && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{a.note}</div>}
                    </div>
                    {today
                      ? <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 50, background: "var(--tint-warning)", color: "var(--warning)", flexShrink: 0 }}>Today</span>
                      : <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", flexShrink: 0 }}>{scheduleText(a)}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Chores — compact: a thin progress bar, not a big card. */}
        <div id="sec-chores" style={{ scrollMarginTop: 80, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
            <div style={{ ...SECTION_LABEL, color: "var(--success)" }}>✅ Chores this week</div>
            {chores.length > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? "var(--success)" : "var(--muted)" }}>{pct === 100 ? "🎉 All done" : `${done.length} of ${chores.length} done`}</div>}
          </div>

          {access === "LOCKED" ? (
            <div style={{ background: "var(--tint-warning)", borderRadius: 14, padding: 14, fontSize: 13, color: "var(--warning)", fontWeight: 600 }}>
              Chores are part of Pro — ask a parent.
            </div>
          ) : (
            <>
              {chores.length > 0 && (
                <div style={{ height: 6, background: "var(--surface-3)", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "var(--success)" : "var(--accent-bg)", borderRadius: 3, transition: "width 0.4s" }} />
                </div>
              )}

              {(todo.length > 0 || pending.length > 0 || (showDone && done.length > 0)) && (
                <div style={{ background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", overflow: "hidden", marginBottom: 8 }}>
                  {[...todo.map((c) => ({ c, s: "todo" as const })), ...pending.map((c) => ({ c, s: "pending" as const })), ...(showDone ? done.map((c) => ({ c, s: "done" as const })) : [])]
                    .map(({ c, s }, i) => (
                      <ChoreRow key={c.id} chore={c} state={s} isFirst={i === 0} loading={toggling === c.id} onToggle={() => toggleChore(c.id)} />
                    ))}
                </div>
              )}

              {chores.length === 0 && !showAdd && (
                <div style={{ fontSize: 13, color: "var(--subtle)", padding: "0 2px 8px" }}>No chores this week.</div>
              )}
              {chores.length > 0 && todo.length === 0 && pending.length === 0 && !showDone && (
                <div style={{ fontSize: 13, color: "var(--success)", fontWeight: 600, padding: "0 2px 8px" }}>Everything is done this week. Nice! 🎉</div>
              )}

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {!showAdd && (
                  <button onClick={() => { setShowAdd(true); setAddError(null); }} style={{
                    flex: 1, padding: "11px 14px", borderRadius: 12, background: "var(--surface)", border: "1.5px dashed var(--border)",
                    color: "var(--accent-strong)", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
                  }}>+ Add a chore</button>
                )}
                {done.length > 0 && !showAdd && (
                  <button onClick={() => setShowDone((v) => !v)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT, padding: "8px 4px", flexShrink: 0 }}>
                    {showDone ? "Hide done" : `Show done (${done.length})`}
                  </button>
                )}
              </div>

              {showAdd && (
                <form onSubmit={handleAddChore} style={{ background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", padding: 14 }}>
                  <input type="text" placeholder="What will you do?" value={newName} onChange={(e) => setNewName(e.target.value)} disabled={adding} autoFocus style={inp} />
                  <input type="text" placeholder="Note (optional)" value={newNote} onChange={(e) => setNewNote(e.target.value)} disabled={adding} style={inp} />
                  {addError && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{addError}</div>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={() => { setShowAdd(false); setNewName(""); setNewNote(""); setAddError(null); }} disabled={adding}
                      style={{ flex: 1, padding: "11px 14px", borderRadius: 12, background: "var(--background)", border: "1.5px solid var(--border)", color: "var(--fg-2)", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                      Cancel
                    </button>
                    <button type="submit" disabled={adding || !newName.trim()}
                      style={{ flex: 1, padding: "11px 14px", borderRadius: 12, background: "var(--ink)", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT, opacity: adding || !newName.trim() ? 0.5 : 1 }}>
                      {adding ? "Adding…" : "Add chore"}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {/* 4. Shared with me — reminders the family shared with everyone,
            assigned to me, or that I made myself. */}
        {isOwn && sharedSoon.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ ...SECTION_LABEL, color: "var(--accent)" }}>📌 Coming up · {sharedSoon.length}</div>
            <div style={{ background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", overflow: "hidden" }}>
              {sharedSoon.map((r, i) => {
                const fromOther = r.user && r.user.id !== myId;
                return (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid var(--border-soft)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                      {fromOther && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>From {r.user?.name?.split(" ")[0] ?? "family"}</div>}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: daysUntil(r.date) <= 1 ? "var(--warning)" : "var(--muted)", flexShrink: 0 }}>{whenText(r.date)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2026-09-29 (GDPR, launch list row 15): what the app keeps about a child. */}
        {isOwn && (
          <details style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "12px 16px", margin: "24px 0 0", fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.55 }}>
            <summary style={{ fontWeight: 700, color: "var(--fg)", cursor: "pointer" }}>🔒 What does the app save about me?</summary>
            <ul style={{ margin: "10px 0 4px", paddingLeft: 18 }}>
              <li>Your name, your email and your password (locked so nobody can read it).</li>
              <li>Your homework, tests, chores, activities, wishlist — and your photo if you or a parent adds one.</li>
              <li>The grown-ups in your family can see it. Other kids and other families can&apos;t.</li>
              <li>We never sell it and you never see ads.</li>
              <li>If you want something removed, ask a parent — they can change or delete it.</li>
            </ul>
            <a href="/privacy" style={{ color: "var(--accent)", fontWeight: 700, fontSize: 12.5 }}>The long version for grown-ups →</a>
          </details>
        )}
      </main>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 12, background: "var(--background)", border: "1.5px solid var(--border)",
  fontSize: 14, color: "var(--fg)", outline: "none", fontFamily: FONT, boxSizing: "border-box", marginBottom: 10,
};

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function scheduleText(a: { recurrence: string; choreRecurrenceDays: string | null }): string {
  if (a.choreRecurrenceDays) {
    return a.choreRecurrenceDays.split(",").map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n))
      .sort((x, y) => ((x + 6) % 7) - ((y + 6) % 7)).map((d) => WEEKDAY_SHORT[d]).join(", ");
  }
  if (a.recurrence === "DAILY") return "Every day";
  if (a.recurrence === "WEEKLY") return "Weekly";
  return "Once";
}

function ChoreRow({ chore, state, isFirst, loading, onToggle }: {
  chore: Chore; state: "todo" | "pending" | "done"; isFirst: boolean; loading: boolean; onToggle: () => void;
}) {
  const isDone = state === "done";
  const isPending = state === "pending";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: isFirst ? "none" : "1px solid var(--border-soft)" }}>
      <button onClick={onToggle} disabled={loading} aria-label={isDone ? "Mark as not done" : "Mark as done"}
        style={{
          width: 32, height: 32, borderRadius: "50%", border: "none", cursor: loading ? "wait" : "pointer", flexShrink: 0,
          background: isDone ? "var(--tint-success)" : isPending ? "var(--tint-warning)" : "var(--surface-3)",
          color: isDone ? "var(--success)" : isPending ? "var(--warning)" : "var(--faint)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
        {isDone || isPending ? <IcCheck /> : <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><circle cx="12" cy="12" r="9"/></svg>}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, color: isDone ? "var(--subtle)" : "var(--fg)", textDecoration: isDone ? "line-through" : "none" }}>{chore.name}</div>
        {chore.note && !isDone && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{chore.note}</div>}
        {isPending && <div style={{ fontSize: 11, color: "var(--warning)", fontWeight: 600, marginTop: 2 }}>⏳ Waiting for a parent to approve</div>}
      </div>
    </div>
  );
}

export default function ChildPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "var(--muted)" }}>Loading…</div>
      </div>
    }>
      <ChildViewContent />
    </Suspense>
  );
}
