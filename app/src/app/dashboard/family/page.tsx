"use client";

import { useSession } from "next-auth/react";
import UpgradeGate from "@/components/UpgradeGate";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import HamburgerMenu from "@/components/HamburgerMenu";
import DeletionRequestsCard from "@/components/DeletionRequestsCard";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function IcBack()  { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6"/></svg>; }
function IcPlus()  { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function IcCheck() { return <svg width={18} height={18} viewBox="0 0 24 24" {...STR}><polyline points="20 6 9 17 4 12"/></svg>; }

type ChildSummary = {
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

  const [trial, setTrial] = useState<TrialInfo | null>(null);
  const [summary, setSummary] = useState<ChildSummary[]>([]);
  const [stats, setStats] = useState<ChildStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  // 2026-09-27: child accounts use email + password now (PIN retired).
  const [newChildEmail, setNewChildEmail] = useState("");
  const [childInviteSentTo, setChildInviteSentTo] = useState<string | null>(null);
  const [addChildError, setAddChildError] = useState("");
  const [addingChild, setAddingChild] = useState(false);

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
        if (data.householdId) setHouseholdId(data.householdId);
        if ((data.trialActive || data.isPro) && data.childMembers?.length > 0) {
          setSelectedChild(data.trialChildId ?? data.childMembers[0]?.id ?? "");
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

  async function createChildProfile() {
    if (!newChildName.trim()) { setAddChildError("Enter a name"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newChildEmail.trim())) { setAddChildError("Enter a valid email address"); return; }
    setAddingChild(true);
    setAddChildError("");
    try {
      const res = await fetch("/api/family/child-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newChildName.trim(), email: newChildEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.householdId) setHouseholdId(data.householdId);
        setShowAddChild(false);
        setChildInviteSentTo(newChildEmail.trim());
        setNewChildName(""); setNewChildEmail("");
        await fetchTrial();
      } else {
        setAddChildError(data.error ?? "Something went wrong");
      }
    } catch { setAddChildError("Network error"); }
    finally { setAddingChild(false); }
  }

  function resetAddChildForm() {
    setShowAddChild(false);
    setNewChildName("");
    setNewChildEmail("");
    setAddChildError("");
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
    } catch (e) { console.error(e); }
    finally { setApprovingId(null); }
  }

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "var(--muted)", fontSize: 15 }}>Loading family…</div>
      </div>
    );
  }

  // API error or db not yet migrated
  if (!trial) {
    return (
      <Screen title="Family" onBack={() => router.push("/dashboard")}>
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚙️</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)", margin: "0 0 10px" }}>Setting up family features</h2>
          <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, marginBottom: 24 }}>
            The database needs to be updated before this feature can be used. Run <strong>npm run db:push</strong> in your project folder, then reload.
          </p>
          <button onClick={fetchTrial}
            style={{ background: "var(--ink)", color: "#fff", border: "none", borderRadius: 50, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
            Try again
          </button>
        </div>
      </Screen>
    );
  }

  const statusStyle = (s: "done" | "pending" | "missed") => {
    if (s === "done")    return { bg: "var(--tint-success)", color: "var(--success)", label: "Done" };
    if (s === "pending") return { bg: "var(--tint-warning)", color: "var(--warning)", label: "Waiting" };
    return                      { bg: "var(--tint-danger)", color: "var(--danger)", label: "Not done" };
  };

  // ── No household ───────────────────────────────────────────────
  if (trial?.status === "NO_HOUSEHOLD") {
    return (
      <Screen title="Family" onBack={() => router.push("/dashboard")}>
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--fg)", margin: "0 0 10px" }}>Set up your household first</h2>
          <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, marginBottom: 28 }}>
            Family responsibilities require a household. Invite your family to get started.
          </p>
          <Link href="/profile" style={btnStyle("var(--ink)")}>Go to settings →</Link>
        </div>
      </Screen>
    );
  }

  // ── Free (never tried, or trial ended) ───────────────────────
  // 2026-09-28: chores/child accounts are Pro. One shared gate for "start the
  // 14-day trial" / "trial ended — upgrade" (components/UpgradeGate.tsx).
  if ((trial?.status === "NO_TRIAL" || trial?.status === "TRIAL_EXPIRED") && !trial.isPro) {
    return (
      <Screen title="Chores" onBack={() => router.push("/dashboard")}>
        <UpgradeGate
          feature="Chores"
          emoji="🧹"
          description="Add your children, give them chores they tick off themselves, and approve them when they're done. Try everything free for 14 days — no card needed."
          onUnlocked={() => { setTrial(null); fetchTrial(); }}
        />
        {trial.status === "TRIAL_EXPIRED" && (
          <div style={{ textAlign: "center" }}>
            <button onClick={() => router.push("/dashboard/family/child")}
              style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
              View history (read only)
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
    <Screen title="Family" onBack={() => router.push("/dashboard")}>
      {/* Trial banner */}
      {trial?.trialActive && !trial.isPro && (
        <div style={{ background: "var(--tint-warning)", border: "1px solid var(--tint-warning)", borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--warning)" }}>Free trial active</div>
            <div style={{ fontSize: 12, color: "var(--warning)", marginTop: 2 }}>{trial.daysLeft} day{trial.daysLeft !== 1 ? "s" : ""} remaining</div>
          </div>
          <Link href="/upgrade" style={{ background: "var(--ink)", color: "#fff", border: "none", borderRadius: 50, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT, textDecoration: "none" }}>
            Upgrade
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

      {/* 2026-08-18: adding a child was only reachable during onboarding
          (the NO_TRIAL activation screen above) — once a trial/Pro household
          reached this main overview there was no way to add another child
          without leaving to Profile, which is exactly the loop Mikael hit
          (School's "add a child" link pointed back here with no way to
          actually do it). Reuses the same showAddChild/AddChildForm/
          createChildProfile already built for onboarding. */}
      <DeletionRequestsCard />
      <div style={{ marginBottom: 16 }}>
        {childInviteSentTo && !showAddChild && (
          <div style={{ fontSize: 13, color: "var(--success)", background: "var(--tint-success)", border: "1px solid var(--tint-success)", borderRadius: 10, padding: "8px 12px", marginBottom: 8, fontWeight: 600 }}>
            ✓ Invite sent to {childInviteSentTo}
          </div>
        )}
        {!showAddChild ? (
          <button onClick={() => setShowAddChild(true)} style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            background: "var(--surface)", border: "1.5px dashed var(--accent-border)", borderRadius: 14,
            padding: "12px 16px", color: "var(--accent)", fontSize: 13, fontWeight: 700,
            cursor: "pointer", fontFamily: FONT,
          }}>
            <IcPlus /> Add child
          </button>
        ) : (
          <AddChildForm
            name={newChildName} setName={setNewChildName}
            email={newChildEmail} setEmail={setNewChildEmail}
            error={addChildError} loading={addingChild}
            onSave={createChildProfile}
            onCancel={resetAddChildForm}
          />
        )}
      </div>

      {/* Week summary card */}
      {viewChild && (
        <div style={{ background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", padding: "20px", marginBottom: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--fg)" }}>{viewChild.childName}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>This week</div>
            </div>
            <Link href={`/dashboard/family/child?id=${viewChild.childId}`}
              style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>
              Child view →
            </Link>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[
              { value: `${viewChild.done}/${viewChild.total}`, label: "Done", bg: "var(--tint-success)", color: "var(--success)" },
              { value: viewChild.pending, label: "Waiting", bg: "var(--tint-warning)", color: "var(--warning)" },
              { value: viewChild.missed, label: "Not done", bg: "var(--tint-danger)", color: "var(--danger)" },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: s.color, fontWeight: 600, marginTop: 4, opacity: 0.8 }}>{s.label}</div>
              </div>
            ))}
          </div>

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
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: isDone ? "var(--muted)" : "var(--fg)", textDecoration: isDone ? "line-through" : "none" }}>
                    {chore.name}
                  </div>
                  {chore.requiresApproval && (
                    <div style={{ fontSize: 11, color: "var(--subtle)", marginTop: 2 }}>Requires approval</div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ padding: "4px 10px", borderRadius: 50, fontSize: 11, fontWeight: 700, background: style.bg, color: style.color }}>
                    {style.label}
                  </span>
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
                </div>
              </div>
            );
          })}

          {viewChild.chores.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 0", color: "var(--subtle)", fontSize: 13 }}>
              No chores assigned yet.{" "}
              <Link href="/dashboard/family/new" style={{ color: "var(--accent)", fontWeight: 600 }}>Add one →</Link>
            </div>
          )}
        </div>
      )}

      {/* Over-time stats card */}
      {viewChild && viewStats && (
        <div style={{
          background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)",
          padding: "20px", marginBottom: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", marginBottom: 4 }}>
            Done over time
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
            Tasks {viewStats.childName} has completed.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { value: viewStats.last7Days,  label: "Last 7 days" },
              { value: viewStats.thisMonth,  label: "This month" },
              { value: viewStats.lastMonth,  label: "Last month" },
              { value: viewStats.thisYear,   label: "This year" },
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
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", marginBottom: 8 }}>No chores yet</div>
          <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24, lineHeight: 1.5 }}>
            Create your first recurring chore for your child.
          </div>
          <Link href="/dashboard/family/new" style={btnStyle("var(--ink)")}>Create first chore</Link>
        </div>
      )}

      {/* Add chore — same floating round "+" button used on Reminders/Calendar
          (2026-07-28, replaces the old pill-shaped "Add chore"/"Add training"
          row for visual consistency). Training now lives on its own page
          (/dashboard/training), Shopping list and Add child are reachable
          from the bottom nav/hamburger menu and Profile respectively — this
          page only adds chores now. */}
      {isActive && (
        <Link href="/dashboard/family/new" aria-label="Add chore" style={{
          position: "fixed", right: 20, bottom: "calc(env(safe-area-inset-bottom, 0px) + 92px)", zIndex: 19,
          width: 52, height: 52, borderRadius: "50%",
          background: "var(--accent-bg)", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 14px rgba(28,28,40,0.35)", textDecoration: "none",
        }}>
          <IcPlus />
        </Link>
      )}
    </Screen>
  );
}

