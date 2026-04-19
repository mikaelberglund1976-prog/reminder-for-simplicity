"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function IcBack()  { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6"/></svg>; }
function IcPlus()  { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function IcCheck() { return <svg width={18} height={18} viewBox="0 0 24 24" {...STR}><polyline points="20 6 9 17 4 12"/></svg>; }
function IcLock()  { return <svg width={32} height={32} viewBox="0 0 24 24" {...STR} strokeWidth={1.5}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }

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
  const [starting, setStarting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildPin, setNewChildPin] = useState("");
  const [newChildPinConfirm, setNewChildPinConfirm] = useState("");
  const [addChildError, setAddChildError] = useState("");
  const [addingChild, setAddingChild] = useState(false);
  const [copied, setCopied] = useState(false);

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
    if (!/^[0-9]{4}$/.test(newChildPin)) { setAddChildError("PIN must be exactly 4 digits"); return; }
    if (newChildPin !== newChildPinConfirm) { setAddChildError("PINs do not match"); return; }
    setAddingChild(true);
    setAddChildError("");
    try {
      const res = await fetch("/api/family/child-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newChildName.trim(), pin: newChildPin }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.householdId) setHouseholdId(data.householdId);
        setShowAddChild(false);
        setNewChildName(""); setNewChildPin(""); setNewChildPinConfirm("");
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
    setNewChildPin("");
    setNewChildPinConfirm("");
    setAddChildError("");
  }

  async function startTrial() {
    if (!selectedChild) return;
    setStarting(true);
    try {
      const res = await fetch("/api/family/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: selectedChild }),
      });
      if (res.ok) {
        await fetchTrial();
      }
    } catch (e) { console.error(e); }
    finally { setStarting(false); }
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
      <div style={{ minHeight: "100vh", background: "#F5F6FA", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "#8B90A4", fontSize: 15 }}>Loading family…</div>
      </div>
    );
  }

  // API error or db not yet migrated
  if (!trial) {
    return (
      <Screen title="Family" onBack={() => router.push("/dashboard")}>
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚙️</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: "0 0 10px" }}>Setting up family features</h2>
          <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, marginBottom: 24 }}>
            The database needs to be updated before this feature can be used. Run <strong>npm run db:push</strong> in your project folder, then reload.
          </p>
          <button onClick={fetchTrial}
            style={{ background: "#1A2340", color: "#fff", border: "none", borderRadius: 50, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
            Try again
          </button>
        </div>
      </Screen>
    );
  }

  const statusStyle = (s: "done" | "pending" | "missed") => {
    if (s === "done")    return { bg: "#D4F4E6", color: "#1E7D52", label: "Done" };
    if (s === "pending") return { bg: "#FFF3CC", color: "#B45309", label: "Waiting" };
    return                      { bg: "#FFE8E8", color: "#C44444", label: "Not done" };
  };

  // ── No household ───────────────────────────────────────────────
  if (trial?.status === "NO_HOUSEHOLD") {
    return (
      <Screen title="Family" onBack={() => router.push("/dashboard")}>
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", margin: "0 0 10px" }}>Set up your household first</h2>
          <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, marginBottom: 28 }}>
            Family responsibilities require a household. Invite your family to get started.
          </p>
          <Link href="/profile" style={btnStyle("#1A2340")}>Go to settings →</Link>
        </div>
      </Screen>
    );
  }

  // ── Trial expired + not Pro ────────────────────────────────────
  if (trial?.status === "TRIAL_EXPIRED" && !trial.isPro) {
    return (
      <Screen title="Family responsibilities" onBack={() => router.push("/dashboard")}>
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ color: "#CBD5E1", marginBottom: 20, display: "flex", justifyContent: "center" }}><IcLock /></div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", margin: "0 0 10px" }}>Trial period ended</h2>
          <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, marginBottom: 8 }}>
            Your 7-day free trial has ended. Upgrade to Pro to continue using family responsibilities.
          </p>
          <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 28 }}>Your chores and history are still saved.</p>
          <button style={btnStyle("#1A2340")}>Upgrade to Pro →</button>
          <div style={{ marginTop: 12 }}>
            <button onClick={() => router.push("/dashboard/family/child")}
              style={{ background: "none", border: "none", color: "#5B9CF5", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
              View history (read only)
            </button>
          </div>
        </div>
      </Screen>
    );
  }

  // ── No trial yet: activation screen ──────────────────────────
  if (trial?.status === "NO_TRIAL") {
    const children = trial.childMembers ?? [];
    return (
      <Screen title="Family responsibilities" onBack={() => router.push("/dashboard")}>
        <div style={{ padding: "32px 0 0" }}>
          {/* Hero */}
          <div style={{ background: "linear-gradient(135deg, #1A2340 0%, #2C3E6E 100%)", borderRadius: 20, padding: "28px 24px", marginBottom: 24, textAlign: "center" }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>👨‍👩‍👧</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 10px", lineHeight: 1.2 }}>
              Less nagging.<br/>More structure.
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, margin: "0 0 20px" }}>
              Try family responsibilities free for 7 days. Add 1 child, create recurring chores, and get a clear weekly overview without the reminders.
            </p>
            <div style={{ display: "inline-flex", background: "rgba(91,156,245,0.2)", borderRadius: 50, padding: "6px 16px", fontSize: 13, fontWeight: 700, color: "#7BB8FF" }}>
              1 child · 7 days · Free
            </div>
          </div>

          {/* What is included */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E8EDF4", padding: "20px", marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 14 }}>What is included in the trial</div>
            {[
              ["✅", "Create recurring chores for 1 child"],
              ["✅", "Child marks tasks done themselves"],
              ["✅", "Weekly overview for parents"],
              ["✅", "Optional adult approval per chore"],
            ].map(([icon, text]) => (
              <div key={text} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                <span style={{ fontSize: 15 }}>{icon}</span>
                <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.4 }}>{text}</span>
              </div>
            ))}
          </div>

          {/* Step 1: Add / pick a child */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", marginBottom: 12, letterSpacing: "0.02em" }}>
              Step 1 — Add your child
            </div>

            {/* Create new profile (PIN-based) */}
            {!showAddChild ? (
              <button onClick={() => setShowAddChild(true)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 14,
                  padding: "16px 18px", borderRadius: 14, cursor: "pointer", fontFamily: FONT,
                  background: "#EBF3FF", border: "2px solid #5B9CF5",
                  marginBottom: children.length > 0 ? 10 : 0,
                  textAlign: "left",
                }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#5B9CF5", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                  <IcPlus />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1A3A6E" }}>Create child profile</div>
                  <div style={{ fontSize: 12, color: "#4B6EA8", marginTop: 2 }}>Name + 4-digit PIN — no email needed</div>
                </div>
              </button>
            ) : (
              <AddChildForm
                name={newChildName} setName={setNewChildName}
                pin={newChildPin} setPin={setNewChildPin}
                pinConfirm={newChildPinConfirm} setPinConfirm={setNewChildPinConfirm}
                error={addChildError} loading={addingChild}
                onSave={createChildProfile}
                onCancel={resetAddChildForm}
              />
            )}

            {/* Existing children */}
            {children.length > 0 && !showAddChild && (
              <div>
                <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, textAlign: "center", margin: "10px 0" }}>or select existing</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {children.map(c => (
                    <button key={c.id} onClick={() => setSelectedChild(c.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                        background: selectedChild === c.id ? "#EBF3FF" : "#fff",
                        border: selectedChild === c.id ? "2px solid #5B9CF5" : "1.5px solid #E8EDF4",
                        borderRadius: 14, cursor: "pointer", textAlign: "left", fontFamily: FONT,
                      }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1A2340", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>{c.name}</span>
                      {selectedChild === c.id && <div style={{ marginLeft: "auto", color: "#5B9CF5" }}><IcCheck /></div>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {children.length > 0 && !showAddChild && (
            <button onClick={startTrial} disabled={!selectedChild || starting}
              style={{ ...btnStyle("#1A2340"), width: "100%", opacity: !selectedChild || starting ? 0.6 : 1 }}>
              {starting ? "Starting…" : "Start free 7-day trial →"}
            </button>
          )}
        </div>
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
        <div style={{ background: "#FFF9E6", border: "1px solid #FDE68A", borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>Free trial active</div>
            <div style={{ fontSize: 12, color: "#B45309", marginTop: 2 }}>{trial.daysLeft} day{trial.daysLeft !== 1 ? "s" : ""} remaining</div>
          </div>
          <button style={{ background: "#1A2340", color: "#fff", border: "none", borderRadius: 50, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
            Upgrade
          </button>
        </div>
      )}

      {/* Share link for children */}
      {householdId && (
        <ShareLink householdId={householdId} copied={copied} onCopy={() => {
          navigator.clipboard.writeText(window.location.origin + "/family?h=" + householdId);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }} />
      )}

      {/* Child tabs */}
      {summary.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
          {summary.map(c => (
            <button key={c.childId} onClick={() => setSelectedChild(c.childId)}
              style={{
                flexShrink: 0, padding: "8px 16px", borderRadius: 50, fontSize: 13, fontWeight: 700,
                background: selectedChild === c.childId ? "#1A2340" : "#fff",
                color: selectedChild === c.childId ? "#fff" : "#4B5563",
                border: selectedChild === c.childId ? "none" : "1.5px solid #E8EDF4",
                cursor: "pointer", fontFamily: FONT,
              }}>
              {c.childName}
            </button>
          ))}
        </div>
      )}

      {/* Week summary card */}
      {viewChild && (
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #E8EDF4", padding: "20px", marginBottom: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A" }}>{viewChild.childName}</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>This week</div>
            </div>
            <Link href={`/dashboard/family/child?id=${viewChild.childId}`}
              style={{ fontSize: 12, fontWeight: 600, color: "#5B9CF5", textDecoration: "none" }}>
              Child view →
            </Link>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[
              { value: `${viewChild.done}/${viewChild.total}`, label: "Done", bg: "#D4F4E6", color: "#1E7D52" },
              { value: viewChild.pending, label: "Waiting", bg: "#FFF3CC", color: "#B45309" },
              { value: viewChild.missed, label: "Not done", bg: "#FFE8E8", color: "#C44444" },
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
                borderTop: i === 0 ? "none" : "1px solid #F0F3F8",
                padding: "12px 0",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: isDone ? "#6B7280" : "#0F172A", textDecoration: isDone ? "line-through" : "none" }}>
                    {chore.name}
                  </div>
                  {chore.requiresApproval && (
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>Requires approval</div>
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
                        style={{ background: "#D4F4E6", color: "#1E7D52", border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                        ✓
                      </button>
                      <button onClick={() => handleApprove(chore.id, viewChild.childId, "reopen")}
                        disabled={approvingId === chore.id}
                        style={{ background: "#FFE8E8", color: "#C44444", border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {viewChild.chores.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 0", color: "#9CA3AF", fontSize: 13 }}>
              No chores assigned yet.{" "}
              <Link href="/dashboard/family/new" style={{ color: "#5B9CF5", fontWeight: 600 }}>Add one →</Link>
            </div>
          )}
        </div>
      )}

      {/* Over-time stats card */}
      {viewChild && viewStats && (
        <div style={{
          background: "#fff", borderRadius: 18, border: "1px solid #E8EDF4",
          padding: "20px", marginBottom: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>
            Done over time
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 14 }}>
            Tasks {viewStats.childName} has completed.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { value: viewStats.last7Days,  label: "Last 7 days" },
              { value: viewStats.thisMonth,  label: "This month" },
              { value: viewStats.lastMonth,  label: "Last month" },
            ].map(s => (
              <div key={s.label} style={{
                background: "#F5F6FA", borderRadius: 12, padding: "12px 8px", textAlign: "center",
              }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#1A2340", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {isActive && (
        <div style={{ display: "flex", gap: 10, marginBottom: showAddChild ? 0 : 16 }}>
          <Link href="/dashboard/family/new" style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: "#1A2340", color: "#fff", borderRadius: 50, padding: "14px",
            fontSize: 14, fontWeight: 700, textDecoration: "none",
          }}>
            <IcPlus /> Add chore
          </Link>
          {!showAddChild && (
            <button onClick={() => setShowAddChild(true)}
              style={{
                padding: "14px 18px", borderRadius: 50, background: "#F0F3FA",
                border: "none", fontSize: 13, fontWeight: 700, color: "#4B5563",
                cursor: "pointer", fontFamily: FONT, whiteSpace: "nowrap",
              }}>
              + Add child
            </button>
          )}
        </div>
      )}
      {isActive && showAddChild && (
        <AddChildForm
          name={newChildName} setName={setNewChildName}
          pin={newChildPin} setPin={setNewChildPin}
          pinConfirm={newChildPinConfirm} setPinConfirm={setNewChildPinConfirm}
          error={addChildError} loading={addingChild}
          onSave={createChildProfile}
          onCancel={resetAddChildForm}
        />
      )}

      {/* Empty state */}
      {isActive && summary.length === 0 && !showAddChild && (
        <div style={{ textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1A2340", marginBottom: 8 }}>No chores yet</div>
          <div style={{ fontSize: 14, color: "#6B7280", marginBottom: 24, lineHeight: 1.5 }}>
            Create your first recurring chore for your child.
          </div>
          <Link href="/dashboard/family/new" style={btnStyle("#1A2340")}>Create first chore</Link>
        </div>
      )}
    </Screen>
  );
}

// ── Shared components ──────────────────────────────────────────

type AddChildFormProps = {
  name: string;
  setName: (v: string) => void;
  pin: string;
  setPin: (v: string) => void;
  pinConfirm: string;
  setPinConfirm: (v: string) => void;
  error: string;
  loading: boolean;
  onSave: () => void;
  onCancel: () => void;
};

function AddChildForm({ name, setName, pin, setPin, pinConfirm, setPinConfirm, error, loading, onSave, onCancel }: AddChildFormProps) {
  return (
    <div style={{ background: "#fff", borderRadius: 18, border: "1.5px solid #E8EDF4", padding: "20px", marginTop: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>Add child profile</div>
      <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 18, lineHeight: 1.4 }}>
        Your child logs in by tapping their name and entering a 4-digit PIN — no email needed.
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>Name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Emma"
          autoComplete="off"
          style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #E8EDF4", fontSize: 15, fontFamily: FONT, outline: "none", boxSizing: "border-box" as const }}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>4-digit PIN</label>
        <input
          value={pin}
          onChange={e => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
          placeholder="1 2 3 4"
          inputMode="numeric"
          type="password"
          autoComplete="new-password"
          style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #E8EDF4", fontSize: 22, fontFamily: FONT, outline: "none", boxSizing: "border-box" as const, letterSpacing: "0.4em" }}
        />
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>Confirm PIN</label>
        <input
          value={pinConfirm}
          onChange={e => setPinConfirm(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
          placeholder="1 2 3 4"
          inputMode="numeric"
          type="password"
          autoComplete="new-password"
          style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #E8EDF4", fontSize: 22, fontFamily: FONT, outline: "none", boxSizing: "border-box" as const, letterSpacing: "0.4em" }}
        />
      </div>

      {error && (
        <div style={{ fontSize: 13, color: "#C44444", background: "#FFF0F0", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onSave}
          disabled={loading}
          style={{ flex: 1, background: "#1A2340", color: "#fff", border: "none", borderRadius: 50, padding: "13px", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: FONT, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Saving…" : "Save child"}
        </button>
        <button
          onClick={onCancel}
          style={{ padding: "13px 20px", borderRadius: 50, background: "#F0F3FA", border: "none", fontSize: 13, fontWeight: 700, color: "#4B5563", cursor: "pointer", fontFamily: FONT }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

type ShareLinkProps = {
  householdId: string;
  copied: boolean;
  onCopy: () => void;
};

function ShareLink({ householdId: _hid, copied, onCopy }: ShareLinkProps) {
  return (
    <div style={{ background: "#EBF3FF", borderRadius: 14, border: "1.5px solid #BDD6FF", padding: "14px 16px", marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1A3A6E", marginBottom: 4 }}>Children’s login link</div>
      <div style={{ fontSize: 12, color: "#4B6EA8", marginBottom: 12, lineHeight: 1.5 }}>
        Share this with your children. They tap their name and enter their PIN — no email needed.
      </div>
      <button
        onClick={onCopy}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, background: copied ? "#D4F4E6" : "#1A2340", color: copied ? "#1E7D52" : "#fff", border: "none", borderRadius: 50, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
        {copied ? "Copied!" : "Copy login link"}
      </button>
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
    <div style={{ minHeight: "100vh", background: "#F5F6FA", fontFamily: FONT }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #E8EDF4", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#4B5563", display: "flex", padding: 4 }}>
            <IcBack />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: 0, flex: 1 }}>{title}</h1>
        </div>
      </div>
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "20px 20px 40px" }}>
        {children}
      </main>
    </div>
  );
}
