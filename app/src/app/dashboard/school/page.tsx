"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import HamburgerMenu from "@/components/HamburgerMenu";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function IcBack() { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6"/></svg>; }
function IcLock()  { return <svg width={32} height={32} viewBox="0 0 24 24" {...STR} strokeWidth={1.5}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }

type SchoolItem = {
  id: string;
  name: string;
  note: string | null;
  date: string;
  userId: string;
  assignedUser: { id: string; name: string | null; email: string } | null;
};

type TrialInfo = {
  status: "NO_HOUSEHOLD" | "NO_TRIAL" | "TRIAL" | "TRIAL_EXPIRED" | "PRO";
  isPro: boolean;
  trialActive: boolean;
  childMembers: { id: string; name: string }[];
};

// Dedicated School section — separate from the general Reminders flow and
// separate from Chores, per explicit product direction: parents want a
// single place to see every child's upcoming tests/homework, and children
// need to be able to add their own (see dashboard/family/child for the
// child-facing self-service form). Reuses /api/family/chores?category=SCHOOL,
// which already restricts a logged-in child to only their own items — as an
// adult/parent this same endpoint returns every child's items in the
// household, each with `assignedUser` populated so we can group by child.
// 2026-07-28: next build's static prerender step requires any component that
// calls useSearchParams() to sit inside a <Suspense> boundary — tsc doesn't
// catch this (it's a build/prerender-time check, not a type error), which is
// how this shipped broken once already. Keep the searchParams-reading logic
// in an inner component so the outer default export can wrap it in Suspense.
export default function SchoolPage() {
  return (
    <Suspense fallback={null}>
      <SchoolPageInner />
    </Suspense>
  );
}

function SchoolPageInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  // 2026-07-28: the Calendar's "+" button can land here with a date already
  // chosen (type first, then date, then details) — prefill and open the form
  // right away instead of making the user find "+ Add" again.
  const dateFromQuery = searchParams.get("date");

  const [trial, setTrial] = useState<TrialInfo | null>(null);
  const [items, setItems] = useState<SchoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(!!dateFromQuery);
  const [newName, setNewName] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newDate, setNewDate] = useState(dateFromQuery ?? "");
  const [newChild, setNewChild] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status]);

  async function load() {
    setLoading(true);
    try {
      const tRes = await fetch("/api/family/trial");
      if (tRes.ok) {
        const tData = await tRes.json();
        setTrial(tData);
        if (tData.childMembers?.length && !newChild) setNewChild(tData.childMembers[0].id);
      }
      const res = await fetch("/api/family/chores?category=SCHOOL");
      if (res.ok) {
        const data = await res.json();
        setItems(data.chores ?? []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newChild) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/family/chores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "SCHOOL",
          name: newName.trim(),
          note: newNote.trim() || undefined,
          recurrence: "ONCE",
          assignedTo: newChild,
          startDate: newDate ? new Date(newDate).toISOString() : undefined,
        }),
      });
      if (res.ok) {
        setNewName(""); setNewNote(""); setNewDate(""); setShowAdd(false);
        await load();
      } else {
        const data = await res.json().catch(() => ({}));
        setAddError(data?.error ?? "Could not add");
      }
    } catch (err) {
      console.error(err);
      setAddError("Something went wrong");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/reminders/${id}`, { method: "DELETE" });
      if (res.ok) await load();
    } catch (e) { console.error(e); }
    finally { setDeletingId(null); }
  }

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F5F4F0", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "#7C7C8A", fontSize: 15 }}>Loading school…</div>
      </div>
    );
  }

  if (!trial || trial.status === "NO_HOUSEHOLD") {
    return (
      <Screen onBack={() => router.push("/dashboard")}>
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", margin: "0 0 10px" }}>Set up your household first</h2>
          <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, marginBottom: 28 }}>
            School needs a household with at least one child added.
          </p>
          <Link href="/dashboard/family" style={{ display: "inline-flex", background: "#1C1C28", color: "#fff", borderRadius: 50, padding: "14px 28px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            Go to Family →
          </Link>
        </div>
      </Screen>
    );
  }

  if (trial.status === "TRIAL_EXPIRED" && !trial.isPro) {
    return (
      <Screen onBack={() => router.push("/dashboard")}>
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ color: "#CBD5E1", marginBottom: 20, display: "flex", justifyContent: "center" }}><IcLock /></div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", margin: "0 0 10px" }}>Trial period ended</h2>
          <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>Upgrade to Pro to keep using School.</p>
        </div>
      </Screen>
    );
  }

  const children = trial.childMembers ?? [];
  const byChild = new Map<string, SchoolItem[]>();
  for (const item of items) {
    const key = item.assignedUser?.id ?? "unknown";
    if (!byChild.has(key)) byChild.set(key, []);
    byChild.get(key)!.push(item);
  }
  for (const list of Array.from(byChild.values())) {
    list.sort((a: SchoolItem, b: SchoolItem) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  return (
    <Screen onBack={() => router.push("/dashboard")}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>
          Upcoming tests and homework for the whole family — synced to the calendar automatically. Children can also add their own from their child view.
        </div>
      </div>

      {!showAdd ? (
        <button
          onClick={() => { setShowAdd(true); setAddError(null); }}
          style={{
            width: "100%", padding: "14px 16px", borderRadius: 14, marginBottom: 20,
            background: "#3730A3", border: "none", color: "#fff",
            fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
          Add a test or homework
        </button>
      ) : (
        <form onSubmit={handleAdd} style={{
          background: "#fff", borderRadius: 18, border: "1px solid #E4E3DE",
          padding: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.04)", marginBottom: 20,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1C1C28", marginBottom: 10 }}>New school item</div>

          {children.length > 1 && (
            <select
              value={newChild}
              onChange={(e) => setNewChild(e.target.value)}
              disabled={adding}
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 12,
                background: "#F5F4F0", border: "1.5px solid #E4E3DE",
                fontSize: 14, color: "#1C1C28", outline: "none",
                fontFamily: FONT, boxSizing: "border-box", marginBottom: 10,
              }}
            >
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          <input
            type="text"
            placeholder="e.g. Maths test"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={adding}
            autoFocus
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 12,
              background: "#F5F4F0", border: "1.5px solid #E4E3DE",
              fontSize: 14, color: "#1C1C28", outline: "none",
              fontFamily: FONT, boxSizing: "border-box", marginBottom: 10,
            }}
          />
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            disabled={adding}
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 12,
              background: "#F5F4F0", border: "1.5px solid #E4E3DE",
              fontSize: 14, color: "#1C1C28", outline: "none",
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
              background: "#F5F4F0", border: "1.5px solid #E4E3DE",
              fontSize: 14, color: "#1C1C28", outline: "none",
              fontFamily: FONT, boxSizing: "border-box", marginBottom: 10,
            }}
          />
          {addError && <div style={{ fontSize: 12, color: "#D94F4F", marginBottom: 10 }}>{addError}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setNewName(""); setNewNote(""); setNewDate(""); setAddError(null); }}
              disabled={adding}
              style={{
                flex: 1, padding: "12px 14px", borderRadius: 12,
                background: "#F5F4F0", border: "1.5px solid #E4E3DE",
                color: "#4B5563", fontSize: 14, fontWeight: 700,
                cursor: adding ? "not-allowed" : "pointer", fontFamily: FONT,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adding || !newName.trim() || !newChild}
              style={{
                flex: 1, padding: "12px 14px", borderRadius: 12,
                background: !newName.trim() || adding ? "#B3ACDD" : "#3730A3",
                border: "none", color: "#fff", fontSize: 14, fontWeight: 700,
                cursor: adding || !newName.trim() ? "not-allowed" : "pointer",
                fontFamily: FONT,
              }}
            >
              {adding ? "Adding…" : "Add"}
            </button>
          </div>
        </form>
      )}

      {children.length === 0 && (
        <div style={{ textAlign: "center", padding: "20px 0", color: "#9CA3AF", fontSize: 13 }}>
          Add a child in Family before creating school items.
        </div>
      )}

      {children.map(child => {
        const list = byChild.get(child.id) ?? [];
        return (
          <div key={child.id} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              {child.name} · {list.length}
            </div>
            {list.length === 0 ? (
              <div style={{ fontSize: 13, color: "#9CA3AF", padding: "8px 2px" }}>Nothing logged yet.</div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #E4E3DE", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                {list.map((item, i) => (
                  <div key={item.id} style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
                    borderTop: i === 0 ? "none" : "1px solid #F0F3F8",
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, background: "#EEF0FC",
                      color: "#3730A3", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 15, fontWeight: 800, flexShrink: 0,
                    }}>
                      {new Date(item.date).getDate()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", lineHeight: 1.3 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                        {new Date(item.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                        {item.note ? ` · ${item.note}` : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      style={{
                        background: "none", border: "none", color: "#C0C5D0", fontSize: 18,
                        cursor: deletingId === item.id ? "wait" : "pointer", padding: 6, lineHeight: 1,
                      }}
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </Screen>
  );
}

function Screen({ onBack, children }: { onBack: () => void; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F5F4F0", fontFamily: FONT }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #E4E3DE", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#4B5563", display: "flex", padding: 4 }}>
            <IcBack />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: 0, flex: 1 }}>📚 School</h1>
          <HamburgerMenu />
        </div>
      </div>
      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "20px 20px 40px" }}>
        {children}
      </main>
    </div>
  );
}