// ── Shared components ──────────────────────────────────────────

type AddChildFormProps = {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  error: string;
  loading: boolean;
  onSave: () => void;
  onCancel: () => void;
};

function AddChildForm({ name, setName, email, setEmail, error, loading, onSave, onCancel }: AddChildFormProps) {
  return (
    <div style={{ background: "var(--surface)", borderRadius: 18, border: "1.5px solid var(--border)", padding: "20px", marginTop: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--fg)", marginBottom: 4 }}>Add child profile</div>
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18, lineHeight: 1.4 }}>
        We email your child a link to confirm the address and choose a password. Use their own email, or an alias of yours like you+emma@gmail.com.
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-2)", display: "block", marginBottom: 6 }}>Name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Emma"
          autoComplete="off"
          style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 15, fontFamily: FONT, outline: "none", boxSizing: "border-box" as const }}
        />
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-2)", display: "block", marginBottom: 6 }}>Email</label>
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="emma@example.com"
          type="email"
          autoComplete="off"
          style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 15, fontFamily: FONT, outline: "none", boxSizing: "border-box" as const }}
        />
      </div>

      {error && (
        <div style={{ fontSize: 13, color: "var(--danger)", background: "var(--tint-danger)", border: "1px solid var(--border-danger)", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onSave}
          disabled={loading}
          style={{ flex: 1, background: "var(--ink)", color: "#fff", border: "none", borderRadius: 50, padding: "13px", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: FONT, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Sending…" : "Add & send invite"}
        </button>
        <button
          onClick={onCancel}
          style={{ padding: "13px 20px", borderRadius: 50, background: "var(--surface-3)", border: "none", fontSize: 13, fontWeight: 700, color: "var(--fg-2)", cursor: "pointer", fontFamily: FONT }}>
          Cancel
        </button>
      </div>
    </div>
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
  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT }}>
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-2)", display: "flex", padding: 4 }}>
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
