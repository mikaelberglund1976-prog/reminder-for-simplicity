
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcBack()  { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6"/></svg>; }
function IcCheck() { return <svg width={22} height={22} viewBox="0 0 24 24" {...STR} strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>; }

type Chore = {
  id: string;
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
    if (status === "authenticated") fetchChores();
  }, [status, childId]);

  async function fetchChores() {
    setLoading(true);
    try {
      const res = await fetch("/api/family/chores");
      if (res.ok) {
        const data = await res.json();
        setAccess(data.access ?? "TRIAL");
        const all: Chore[] = data.chores ?? [];

        // If viewing a specific child, filter; otherwise show current user's
        const filtered = childId
          ? all.filter((c: Chore & { assignedTo?: string }) => (c as Record<string, unknown>).assignedTo === childId || true)
          : all;

        setChores(filtered);
      }

      // Get child name
      const tRes = await fetch("/api/family/trial");
      if (tRes.ok) {
        const tData = await tRes.json();
        const found = (tData.childMembers ?? []).find((m: { id: string; name: string }) => m.id === childId);
        if (found) setChildName(found.name + "'s chores");
        else if (childId === session?.user?.id) setChildName("My chores");
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
      <div style={{ minHeight: "100vh", background: "#F5F6FA", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "#8B90A4", fontSize: 15 }}>Loading chores…</div>
      </div>
    );
  }

  const done   = chores.filter(c => c.completions.some(cp => cp.status === "APPROVED" || cp.status === "DONE"));
  const pending = chores.filter(c => c.completions.some(cp => cp.status === "PENDING_APPROVAL"));
  const todo   = chores.filter(c => c.completions.length === 0);

  const pct = chores.length > 0 ? Math.round((done.length / chores.length) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#F5F6FA", fontFamily: FONT, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E8EDF4", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "#4B5563", display: "flex", padding: 4 }}>
            <IcBack />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: 0, flex: 1 }}>{childName}</h1>
        </div>
      </div>

      <main style={{ maxWidth: 480, margin: "0 auto", padding: "20px 20px 0" }}>
        {/* Date + progress */}
        <div style={{ background: "linear-gradient(135deg, #1A2340 0%, #2C3E6E 100%)", borderRadius: 20, padding: "20px 22px", marginBottom: 20 }}>
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
                <div style={{ background: "#5B9CF5", height: "100%", width: `${pct}%`, borderRadius: 50, transition: "width 0.4s" }} />
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>{pct}% complete this week</div>
            </div>
          )}
        </div>

        {access === "LOCKED" && (
          <div style={{ background: "#FFF9E6", border: "1px solid #FDE68A", borderRadius: 14, padding: "16px", marginBottom: 20, textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#92400E", marginBottom: 6 }}>Trial period ended</div>
            <div style={{ fontSize: 13, color: "#B45309" }}>Upgrade to Pro to continue using family chores.</div>
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
                  background: "#fff", border: "1.5px dashed #C7D2E3", color: "#3B4B7A",
                  fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
                Add a chore
              </button>
            ) : (
              <form onSubmit={handleAddChore} style={{
                background: "#fff", borderRadius: 18, border: "1px solid #E8EDF4",
                padding: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1A2340", marginBottom: 10 }}>
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
                    background: "#F5F6FA", border: "1.5px solid #E8EDF4",
                    fontSize: 14, color: "#1A2340", outline: "none",
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
                    background: "#F5F6FA", border: "1.5px solid #E8EDF4",
                    fontSize: 14, color: "#1A2340", outline: "none",
                    fontFamily: FONT, boxSizing: "border-box", marginBottom: 10,
                  }}
                />
                {addError && (
                  <div style={{ fontSize: 12, color: "#D94F4F", marginBottom: 10 }}>{addError}</div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => { setShowAdd(false); setNewName(""); setNewNote(""); setAddError(null); }}
                    disabled={adding}
                    style={{
                      flex: 1, padding: "12px 14px", borderRadius: 12,
                      background: "#F5F6FA", border: "1.5px solid #E8EDF4",
                      color: "#4B5563", fontSize: 14, fontWeight: 700,
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
                      background: !newName.trim() || adding ? "#9AB0DB" : "#1A2340",
                      border: "none", color: "#fff", fontSize: 14, fontWeight: 700,
                      cursor: adding || !newName.trim() ? "not-allowed" : "pointer",
                      fontFamily: FONT,
                    }}
                  >
                    {adding ? "Adding…" : "Add chore"}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: "#8B90A4", marginTop: 10, textAlign: "center" }}>
                  A parent will approve it when you mark it done.
                </div>
              </form>
            )}
          </div>
        )}

        {/* To-do chores */}
        {todo.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              To do · {todo.length}
            </div>
            <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #E8EDF4", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
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
            <div style={{ fontSize: 12, fontWeight: 700, color: "#B45309", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Waiting for approval · {pending.length}
            </div>
            <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #FDE68A", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
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
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1E7D52", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Done · {done.length}
            </div>
            <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #D4F4E6", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
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
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1A2340", marginBottom: 8 }}>No chores yet</div>
            <div style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.5 }}>
              Tap <strong>Add a chore</strong> above to get started.
            </div>
          </div>
        )}
      </main>
    </div>
  );
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
      borderTop: isFirst ? "none" : "1px solid #F0F3F8",
    }}>
      {/* Check button */}
      <button onClick={onToggle} disabled={loading}
        style={{
          width: 36, height: 36, borderRadius: "50%", border: "none", cursor: loading ? "wait" : "pointer",
          background: isDone ? "#D4F4E6" : isPending ? "#FFF3CC" : "#F0F3FA",
          color: isDone ? "#1E7D52" : isPending ? "#B45309" : "#C0C5D0",
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
          color: isDone ? "#9CA3AF" : "#0F172A",
          textDecoration: isDone ? "line-through" : "none",
          lineHeight: 1.3,
        }}>
          {chore.name}
        </div>
        {chore.note && !isDone && (
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 3 }}>{chore.note}</div>
        )}
        {isPending && (
          <div style={{ fontSize: 11, color: "#B45309", fontWeight: 600, marginTop: 3 }}>⏳ Waiting for parent approval</div>
        )}
      </div>

      {/* Status badge */}
      {state !== "todo" && (
        <div style={{
          padding: "4px 10px", borderRadius: 50, fontSize: 11, fontWeight: 700, flexShrink: 0,
          background: isDone ? "#D4F4E6" : "#FFF3CC",
          color: isDone ? "#1E7D52" : "#B45309",
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
      <div style={{ minHeight: "100vh", background: "#F5F6FA", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "#8B90A4" }}>Loading…</div>
      </div>
    }>
      <ChildViewContent />
    </Suspense>
  );
}
