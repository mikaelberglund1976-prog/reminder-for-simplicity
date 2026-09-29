
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import SchoolSection from "@/components/SchoolSection";
import HamburgerMenu from "@/components/HamburgerMenu";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcBack()  { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6"/></svg>; }
function IcCheck() { return <svg width={22} height={22} viewBox="0 0 24 24" {...STR} strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>; }

type Chore = {
  id: string;
  assignedTo?: string | null;
  name: string;
  note: string | null;
  requiresApproval: boolean;
  completions: { id: string; status: string }[];
};

function ChildViewContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get("id") ?? session?.user?.id;

  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [childName, setChildName] = useState("My chores");
  const [access, setAccess] = useState<string>("TRIAL");
  // 2026-09-28 (row 38): the child's start page shows their own activities
  // too, so everything that's theirs is in one place.
  const [activities, setActivities] = useState<{ id: string; name: string; note: string | null; recurrence: string; choreRecurrenceDays: string | null; assignedTo?: string | null }[]>([]);

  // Add-chore form (self-service for kids)
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNote, setNewNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);


  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") { fetchChores(); }
  }, [status, childId]);

  async function fetchChores() {
    setLoading(true);
    try {
      const res = await fetch("/api/family/chores");
      if (res.ok) {
        const data = await res.json();
        setAccess(data.access ?? "TRIAL");
        const all: Chore[] = data.chores ?? [];

        // 2026-09-28: when a parent opens "Child view" for one child, only
        // that child's chores (the old filter had a stray `|| true`, so a
        // parent saw every chore in the family here).
        const filtered = childId
          ? all.filter((c) => c.assignedTo === childId)
          : all;

        setChores(filtered);
      }

      const aRes = await fetch("/api/family/chores?category=TRAINING");
      if (aRes.ok) {
        const aData = await aRes.json();
        const list = (aData.chores ?? []) as typeof activities;
        setActivities(childId ? list.filter((a) => a.assignedTo === childId) : list);
      }

      // Get child name
      const tRes = await fetch("/api/family/trial");
      if (tRes.ok) {
        const tData = await tRes.json();
        const found = (tData.childMembers ?? []).find((m: { id: string; name: string }) => m.id === childId);
        // 2026-09-27: this is the child's home screen (homework + chores),
        // so "My week" when it's their own — not "Elsa's chores".
        if (childId === session?.user?.id) setChildName("My week");
        else if (found) setChildName(found.name + "'s week");
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleAddChore(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/family/chores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          note: newNote.trim() || undefined,
          recurrence: "WEEKLY",
        }),
      });
      if (res.ok) {
        setNewName("");
        setNewNote("");
        setShowAdd(false);
        await fetchChores();
      } else {
        const data = await res.json().catch(() => ({}));
        setAddError(data?.error ?? "Could not add chore");
      }
    } catch (err) {
      console.error(err);
      setAddError("Something went wrong");
    } finally {
      setAdding(false);
    }
  }

  async function toggleChore(choreId: string) {
    setToggling(choreId);
    try {
      const res = await fetch(`/api/family/chores/${choreId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) await fetchChores();
    } catch (e) { console.error(e); }
    finally { setToggling(null); }
  }

  const today = new Date();
  const dayName = today.toLocaleDateString("en-GB", { weekday: "long" });
  const dateStr = today.toLocaleDateString("en-GB", { day: "numeric", month: "long" });

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "var(--muted)", fontSize: 15 }}>Loading chores…</div>
      </div>
    );
  }

  const done   = chores.filter(c => c.completions.some(cp => cp.status === "APPROVED" || cp.status === "DONE"));
  const pending = chores.filter(c => c.completions.some(cp => cp.status === "PENDING_APPROVAL"));
  const todo   = chores.filter(c => c.completions.length === 0);

  const pct = chores.length > 0 ? Math.round((done.length / chores.length) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-2)", display: "flex", padding: 4 }}>
            <IcBack />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)", margin: 0, flex: 1 }}>{childName}</h1>
          <HamburgerMenu />
        </div>
      </div>

      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "20px 20px 0" }}>
        {/* 2026-09-27: homework & tests FIRST — the first thing a child sees after logging in */}
        <SchoolSection mode="child" onlyUserId={childId && childId !== session?.user?.id ? childId : undefined} />

        {activities.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#D85A30", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              🎯 My activities · {activities.length}
            </div>
            <div style={{ background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", overflow: "hidden" }}>
              {activities.map((a, i) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid var(--border-soft)" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)", flex: 1, minWidth: 0 }}>{a.name}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", flexShrink: 0 }}>{scheduleText(a)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Date + progress */}
        <div style={{ background: "var(--hero-grad)", borderRadius: 20, padding: "20px 22px", marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: 600, marginBottom: 4 }}>
            {dayName}, {dateStr}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 16 }}>
            {chores.length === 0 ? "No chores yet!" :
             pct === 100 ? "🎉 All done!" :
             done.length === 0 ? "Let's get started!" :
             `${done.length} of ${chores.length} done`}
          </div>
          {chores.length > 0 && (
            <div>
              <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 50, height: 8, overflow: "hidden" }}>
                <div style={{ background: "var(--accent-bg)", height: "100%", width: `${pct}%`, borderRadius: 50, transition: "width 0.4s" }} />
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>{pct}% complete this week</div>
            </div>
          )}
        </div>

        {access === "LOCKED" && (
          <div style={{ background: "var(--tint-warning)", border: "1px solid #FDE68A", borderRadius: 14, padding: "16px", marginBottom: 20, textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--warning)", marginBottom: 6 }}>Trial period ended</div>
            <div style={{ fontSize: 13, color: "var(--warning)" }}>Upgrade to Pro to continue using family chores.</div>
          </div>
        )}

        {/* Add chore — self-service for kids */}
        {access !== "LOCKED" && (
          <div style={{ marginBottom: 16 }}>
            {!showAdd ? (
              <button
                onClick={() => { setShowAdd(true); setAddError(null); }}
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: 14,
                  background: "var(--surface)", border: "1.5px dashed var(--border)", color: "var(--accent-strong)",
                  fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
                Add a chore
              </button>
            ) : (
              <form onSubmit={handleAddChore} style={{
                background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)",
                padding: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", marginBottom: 10 }}>
                  New chore
                </div>
                <input
                  type="text"
                  placeholder="What will you do?"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={adding}
                  autoFocus
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 12,
                    background: "var(--background)", border: "1.5px solid var(--border)",
                    fontSize: 14, color: "var(--fg)", outline: "none",
                    fontFamily: FONT, boxSizing: "border-box", marginBottom: 10,
                  }}
                />
                <input
                  type="text"
                  placeholder="Note (optional)"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  disabled={adding}
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 12,
                    background: "var(--background)", border: "1.5px solid var(--border)",
                    fontSize: 14, color: "var(--fg)", outline: "none",
                    fontFamily: FONT, boxSizing: "border-box", marginBottom: 10,
                  }}
                />
                {addError && (
                  <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{addError}</div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => { setShowAdd(false); setNewName(""); setNewNote(""); setAddError(null); }}
                    disabled={adding}
                    style={{
                      flex: 1, padding: "12px 14px", borderRadius: 12,
                      background: "var(--background)", border: "1.5px solid var(--border)",
                      color: "var(--fg-2)", fontSize: 14, fontWeight: 700,
                      cursor: adding ? "not-allowed" : "pointer", fontFamily: FONT,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adding || !newName.trim()}
                    style={{
                      flex: 1, padding: "12px 14px", borderRadius: 12,
                      background: !newName.trim() || adding ? "#9AB0DB" : "var(--ink)",
                      border: "none", color: "#fff", fontSize: 14, fontWeight: 700,
                      cursor: adding || !newName.trim() ? "not-allowed" : "pointer",
                      fontFamily: FONT,
                    }}
                  >
                    {adding ? "Adding…" : "Add chore"}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10, textAlign: "center" }}>
                  A parent will approve it when you mark it done.
                </div>
              </form>
            )}
          </div>
        )}

        {/* To-do chores */}
        {todo.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              To do · {todo.length}
            </div>
            <div style={{ background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
              {todo.map((chore, i) => (
                <ChoreCard key={chore.id} chore={chore} state="todo" isFirst={i === 0}
                  loading={toggling === chore.id}
                  onToggle={() => access !== "LOCKED" && toggleChore(chore.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Pending approval */}
        {pending.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--warning)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Waiting for approval · {pending.length}
            </div>
            <div style={{ background: "var(--surface)", borderRadius: 18, border: "1px solid #FDE68A", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
              {pending.map((chore, i) => (
                <ChoreCard key={chore.id} chore={chore} state="pending" isFirst={i === 0}
                  loading={toggling === chore.id}
                  onToggle={() => access !== "LOCKED" && toggleChore(chore.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Done */}
        {done.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--success)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Done · {done.length}
            </div>
            <div style={{ background: "var(--surface)", borderRadius: 18, border: "1px solid var(--tint-success)", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
              {done.map((chore, i) => (
                <ChoreCard key={chore.id} chore={chore} state="done" isFirst={i === 0}
                  loading={toggling === chore.id}
                  onToggle={() => access !== "LOCKED" && toggleChore(chore.id)} />
              ))}
            </div>
          </div>
        )}

        {chores.length === 0 && access !== "LOCKED" && !showAdd && (
          <div style={{ textAlign: "center", padding: "40px 24px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", marginBottom: 8 }}>No chores yet</div>
            <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>
              Tap <strong>Add a chore</strong> above to get started.
            </div>
          </div>
        )}
        {/* 2026-09-29 (GDPR, launch list row 15): what the app keeps about
            a child, in words a child understands. */}
        <details style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "12px 16px", margin: "24px 0 0", fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.55 }}>
          <summary style={{ fontWeight: 700, color: "var(--fg)", cursor: "pointer" }}>🔒 What does the app save about me?</summary>
          <ul style={{ margin: "10px 0 4px", paddingLeft: 18 }}>
            <li>Your name, your email and your password (locked so nobody can read it).</li>
            <li>Your homework, tests, chores, activities, wishlist — and your photo if someone adds one.</li>
            <li>The grown-ups in your family can see it. Other kids and other families can&apos;t.</li>
            <li>We never sell it and you never see ads.</li>
            <li>If you want something removed, ask a parent — they can change or delete it.</li>
          </ul>
          <a href="/privacy" style={{ color: "var(--accent)", fontWeight: 700, fontSize: 12.5 }}>The long version for grown-ups →</a>
        </details>
      </main>
    </div>
  );
}

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

function ChoreCard({ chore, state, isFirst, loading, onToggle }: {
  chore: Chore;
  state: "todo" | "pending" | "done";
  isFirst: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  const isDone = state === "done";
  const isPending = state === "pending";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
      borderTop: isFirst ? "none" : "1px solid var(--border-soft)",
    }}>
      {/* Check button */}
      <button onClick={onToggle} disabled={loading}
        style={{
          width: 36, height: 36, borderRadius: "50%", border: "none", cursor: loading ? "wait" : "pointer",
          background: isDone ? "var(--tint-success)" : isPending ? "var(--tint-warning)" : "var(--surface-3)",
          color: isDone ? "var(--success)" : isPending ? "var(--warning)" : "var(--faint)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, transition: "all 0.15s",
        }}>
        {isDone || isPending ? <IcCheck /> : (
          <svg width={22} height={22} viewBox="0 0 24 24" {...STR} strokeWidth={2}><circle cx="12" cy="12" r="9"/></svg>
        )}
      </button>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 15, fontWeight: 700,
          color: isDone ? "var(--subtle)" : "var(--fg)",
          textDecoration: isDone ? "line-through" : "none",
          lineHeight: 1.3,
        }}>
          {chore.name}
        </div>
        {chore.note && !isDone && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{chore.note}</div>
        )}
        {isPending && (
          <div style={{ fontSize: 11, color: "var(--warning)", fontWeight: 600, marginTop: 3 }}>⏳ Waiting for parent approval</div>
        )}
      </div>

      {/* Status badge */}
      {state !== "todo" && (
        <div style={{
          padding: "4px 10px", borderRadius: 50, fontSize: 11, fontWeight: 700, flexShrink: 0,
          background: isDone ? "var(--tint-success)" : "var(--tint-warning)",
          color: isDone ? "var(--success)" : "var(--warning)",
        }}>
          {isDone ? "✓ Done" : "Waiting"}
        </div>
      )}
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
