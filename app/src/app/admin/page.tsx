"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StarBackground } from "@/components/StarBackground";

const ADMIN_EMAIL = "mikaelberglund1976@gmail.com";

type User = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  preferredCurrency: string | null;
  _count: { reminders: number };
  householdMembers: { role: string; household: { id: string; name: string | null; is_pro: boolean } }[];
};

type Stats = {
  totalUsers: number;
  totalReminders: number;
  emailsSent30Days: number;
  lastEmailSent: string | null;
};

type HouseholdInvite = {
  id: string;
  email: string;
  createdAt: string;
  expiresAt: string;
};

type HouseholdMemberInfo = {
  role: string;
  user: { id: string; name: string | null; email: string };
};

type HouseholdAdmin = {
  id: string;
  name: string | null;
  is_pro: boolean;
  createdAt: string;
  members: HouseholdMemberInfo[];
  invites: HouseholdInvite[];
};

type AddMemberState = { [householdId: string]: { email: string; loading: boolean } };

const bg = "radial-gradient(ellipse at 60% 25%, #1e3f8a 0%, #0e2268 28%, #070f3c 60%, #030820 100%)";
const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 16, padding: 24,
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [households, setHouseholds] = useState<HouseholdAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingProId, setTogglingProId] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [cronLog, setCronLog] = useState<string[] | null>(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);
  const [addMemberState, setAddMemberState] = useState<AddMemberState>({});

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session?.user?.email !== ADMIN_EMAIL) router.push("/dashboard");
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email === ADMIN_EMAIL) fetchData();
  }, [status, session]);

  async function fetchData() {
    setLoading(true);
    try {
      const [usersRes, householdsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/households"),
      ]);
      if (!usersRes.ok) throw new Error("Failed to load users");
      const userData = await usersRes.json();
      setUsers(userData.users);
      setStats(userData.stats);

      if (householdsRes.ok) {
        const hData = await householdsRes.json();
        setHouseholds(hData.households ?? []);
      }
    } catch { notify("err", "Failed to load data."); }
    finally { setLoading(false); }
  }

  function notify(type: "ok" | "err", text: string) {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 5000);
  }

  async function handleTogglePro(householdId: string) {
    setTogglingProId(householdId);
    try {
      const res = await fetch(`/api/admin/households/${householdId}/toggle-pro`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Update both users and households state
      setUsers(prev => prev.map(u => {
        const hm = u.householdMembers[0];
        if (hm && hm.household.id === householdId) {
          return { ...u, householdMembers: [{ ...hm, household: { ...hm.household, is_pro: data.is_pro } }] };
        }
        return u;
      }));
      setHouseholds(prev => prev.map(h =>
        h.id === householdId ? { ...h, is_pro: data.is_pro } : h
      ));
      notify("ok", `Pro ${data.is_pro ? "enabled" : "disabled"} ✓`);
    } catch (e: unknown) { notify("err", e instanceof Error ? e.message : "Failed."); }
    finally { setTogglingProId(null); }
  }

  async function handleDelete(userId: string, email: string) {
    if (!confirm(`Delete user ${email} and all their data? Cannot be undone.`)) return;
    setDeletingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setUsers((u) => u.filter((x) => x.id !== userId));
      setStats((s) => s ? { ...s, totalUsers: s.totalUsers - 1 } : s);
      notify("ok", `User ${email} deleted.`);
    } catch { notify("err", "Failed to delete user."); }
    finally { setDeletingId(null); }
  }

  async function handleTriggerCron() {
    setTriggering(true);
    try {
      const res = await fetch("/api/admin/trigger-cron", { method: "POST" });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* empty response */ }
      if (!res.ok) throw new Error((data.error as string) || `Server error ${res.status}`);
      notify("ok", `Cron ran ✓ — Sent: ${data.sent}, Skipped: ${data.skipped ?? 0}, Errors: ${data.errors}`);
      if (data.log) setCronLog(data.log as string[]);
      fetchData();
    } catch (e: unknown) { notify("err", e instanceof Error ? e.message : "Failed."); }
    finally { setTriggering(false); }
  }

  async function handleTestEmail() {
    setTestingEmail(true);
    try {
      const res = await fetch("/api/admin/test-email", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      notify("ok", `Test email sent to ${session?.user?.email} ✓`);
    } catch { notify("err", "Failed to send test email."); }
    finally { setTestingEmail(false); }
  }

  function setAddMemberEmail(householdId: string, email: string) {
    setAddMemberState(prev => ({ ...prev, [householdId]: { email, loading: prev[householdId]?.loading ?? false } }));
  }

  async function handleAddMember(householdId: string) {
    const state = addMemberState[householdId];
    if (!state?.email?.includes("@")) { notify("err", "Enter a valid email."); return; }
    setAddMemberState(prev => ({ ...prev, [householdId]: { ...prev[householdId], loading: true } }));
    try {
      const res = await fetch(`/api/admin/households/${householdId}/add-member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: state.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      notify("ok", `${data.userName} added to household ✓`);
      setAddMemberState(prev => ({ ...prev, [householdId]: { email: "", loading: false } }));
      fetchData();
    } catch (e: unknown) {
      notify("err", e instanceof Error ? e.message : "Failed.");
      setAddMemberState(prev => ({ ...prev, [householdId]: { ...prev[householdId], loading: false } }));
    }
  }

  async function handleRevokeInvite(inviteId: string, inviteEmail: string) {
    if (!confirm(`Revoke invite for ${inviteEmail}?`)) return;
    setRevokingInviteId(inviteId);
    try {
      const res = await fetch(`/api/admin/invites/${inviteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setHouseholds(prev => prev.map(h => ({
        ...h,
        invites: h.invites.filter(inv => inv.id !== inviteId),
      })));
      notify("ok", `Invite for ${inviteEmail} revoked ✓`);
    } catch { notify("err", "Failed to revoke invite."); }
    finally { setRevokingInviteId(null); }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (h < 1) return "just now";
    if (h < 24) return `${h}h ago`;
    return `${d}d ago`;
  }

  function timeUntil(dateStr: string) {
    const diff = new Date(dateStr).getTime() - Date.now();
    const h = Math.floor(diff / 3600000);
    if (h <= 0) return "expired";
    if (h < 24) return `${h}h left`;
    return `${Math.floor(h / 24)}d left`;
  }

  if (status === "loading" || loading) return (
    <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <StarBackground />
      <span style={{ color: "rgba(180,200,255,0.7)", fontSize: 15, position: "relative", zIndex: 1 }}>Loading…</span>
    </div>
  );

  // Total pending invites count for badge
  const totalPendingInvites = households.reduce((sum, h) => sum + h.invites.length, 0);

  return (
    <div style={{ minHeight: "100vh", background: bg, position: "relative", overflow: "hidden" }}>
      <StarBackground />

      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(7,15,60,0.88)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", borderBottom: "1px solid rgba(255,255,255,0.1)", padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔔</div>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 18, letterSpacing: "-0.3px" }}>AssistIQ</span>
          </Link>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 18 }}>|</span>
          <span style={{ color: "rgba(130,180,255,0.8)", fontSize: 14, fontWeight: 600 }}>Admin Console</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ background: "rgba(74,127,220,0.25)", border: "1px solid rgba(74,127,220,0.4)", color: "rgba(130,180,255,0.9)", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 50, textTransform: "uppercase", letterSpacing: "0.05em" }}>Admin</span>
          <Link href="/dashboard" style={{ color: "rgba(180,205,255,0.6)", fontSize: 14, textDecoration: "none" }}>← Dashboard</Link>
        </div>
      </header>

      <main style={{ position: "relative", zIndex: 10, maxWidth: 1200, margin: "0 auto", padding: "36px 24px 100px" }}>

        {/* Action message */}
        {actionMsg && (
          <div style={{
            background: actionMsg.type === "ok" ? "rgba(42,157,111,0.2)" : "rgba(217,79,79,0.18)",
            border: `1px solid ${actionMsg.type === "ok" ? "rgba(42,157,111,0.4)" : "rgba(217,79,79,0.4)"}`,
            color: actionMsg.type === "ok" ? "#5ee8a8" : "#ff8f8f",
            borderRadius: 10, padding: "12px 18px", fontSize: 14, marginBottom: 24,
          }}>
            {actionMsg.text}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
            {[
              { value: stats.totalUsers, label: "Total users" },
              { value: stats.totalReminders, label: "Active reminders" },
              { value: stats.emailsSent30Days, label: "Emails sent (30d)" },
              { value: stats.lastEmailSent ? timeAgo(stats.lastEmailSent) : "—", label: "Last email sent" },
            ].map((s, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "18px 20px", backdropFilter: "blur(8px)" }}>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 28, lineHeight: 1.1 }}>{s.value}</div>
                <div style={{ color: "rgba(140,170,230,0.55)", fontSize: 12, fontWeight: 500, marginTop: 6 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* System controls */}
        <div style={{ ...card, marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(130,165,230,0.55)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 16px" }}>System</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={handleTriggerCron} disabled={triggering} style={{ background: triggering ? "rgba(74,127,220,0.4)" : "linear-gradient(160deg, #4a7ee0 0%, #2e5ec8 100%)", color: "#fff", fontWeight: 700, fontSize: 14, padding: "10px 22px", borderRadius: 50, border: "none", cursor: triggering ? "not-allowed" : "pointer", boxShadow: "0 3px 14px rgba(46,94,200,0.4)" }}>
              {triggering ? "Running…" : "▶ Trigger reminder cron now"}
            </button>
            <button onClick={handleTestEmail} disabled={testingEmail} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(200,220,255,0.85)", fontWeight: 600, fontSize: 14, padding: "10px 22px", borderRadius: 50, cursor: testingEmail ? "not-allowed" : "pointer" }}>
              {testingEmail ? "Sending…" : "✉ Send test email to me"}
            </button>
            <button onClick={fetchData} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(180,205,255,0.6)", fontWeight: 600, fontSize: 14, padding: "10px 20px", borderRadius: 50, cursor: "pointer" }}>
              ↻ Refresh
            </button>
          </div>
          {cronLog && (
            <div style={{ marginTop: 16, background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "14px 16px", maxHeight: 300, overflowY: "auto" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(130,165,230,0.6)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Cron debug log</div>
              {cronLog.map((line, i) => (
                <div key={i} style={{ fontSize: 12, color: line.includes("ERROR") ? "#ff8f8f" : line.includes("sent to") ? "#5ee8a8" : "rgba(180,205,255,0.7)", fontFamily: "monospace", lineHeight: 1.7 }}>{line}</div>
              ))}
            </div>
          )}
          <p style={{ color: "rgba(140,165,220,0.45)", fontSize: 12, marginTop: 14 }}>
            Trigger cron runs the full reminder job right now. Test email sends a sample to <strong style={{ color: "rgba(180,205,255,0.7)" }}>{session?.user?.email}</strong>.
          </p>
        </div>

        {/* Households & Invites */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, overflow: "hidden", backdropFilter: "blur(10px)", marginBottom: 24 }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: 0 }}>
              Households <span style={{ color: "rgba(160,185,255,0.5)", fontWeight: 400 }}>({households.length})</span>
              {totalPendingInvites > 0 && (
                <span style={{ marginLeft: 10, background: "rgba(255,180,50,0.2)", border: "1px solid rgba(255,180,50,0.4)", color: "#ffd080", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 50 }}>
                  {totalPendingInvites} pending invite{totalPendingInvites !== 1 ? "s" : ""}
                </span>
              )}
            </h2>
          </div>

          {households.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "rgba(160,185,255,0.5)", fontSize: 14 }}>No households yet.</div>
          ) : households.map((household, i) => (
            <div
              key={household.id}
              style={{ borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.07)", padding: "18px 22px" }}
            >
              {/* Household header row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>
                    🏠 {household.name ?? "Unnamed household"}
                  </span>
                  <button
                    onClick={() => handleTogglePro(household.id)}
                    disabled={togglingProId === household.id}
                    style={{
                      background: household.is_pro ? "rgba(74,127,220,0.3)" : "rgba(255,255,255,0.06)",
                      border: `1px solid ${household.is_pro ? "rgba(74,127,220,0.6)" : "rgba(255,255,255,0.15)"}`,
                      color: household.is_pro ? "#7BB8FF" : "rgba(180,200,255,0.45)",
                      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 50,
                      cursor: togglingProId === household.id ? "not-allowed" : "pointer",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}
                  >
                    {togglingProId === household.id ? "…" : household.is_pro ? "⚡ Pro ON" : "Free — click to enable Pro"}
                  </button>
                </div>
                <span style={{ fontSize: 12, color: "rgba(140,170,220,0.5)" }}>Created {formatDate(household.createdAt)}</span>
              </div>

              {/* Members */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: household.invites.length > 0 ? 12 : 0 }}>
                {household.members.map(m => (
                  <div key={m.user.id} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "5px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>{m.user.name ?? m.user.email}</span>
                    <span style={{ fontSize: 10, color: m.role === "OWNER" ? "#ffd080" : "rgba(160,185,255,0.5)", fontWeight: 700, textTransform: "uppercase" }}>{m.role}</span>
                  </div>
                ))}
              </div>

              {/* Add member manually */}
              <div style={{ display: "flex", gap: 8, marginTop: 10, marginBottom: household.invites.length > 0 ? 10 : 0 }}>
                <input
                  type="email"
                  placeholder="Add by email (must have an account)"
                  value={addMemberState[household.id]?.email ?? ""}
                  onChange={e => setAddMemberEmail(household.id, e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddMember(household.id); } }}
                  style={{ flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "7px 12px", color: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none" }}
                />
                <button
                  type="button"
                  onClick={() => handleAddMember(household.id)}
                  disabled={addMemberState[household.id]?.loading}
                  style={{ background: "rgba(74,127,220,0.25)", border: "1px solid rgba(74,127,220,0.4)", color: "#7BB8FF", fontSize: 12, fontWeight: 700, padding: "7px 16px", borderRadius: 8, cursor: "pointer", flexShrink: 0 }}
                >
                  {addMemberState[household.id]?.loading ? "Adding…" : "Add member"}
                </button>
              </div>

              {/* Pending invites */}
              {household.invites.length > 0 && (
                <div style={{ background: "rgba(255,180,50,0.06)", border: "1px solid rgba(255,180,50,0.2)", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,200,80,0.7)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    Pending invites
                  </div>
                  {household.invites.map(inv => (
                    <div key={inv.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 6, paddingBottom: 6, borderTop: "1px solid rgba(255,180,50,0.1)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 13, color: "rgba(220,235,255,0.85)" }}>✉ {inv.email}</span>
                        <span style={{ fontSize: 11, color: "rgba(160,185,255,0.45)" }}>Sent {timeAgo(inv.createdAt)}</span>
                        <span style={{ fontSize: 11, color: "rgba(255,200,80,0.55)" }}>{timeUntil(inv.expiresAt)}</span>
                      </div>
                      <button
                        onClick={() => handleRevokeInvite(inv.id, inv.email)}
                        disabled={revokingInviteId === inv.id}
                        style={{ background: "none", border: "none", color: revokingInviteId === inv.id ? "rgba(255,107,107,0.4)" : "rgba(255,107,107,0.8)", fontSize: 12, fontWeight: 600, cursor: revokingInviteId === inv.id ? "not-allowed" : "pointer", padding: 0 }}
                      >
                        {revokingInviteId === inv.id ? "Revoking…" : "Revoke"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Users table */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, overflow: "hidden", backdropFilter: "blur(10px)" }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: 0 }}>
              Users <span style={{ color: "rgba(160,185,255,0.5)", fontWeight: 400 }}>({users.length})</span>
            </h2>
            <span style={{ fontSize: 12, color: "rgba(160,185,255,0.45)" }}>Toggle ⚡ Pro to enable family sharing for a household</span>
          </div>

          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr 110px 80px 70px 100px 70px", gap: 12, padding: "11px 22px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
            {["Name", "Email", "Joined", "Reminders", "Currency", "Pro", ""].map((h, i) => (
              <div key={i} style={{ fontSize: 11, fontWeight: 700, color: "rgba(130,165,230,0.55)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</div>
            ))}
          </div>

          {users.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "rgba(160,185,255,0.5)", fontSize: 14 }}>No users yet.</div>
          ) : users.map((user, i) => (
            <div
              key={user.id}
              style={{ borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.07)" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr 110px 80px 70px 100px 70px", gap: 12, alignItems: "center", padding: "14px 22px" }}>
                <span style={{ fontWeight: 600, color: user.name ? "#fff" : "rgba(160,185,255,0.4)", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: user.name ? "normal" : "italic" }}>
                  {user.name ?? "No name"}
                </span>
                <span style={{ color: "rgba(175,200,255,0.65)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</span>
                <span style={{ color: "rgba(175,200,255,0.65)", fontSize: 13 }}>{formatDate(user.createdAt)}</span>
                <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{user._count.reminders}</span>
                <span style={{ color: "rgba(175,200,255,0.65)", fontSize: 13 }}>{user.preferredCurrency ?? "SEK"}</span>
                <div>
                  {user.householdMembers[0] ? (
                    <button
                      onClick={() => handleTogglePro(user.householdMembers[0].household.id)}
                      disabled={togglingProId === user.householdMembers[0].household.id}
                      title={user.householdMembers[0].household.name ?? "Household"}
                      style={{
                        background: user.householdMembers[0].household.is_pro
                          ? "rgba(74,127,220,0.3)" : "rgba(255,255,255,0.06)",
                        border: `1px solid ${user.householdMembers[0].household.is_pro ? "rgba(74,127,220,0.6)" : "rgba(255,255,255,0.15)"}`,
                        color: user.householdMembers[0].household.is_pro ? "#7BB8FF" : "rgba(180,200,255,0.45)",
                        fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 50,
                        cursor: togglingProId === user.householdMembers[0].household.id ? "not-allowed" : "pointer",
                        textTransform: "uppercase", letterSpacing: "0.05em", transition: "all 0.15s",
                      }}
                    >
                      {togglingProId === user.householdMembers[0].household.id
                        ? "…"
                        : user.householdMembers[0].household.is_pro ? "⚡ Pro ON" : "Free"}
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: "rgba(160,185,255,0.3)" }}>No household</span>
                  )}
                </div>
                <div>
                  {user.email !== ADMIN_EMAIL && (
                    <button onClick={() => handleDelete(user.id, user.email)} disabled={deletingId === user.id} style={{ background: "none", border: "none", color: deletingId === user.id ? "rgba(255,107,107,0.4)" : "rgba(255,107,107,0.8)", fontSize: 13, fontWeight: 600, cursor: deletingId === user.id ? "not-allowed" : "pointer", padding: 0 }}>
                      {deletingId === user.id ? "Deleting…" : "Delete"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
