"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HamburgerMenu from "@/components/HamburgerMenu";
import { ADMIN_EMAIL } from "@/lib/adminConfig";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function IcBack() { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6" /></svg>; }
function IcPlus() { return <svg width={18} height={18} viewBox="0 0 24 24" {...STR}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>; }
function IcUp({ filled }: { filled: boolean }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill={filled ? "#4A5FD5" : "none"} stroke={filled ? "#4A5FD5" : "currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}
function IcBulb() { return <svg width={44} height={44} viewBox="0 0 24 24" {...STR} strokeWidth={1.5}><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.5.4.8 1 .8 1.6V17h6.4v-.7c0-.6.3-1.2.8-1.6A7 7 0 0 0 12 2z" /></svg>; }

type Category = "IMPROVEMENT" | "NEW_FEATURE";
type Status = "OPEN" | "PLANNED" | "IN_PROGRESS" | "DONE" | "DECLINED";

type Suggestion = {
  id: string;
  title: string;
  description: string | null;
  category: Category;
  status: Status;
  createdAt: string;
  authorName: string;
  isOwn: boolean;
  voteCount: number;
  hasVoted: boolean;
};

const STATUS_LABEL: Record<Status, string> = { OPEN: "Open", PLANNED: "Planned", IN_PROGRESS: "In progress", DONE: "Done", DECLINED: "Declined" };
const STATUS_COLOR: Record<Status, { bg: string; color: string }> = {
  OPEN: { bg: "#EDEBFB", color: "#5B4FCF" },
  PLANNED: { bg: "#FFF0E0", color: "#C06010" },
  IN_PROGRESS: { bg: "#DCEAFE", color: "#2560C4" },
  DONE: { bg: "#D4F4E6", color: "#1E7D52" },
  DECLINED: { bg: "#F0F3F8", color: "#9CA3AF" },
};

export default function SuggestionsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  const [filter, setFilter] = useState<"ALL" | Category>("ALL");
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("NEW_FEATURE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showClosed, setShowClosed] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login");
  }, [authStatus, router]);

  async function fetchSuggestions() {
    try {
      const res = await fetch("/api/suggestions");
      const data = await res.json();
      setItems(data.suggestions ?? []);
    } catch (e) {
      console.error(e);
      setItems([]);
    }
  }

  useEffect(() => {
    if (authStatus === "authenticated") fetchSuggestions();
  }, [authStatus]);

  async function submitIdea(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        setItems((prev) => (prev ? [data, ...prev] : [data]));
        setTitle(""); setDescription(""); setCategory("NEW_FEATURE"); setShowForm(false);
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleVote(id: string) {
    if (!items) return;
    const prev = items;
    setItems(prev.map((s) => (s.id === id ? { ...s, hasVoted: !s.hasVoted, voteCount: s.voteCount + (s.hasVoted ? -1 : 1) } : s)));
    try {
      const res = await fetch(`/api/suggestions/${id}/vote`, { method: "POST" });
      if (!res.ok) { setItems(prev); return; }
      const data = await res.json();
      setItems((cur) => (cur ?? prev).map((s) => (s.id === id ? { ...s, hasVoted: data.hasVoted, voteCount: data.voteCount } : s)));
    } catch {
      setItems(prev);
    }
  }

  async function changeStatus(id: string, status: Status) {
    if (!items) return;
    const prev = items;
    setItems(prev.map((s) => (s.id === id ? { ...s, status } : s)));
    try {
      const res = await fetch(`/api/suggestions/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      if (!res.ok) setItems(prev);
    } catch {
      setItems(prev);
    }
  }

  async function removeOwn(id: string) {
    if (!items) return;
    const prev = items;
    setItems(prev.filter((s) => s.id !== id));
    try {
      const res = await fetch(`/api/suggestions/${id}`, { method: "DELETE" });
      if (!res.ok) setItems(prev);
    } catch {
      setItems(prev);
    }
  }

  const filtered = (items ?? []).filter((s) => filter === "ALL" || s.category === filter);
  const active = filtered.filter((s) => s.status !== "DONE" && s.status !== "DECLINED");
  const closed = filtered.filter((s) => s.status === "DONE" || s.status === "DECLINED");

  return (
    <div style={{ minHeight: "100vh", background: "#F5F4F0", fontFamily: FONT }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #E4E3DE", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", cursor: "pointer", color: "#4B5563", display: "flex", padding: 4 }}>
            <IcBack />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: 0, flex: 1 }}>Ideas &amp; voting</h1>
          <HamburgerMenu />
        </div>
      </div>

      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "20px 20px 40px", paddingBottom: 96 }}>
        <p style={{ fontSize: 13, color: "#7C7C8A", lineHeight: 1.6, margin: "0 0 18px" }}>
          Suggest an improvement or a brand-new feature, and vote on what other families want most. Every customer sees the same list — this shapes what we build next.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
          {[
            { key: "ALL" as const, label: "All" },
            { key: "IMPROVEMENT" as const, label: "Improvements" },
            { key: "NEW_FEATURE" as const, label: "New features" },
          ].map((t) => (
            <button key={t.key} onClick={() => setFilter(t.key)} style={{
              flexShrink: 0, borderRadius: 999, padding: "7px 14px", fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer",
              border: filter === t.key ? "none" : "1px solid #E4E3DE",
              background: filter === t.key ? "#4A5FD5" : "#fff",
              color: filter === t.key ? "#fff" : "#4B5563",
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {!showForm ? (
          <button onClick={() => setShowForm(true)} style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: "#1C1C28", color: "#fff", border: "none", borderRadius: 12, padding: "12px 0",
            fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT, marginBottom: 20,
          }}>
            <IcPlus /> Suggest an idea
          </button>
        ) : (
          <form onSubmit={submitIdea} style={{ background: "#fff", borderRadius: 18, border: "1px solid #E4E3DE", padding: 16, marginBottom: 20, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {(["NEW_FEATURE", "IMPROVEMENT"] as const).map((c) => (
                <button key={c} type="button" onClick={() => setCategory(c)} style={{
                  flex: 1, borderRadius: 10, padding: "9px 0", fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer",
                  border: category === c ? "none" : "1.5px solid #E4E3DE",
                  background: category === c ? "#4A5FD5" : "#fff",
                  color: category === c ? "#fff" : "#7C7C8A",
                }}>
                  {c === "NEW_FEATURE" ? "New feature" : "Improvement"}
                </button>
              ))}
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short, clear title" maxLength={140} style={inputStyle()} />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add detail (optional) — what problem would this solve?" rows={3}
              style={{ ...inputStyle(), marginTop: 8, resize: "vertical" as const, fontFamily: FONT }} />
            {error && <div style={{ fontSize: 13, color: "#C44444", marginTop: 10 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button type="button" onClick={() => { setShowForm(false); setError(""); }} style={{ flex: 1, background: "#fff", border: "1.5px solid #E4E3DE", borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 700, color: "#7C7C8A", cursor: "pointer", fontFamily: FONT }}>
                Cancel
              </button>
              <button type="submit" disabled={!title.trim() || submitting} style={{ flex: 2, background: "#1C1C28", color: "#fff", border: "none", borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: !title.trim() ? "not-allowed" : "pointer", opacity: !title.trim() || submitting ? 0.6 : 1, fontFamily: FONT }}>
                {submitting ? "Posting…" : "Post idea"}
              </button>
            </div>
          </form>
        )}

        {items === null ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 13 }}>Loading…</div>
        ) : active.length === 0 && closed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 24px" }}>
            <div style={{ marginBottom: 14, display: "flex", justifyContent: "center", color: "#CBD5E1" }}><IcBulb /></div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: "#0F172A", margin: "0 0 8px" }}>No ideas yet</h2>
            <p style={{ fontSize: 13.5, color: "#7C7C8A", lineHeight: 1.6, maxWidth: 320, margin: "0 auto" }}>
              Be the first to suggest something — every family&apos;s vote helps shape what we build next.
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {active.map((s) => (
                <SuggestionCard key={s.id} s={s} isAdmin={isAdmin} onVote={toggleVote} onStatusChange={changeStatus} onDelete={removeOwn} />
              ))}
            </div>

            {closed.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <button onClick={() => setShowClosed((v) => !v)} style={{ background: "none", border: "none", color: "#4A5FD5", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT, padding: "6px 2px" }}>
                  {showClosed ? "Hide" : "Show"} shipped &amp; declined ({closed.length})
                </button>
                {showClosed && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                    {closed.map((s) => (
                      <SuggestionCard key={s.id} s={s} isAdmin={isAdmin} onVote={toggleVote} onStatusChange={changeStatus} onDelete={removeOwn} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function SuggestionCard({ s, isAdmin, onVote, onStatusChange, onDelete }: {
  s: Suggestion;
  isAdmin: boolean;
  onVote: (id: string) => void;
  onStatusChange: (id: string, status: Status) => void;
  onDelete: (id: string) => void;
}) {
  const badge = STATUS_COLOR[s.status];
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E4E3DE", padding: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.05)", display: "flex", gap: 12 }}>
      <button
        onClick={() => onVote(s.id)}
        aria-label={s.hasVoted ? "Remove vote" : "Vote for this"}
        style={{
          flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
          width: 46, height: 46, borderRadius: 12, cursor: "pointer",
          border: s.hasVoted ? "1.5px solid #4A5FD5" : "1.5px solid #E4E3DE",
          background: s.hasVoted ? "#EEF0FC" : "#fff",
        }}
      >
        <IcUp filled={s.hasVoted} />
        <span style={{ fontSize: 13, fontWeight: 800, color: s.hasVoted ? "#3A4FC5" : "#4B5563" }}>{s.voteCount}</span>
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, justifyContent: "space-between" }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: "#0F172A", lineHeight: 1.4 }}>{s.title}</div>
          <span style={{ flexShrink: 0, background: badge.bg, color: badge.color, fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 50 }}>
            {STATUS_LABEL[s.status]}
          </span>
        </div>
        {s.description && <div style={{ fontSize: 12.5, color: "#7C7C8A", marginTop: 4, lineHeight: 1.5 }}>{s.description}</div>}
        <div style={{ fontSize: 11, color: "#B0B7C8", marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
          <span>{s.category === "NEW_FEATURE" ? "💡 New feature" : "🔧 Improvement"}</span>
          <span>·</span>
          <span>{s.isOwn ? "You" : s.authorName}</span>
          {s.isOwn && s.status === "OPEN" && (
            <>
              <span>·</span>
              <button onClick={() => onDelete(s.id)} style={{ background: "none", border: "none", color: "#D94F4F", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT, padding: 0 }}>
                Remove
              </button>
            </>
          )}
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" as const }}>
            {(["OPEN", "PLANNED", "IN_PROGRESS", "DONE", "DECLINED"] as Status[]).map((st) => (
              <button key={st} onClick={() => onStatusChange(s.id, st)} disabled={st === s.status} style={{
                fontSize: 10.5, fontWeight: 700, fontFamily: FONT, padding: "4px 9px", borderRadius: 50,
                cursor: st === s.status ? "default" : "pointer",
                border: "1px solid #E4E3DE",
                background: st === s.status ? "#1C1C28" : "#fff",
                color: st === s.status ? "#fff" : "#9CA3AF",
              }}>
                {STATUS_LABEL[st]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1.5px solid #E4E3DE", fontSize: 15, fontFamily: FONT, outline: "none", boxSizing: "border-box" as const };
}
