"use client";

import { useSession } from "next-auth/react";
import UpgradeGate from "@/components/UpgradeGate";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import HamburgerMenu from "@/components/HamburgerMenu";
import DeletionRequestsCard from "@/components/DeletionRequestsCard";
import { useM } from "@/lib/i18n/client";
import StarSummary from "@/components/StarSummary";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function IcBack()  { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6"/></svg>; }
function IcPlus()  { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function IcCheck() { return <svg width={18} height={18} viewBox="0 0 24 24" {...STR}><polyline points="20 6 9 17 4 12"/></svg>; }

type ChildSummary = {
  role?: string;
  childId: string;
  childName: string;
  total: number;
  done: number;
  pending: number;
  missed: number;
  chores: { id: string; name: string; requiresApproval: boolean; completion: { status: string } | null }[];
};

type ChildStats = {
  childId: string;
  childName: string;
  last7Days: number;
  thisMonth: number;
  lastMonth: number;
  thisYear: number;
};

type TrialInfo = {
  status: "NO_HOUSEHOLD" | "NO_TRIAL" | "TRIAL" | "TRIAL_EXPIRED" | "PRO";
  isPro: boolean;
  trialActive: boolean;
  trialExpired: boolean;
  daysLeft: number;
  trialChildId: string | null;
  isAdult: boolean;
  householdId?: string;
  childMembers: { id: string; name: string }[];
};

export default function FamilyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const msg = useM();
  const t = msg.chores;
  const [starsKey, setStarsKey] = useState(0);

  const [trial, setTrial] = useState<TrialInfo | null>(null);
  const [summary, setSummary] = useState<ChildSummary[]>([]);
  const [stats, setStats] = useState<ChildStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  // 2026-10-04: chores could not be removed at all, and chores belonging to
  // nobody (or someone who left the family) were invisible.
  const [orphans, setOrphans] = useState<{ id: string; name: string }[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function removeChore(id: string, name: string) {
    if (!window.confirm(t.removeConfirm(name))) return;
    setRemovingId(id);
    try {
      const res = await fetch(`/api/reminders/${id}`, { method: "DELETE" });
      if (res.ok) await fetchSummary();
    } catch (e) { console.error(e); }
    finally { setRemovingId(null); }
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchTrial();
    }
  }, [status]);

  async function fetchTrial() {
    setLoading(true);
    try {
      const res = await fetch("/api/family/trial");
      if (res.ok) {
        const data = await res.json();
        setTrial(data);
        // 2026-09-28 (row 43): chores can belong to adults too, so load the
        // week even when the family has no children.
        if (data.trialActive || data.isPro) {
          setSelectedChild(data.childMembers?.[0]?.id ?? "");
          fetchSummary();
          fetchStats();
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function fetchSummary() {
    try {
      const res = await fetch("/api/family/week");
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary ?? []);
        setOrphans(data.orphans ?? []);
      }
    } catch (e) { console.error(e); }
  }

  async function fetchStats() {
    try {
      const res = await fetch("/api/family/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats ?? []);
      }
    } catch (e) { console.error(e); }
  }

  // 2026-09-28: an adult can tick off any chore (their own, or on a child's
  // behalf) straight from the overview.
  async function handleToggleDone(choreId: string) {
    setApprovingId(choreId);
    try {
      await fetch(`/api/family/chores/${choreId}/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      await fetchSummary();
      await fetchStats();
      setStarsKey((k) => k + 1);
    } catch (e) { console.error(e); }
    finally { setApprovingId(null); }
  }

  async function handleApprove(choreId: string, childId: string, action: "approve" | "reopen") {
    setApprovingId(choreId);
    try {
      await fetch(`/api/family/chores/${choreId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, childId }),
      });
      await fetchSummary();
      await fetchStats();
      setStarsKey((k) => k + 1);
    } catch (e) { console.error(e); }
    finally { setApprovingId(null); }
  }

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "var(--muted)", fontSize: 15 }}>{t.loading}</div>
      </div>
    );
  }

  // API error or db not yet migrated
  if (!trial) {
    return (
      <Screen title={t.family} onBack={() => router.push("/dashboard")}>
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚙️</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)", margin: "0 0 10px" }}>{t.settingUp}</h2>
          <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, marginBottom: 24 }}>
            {t.dbNeedsUpdate1}<strong>npm run db:push</strong>{t.dbNeedsUpdate2}
          </p>
          <button onClick={fetchTrial}
            style={{ background: "var(--ink)", color: "#fff", border: "none", borderRadius: 50, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
            {msg.common.retry}
          </button>
        </div>
      </Screen>
    );
  }

  const statusStyle = (s: "done" | "pending" | "missed") => {
    if (s === "done")    return { bg: "var(--tint-success)", color: "var(--success)", label: t.done };
    if (s === "pending") return { bg: "var(--tint-warning)", color: "var(--warning)", label: t.waiting };
    return                      { bg: "var(--tint-danger)", color: "var(--danger)", label: t.notDone };
  };

  // ── No household ───────────────────────────────────────────────
  if (trial?.status === "NO_HOUSEHOLD") {
    return (
      <Screen title={t.family} onBack={() => router.push("/dashboard")}>
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--fg)", margin: "0 0 10px" }}>{t.setUpHousehold}</h2>
          <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, marginBottom: 28 }}>
            {t.needsHousehold}
          </p>
          <Link href="/profile" style={btnStyle("var(--ink)")}>{t.goToSettings}</Link>
        </div>
      </Screen>
    );
  }

  // ── Free (never tried, or trial ended) ───────────────────────
  // 2026-09-28: chores/child accounts are Pro. One shared gate for "start the
  // 14-day trial" / "trial ended — upgrade" (components/UpgradeGate.tsx).
  if ((trial?.status === "NO_TRIAL" || trial?.status === "TRIAL_EXPIRED") && !trial.isPro) {
    return (
      <Screen title={t.title} onBack={() => router.push("/dashboard")}>
        <UpgradeGate
          feature={t.title}
          emoji="🧹"
          description={t.gateDescription}
          onUnlocked={() => { setTrial(null); fetchTrial(); }}
        />
        {trial.status === "TRIAL_EXPIRED" && (
          <div style={{ textAlign: "center" }}>
            <button onClick={() => router.push("/dashboard/family/child")}
              style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
              {t.viewHistory}
            </button>
          </div>
        )}
      </Screen>
    );
  }

  // ── Trial active or Pro: main overview ────────────────────────
  const isActive = trial?.trialActive || trial?.isPro;
  const viewChild = summary.find(c => c.childId === selectedChild) ?? summary[0];
  const viewStats = stats.find(s => s.childId === (viewChild?.childId ?? selectedChild));

  return (
    <Screen title={t.title} onBack={() => router.push("/dashboard")}>
      {/* Trial banner */}
      {trial?.trialActive && !trial.isPro && (
        <div style={{ background: "var(--tint-warning)", border: "1px solid var(--tint-warning)", borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--warning)" }}>{t.trialActive}</div>
            <div style={{ fontSize: 12, color: "var(--warning)", marginTop: 2 }}>{t.daysRemaining(trial.daysLeft)}</div>
          </div>
          <Link href="/upgrade" style={{ background: "var(--ink)", color: "#fff", border: "none", borderRadius: 50, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT, textDecoration: "none" }}>
            {t.upgrade}
          </Link>
        </div>
      )}

      {/* Child tabs */}
      {summary.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
          {summary.map(c => (
            <button key={c.childId} onClick={() => setSelectedChild(c.childId)}
              style={{
                flexShrink: 0, padding: "8px 16px", borderRadius: 50, fontSize: 13, fontWeight: 700,
                background: selectedChild === c.childId ? "var(--ink)" : "var(--surface)",
                color: selectedChild === c.childId ? "#fff" : "var(--fg-2)",
                border: selectedChild === c.childId ? "none" : "1.5px solid var(--border)",
                cursor: "pointer", fontFamily: FONT,
              }}>
              {c.childName}
            </button>
          ))}
        </div>
      )}

      <DeletionRequestsCard />
      {/* 2026-09-28 (test round, row 44): adding people used to be split —
          children here, adults only deep in Settings. Both now live on one
          "Family members" page, reachable from here, Home and the menu. */}
      <Link href="/dashboard/family/members" style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%", boxSizing: "border-box",
        background: "var(--surface)", border: "1.5px dashed var(--accent-border)", borderRadius: 14,
        padding: "12px 16px", color: "var(--accent)", fontSize: 13, fontWeight: 700,
        textDecoration: "none", fontFamily: FONT, marginBottom: 16,
      }}>
        <IcPlus /> {t.addFamilyMember}
      </Link>

      {/* Week summary card */}
      {viewChild && (
        <div style={{ background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", padding: "20px", marginBottom: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--fg)" }}>{viewChild.childName}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{t.thisWeek}</div>
            </div>
            {(viewChild.role ?? "CHILD") === "CHILD" && (
              <Link href={`/dashboard/family/child?id=${viewChild.childId}`}
                style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>
                {t.childView}
              </Link>
            )}
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[
              { value: `${viewChild.done}/${viewChild.total}`, label: t.done, bg: "var(--tint-success)", color: "var(--success)" },
              { value: viewChild.pending, label: t.waiting, bg: "var(--tint-warning)", color: "var(--warning)" },
              { value: viewChild.missed, label: t.notDone, bg: "var(--tint-danger)", color: "var(--danger)" },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: s.color, fontWeight: 600, marginTop: 4, opacity: 0.8 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* 2026-10-09: stars, streak and optional pocket money. */}
          <StarSummary userId={viewChild.childId} refreshKey={starsKey} showSetting />

          {/* Chore list */}
          {viewChild.chores.map((chore, i) => {
            const st = chore.completion?.status;
            const isDone = st === "APPROVED" || st === "DONE";
            const isPending = st === "PENDING_APPROVAL";
            const style = isDone ? statusStyle("done") : isPending ? statusStyle("pending") : statusStyle("missed");
            return (
              <div key={chore.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                borderTop: i === 0 ? "none" : "1px solid var(--border-soft)",
                padding: "12px 0",
              }}>
                {/* 2026-10-07: tap the name to open and edit the chore */}
                <Link href={`/dashboard/family/new?edit=${chore.id}`} style={{ flex: 1, minWidth: 0, textDecoration: "none" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: isDone ? "var(--muted)" : "var(--fg)", textDecoration: isDone ? "line-through" : "none" }}>
                    {chore.name}
                  </div>
                  {chore.requiresApproval && (
                    <div style={{ fontSize: 11, color: "var(--subtle)", marginTop: 2 }}>{t.requiresApproval}</div>
                  )}
                </Link>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => !isPending && handleToggleDone(chore.id)}
                    disabled={approvingId === chore.id || isPending}
                    title={isDone ? t.markNotDone : t.markDone}
                    style={{ padding: "4px 10px", borderRadius: 50, fontSize: 11, fontWeight: 700, background: style.bg, color: style.color, border: "none", cursor: isPending ? "default" : "pointer", fontFamily: FONT }}>
                    {isDone ? t.doneCheck : isPending ? style.label : t.markDoneBtn}
                  </button>
                  {isPending && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => handleApprove(chore.id, viewChild.childId, "approve")}
                        disabled={approvingId === chore.id}
                        style={{ background: "var(--tint-success)", color: "var(--success)", border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                        ✓
                      </button>
                      <button onClick={() => handleApprove(chore.id, viewChild.childId, "reopen")}
                        disabled={approvingId === chore.id}
                        style={{ background: "var(--tint-danger)", color: "var(--danger)", border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                        ✕
                      </button>
                    </div>
                  )}
                  <button onClick={() => removeChore(chore.id, chore.name)} disabled={removingId === chore.id} aria-label={t.removeChore}
                    style={{ background: "none", border: "none", color: "var(--faint)", fontSize: 18, cursor: "pointer", padding: 4, lineHeight: 1 }}>×</button>
                </div>
              </div>
            );
          })}

          {viewChild.chores.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 0", color: "var(--subtle)", fontSize: 13 }}>
              {t.noChoresAssigned}{" "}
              <Link href="/dashboard/family/new" style={{ color: "var(--accent)", fontWeight: 600 }}>{t.addOne}</Link>
            </div>
          )}
        </div>
      )}

      {orphans.length > 0 && (
        <div style={{ background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", padding: "16px 20px", marginBottom: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", marginBottom: 2 }}>{t.notAssigned}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>{t.notAssignedHint}</div>
          {orphans.map((c, i) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i === 0 ? "none" : "1px solid var(--border-soft)" }}>
              <Link href={`/dashboard/family/new?edit=${c.id}`} style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--fg)", textDecoration: "none" }}>{c.name}</Link>
              <button onClick={() => removeChore(c.id, c.name)} disabled={removingId === c.id} aria-label={t.removeChore}
                style={{ background: "none", border: "none", color: "var(--faint)", fontSize: 18, cursor: "pointer", padding: 4, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Over-time stats card */}
      {viewChild && viewStats && (
        <div style={{
          background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)",
          padding: "20px", marginBottom: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", marginBottom: 4 }}>
            {t.doneOverTime}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
            {t.tasksCompleted(viewStats.childName)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { value: viewStats.last7Days,  label: t.last7 },
              { value: viewStats.thisMonth,  label: t.thisMonth },
              { value: viewStats.lastMonth,  label: t.lastMonth },
              { value: viewStats.thisYear,   label: t.thisYear },
            ].map(s => (
              <div key={s.label} style={{
                background: "var(--background)", borderRadius: 12, padding: "12px 8px", textAlign: "center",
              }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--fg)", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {isActive && summary.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", marginBottom: 8 }}>{t.noChoresYet}</div>
          <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24, lineHeight: 1.5 }}>
            {t.noChoresBody}
          </div>
          <Link href="/dashboard/family/new" style={btnStyle("var(--ink)")}>{t.createFirst}</Link>
        </div>
      )}

      {/* Add chore — same floating round "+" button used on Reminders/Calendar
          (2026-07-28, replaces the old pill-shaped "Add chore"/"Add training"
          row for visual consistency). Training now lives on its own page
          (/dashboard/training), Shopping list and Add child are reachable
          from the bottom nav/hamburger menu and Profile respectively — this
          page only adds chores now. */}
      {isActive && (
        <Link href="/dashboard/family/new" aria-label={t.addChore} style={{
          position: "fixed", right: 20, bottom: "calc(env(safe-area-inset-bottom, 0px) + 92px)", zIndex: 19,
          width: 52, height: 52, borderRadius: "50%",
          background: "var(--accent-bg)", color: "var(--on-accent)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 14px rgba(28,28,40,0.35)", textDecoration: "none",
        }}>
          <IcPlus />
        </Link>
      )}
    </Screen>
  );
}

// —— Utility ————————————————————————————————————————————————————————————————————————————————————

function btnStyle(bg: string): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    background: bg, color: "#fff", border: "none", borderRadius: 50,
    padding: "14px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer",
    fontFamily: FONT, textDecoration: "none",
  };
}

function Screen({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  const m = useM();
  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT }}>
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} aria-label={m.common.back} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-2)", display: "flex", padding: 4 }}>
            <IcBack />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)", margin: 0, flex: 1 }}>{title}</h1>
          <HamburgerMenu />
        </div>
      </div>
      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "20px 20px 40px" }}>
        {children}
      </main>
    </div>
  );
}
