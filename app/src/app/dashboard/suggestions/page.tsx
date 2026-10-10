"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HamburgerMenu from "@/components/HamburgerMenu";
import { ADMIN_EMAIL } from "@/lib/adminConfig";
import { useI18n } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function IcBack() { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6" /></svg>; }
function IcPlus() { return <svg width={18} height={18} viewBox="0 0 24 24" {...STR}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>; }
function IcUp({ filled }: { filled: boolean }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill={filled ? "var(--accent)" : "none"} stroke={filled ? "var(--accent)" : "currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
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

const STATUS_COLOR: Record<Status, { bg: string; color: string }> = {
  OPEN: { bg: "var(--tint-accent)", color: "var(--violet)" },
  PLANNED: { bg: "var(--tint-warning)", color: "var(--warning)" },
  IN_PROGRESS: { bg: "var(--tint-accent)", color: "var(--accent)" },
  DONE: { bg: "var(--tint-success)", color: "var(--success)" },
  DECLINED: { bg: "var(--surface-3)", color: "var(--subtle)" },
};

export default function SuggestionsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.email === ADMIN_EMAIL;
  const { m: msg, err } = useI18n();
  const t = msg.ideas;

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
        setError(data.error ? err(data.error) : msg.common.somethingWentWrong);
      } else {
        setItems((prev) => (prev ? [data, ...prev] : [data]));
        setTitle(""); setDescription(""); setCategory("NEW_FEATURE"); setShowForm(false);
      }
    } catch {
      setError(msg.common.networkError);
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
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT }}>
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push("/dashboard")} aria-label={msg.common.back} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-2)", display: "flex", padding: 4 }}>
            <IcBack />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)", margin: 0, flex: 1 }}>{t.title}</h1>
          <HamburgerMenu />
        </div>
      </div>

      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "20px 20px 40px", paddingBottom: 96 }}>
        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 18px" }}>
          {t.intro}
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
          {[
            { key: "ALL" as const, label: t.all },
            { key: "IMPROVEMENT" as const, label: t.improvements },
            { key: "NEW_FEATURE" as const, label: t.newFeatures },
          ].map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              flexShrink: 0, borderRadius: 999, padding: "7px 14px", fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer",
              border: filter === f.key ? "none" : "1px solid var(--border)",
              background: filter === f.key ? "var(--accent-bg)" : "var(--surface)",
              color: filter === f.key ? "var(--on-accent)" : "var(--fg-2)",
            }}>
              {f.label}
            </button>
          ))}
        </div>

        {!showForm ? (
          <button onClick={() => setShowForm(true)} style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: "var(--ink)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 0",
            fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT, marginBottom: 20,
          }}>
            <IcPlus /> {t.suggest}
          </button>
        ) : (
          <form onSubmit={submitIdea} style={{ background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", padding: 16, marginBottom: 20, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {(["NEW_FEATURE", "IMPROVEMENT"] as const).map((c) => (
                <button key={c} type="button" onClick={() => setCategory(c)} style={{
                  flex: 1, borderRadius: 10, padding: "9px 0", fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer",
                  border: category === c ? "none" : "1.5px solid var(--border)",
                  background: category === c ? "var(--accent-bg)" : "var(--surface)",
                  color: category === c ? "var(--on-accent)" : "var(--muted)",
                }}>
                  {c === "NEW_FEATURE" ? t.newFeature : t.improvement}
                </button>
              ))}
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.titlePlaceholder} maxLength={140} style={inputStyle()} />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.descriptionPlaceholder} rows={3}
              style={{ ...inputStyle(), marginTop: 8, resize: "vertical" as const, fontFamily: FONT }} />
            {error && <div style={{ fontSize: 13, color: "var(--danger)", marginTop: 10 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button type="button" onClick={() => { setShowForm(false); setError(""); }} style={{ flex: 1, background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 700, color: "var(--muted)", cursor: "pointer", fontFamily: FONT }}>
                {msg.common.cancel}
              </button>
              <button type="submit" disabled={!title.trim() || submitting} style={{ flex: 2, background: "var(--ink)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: !title.trim() ? "not-allowed" : "pointer", opacity: !title.trim() || submitting ? 0.6 : 1, fontFamily: FONT }}>
                {submitting ? t.posting : t.post}
              </button>
            </div>
          </form>
        )}

        {items === null ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--subtle)", fontSize: 13 }}>{t.loading}</div>
        ) : active.length === 0 && closed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 24px" }}>
            <div style={{ marginBottom: 14, display: "flex", justifyContent: "center", color: "var(--faint)" }}><IcBulb /></div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--fg)", margin: "0 0 8px" }}>{t.none}</h2>
            <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6, maxWidth: 320, margin: "0 auto" }}>
              {t.noneBody}
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
                <button onClick={() => setShowClosed((v) => !v)} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT, padding: "6px 2px" }}>
                  {t.showClosed(showClosed, closed.length)}
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
  const t = useI18n().m.ideas;
  return (
    <div style={{ background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)", padding: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.05)", display: "flex", gap: 12 }}>
      <button
        onClick={() => onVote(s.id)}
        aria-label={s.hasVoted ? t.removeVote : t.vote}
        style={{
          flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
          width: 46, height: 46, borderRadius: 12, cursor: "pointer",
          border: s.hasVoted ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
          background: s.hasVoted ? "var(--tint-accent)" : "var(--surface)",
        }}
      >
        <IcUp filled={s.hasVoted} />
        <span style={{ fontSize: 13, fontWeight: 800, color: s.hasVoted ? "var(--accent-strong)" : "var(--fg-2)" }}>{s.voteCount}</span>
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, justifyContent: "space-between" }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--fg)", lineHeight: 1.4 }}>{s.title}</div>
          <span style={{ flexShrink: 0, background: badge.bg, color: badge.color, fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 50 }}>
            {t.status[s.status]}
          </span>
        </div>
        {s.description && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4, lineHeight: 1.5 }}>{s.description}</div>}
        <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
          <span>{s.category === "NEW_FEATURE" ? t.newFeatureTag : t.improvementTag}</span>
          <span>·</span>
          <span>{s.isOwn ? t.you : s.authorName}</span>
          {s.isOwn && s.status === "OPEN" && (
            <>
              <span>·</span>
              <button onClick={() => onDelete(s.id)} style={{ background: "none", border: "none", color: "var(--danger)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT, padding: 0 }}>
                {t.remove}
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
                border: "1px solid var(--border)",
                background: st === s.status ? "var(--ink)" : "var(--surface)",
                color: st === s.status ? "#fff" : "var(--subtle)",
              }}>
                {t.status[st]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1.5px solid var(--border)", fontSize: 15, fontFamily: FONT, outline: "none", boxSizing: "border-box" as const };
}
