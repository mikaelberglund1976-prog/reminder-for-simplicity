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
};

type Stats = {
  totalUsers: number;
  totalReminders: number;
  emailsSent30Days: number;
  lastEmailSent: string | null;
};

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
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

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
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setUsers(data.users); setStats(data.stats);
    } catch { notify("err", "Failed to load data."); }
    finally { setLoading(false); }
  }

  function notify(type: "ok" | "err", text: string) {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 5000);
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      notify("ok", `Cron ran ✓ — Sent: ${data.sent}, Errors: ${data.errors}`);
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

  if (status === "loading" || loading) return (
    <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <StarBackground />
      <span style={{ color: "rgba(180,200,255,0.7)", fontSize: 15, position: "relative", zIndex: 1 }}>Loading…</span>
    </div>
  );

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

      <main style={{ position: "relative", zIndex: 10, maxWidth: 1100, margin: "0 auto", padding: "36px 24px 100px" }}>

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
          <p style={{ color: "rgba(140,165,220,0.45)", fontSize: 12, marginTop: 14 }}>
            Trigger cron runs the full reminder job right now. Test email sends a sample to <strong style={{ color: "rgba(180,205,255,0.7)" }}>{session?.user?.email}</strong>.
          </p>
        </div>

        {/* Users table */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, overflow: "hidden", backdropFilter: "blur(10px)" }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: 0 }}>
              Users <span style={{ color: "rgba(160,185,255,0.5)", fontWeight: 400 }}>({users.length})</span>
            </h2>
          </div>

          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 110px 90px 80px 70px", gap: 16, padding: "11px 22px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
            {["Name", "Email", "Joined", "Reminders", "Currency", ""].map((h, i) => (
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 110px 90px 80px 70px", gap: 16, alignItems: "center", padding: "14px 22px" }}>
                <span style={{ fontWeight: 600, color: user.name ? "#fff" : "rgba(160,185,255,0.4)", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: user.name ? "normal" : "italic" }}>
                  {user.name ?? "No name"}
                </span>
                <span style={{ color: "rgba(175,200,255,0.65)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</span>
                <span style={{ color: "rgba(175,200,255,0.65)", fontSize: 13 }}>{formatDate(user.createdAt)}</span>
                <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{user._count.reminders}</span>
                <span style={{ color: "rgba(175,200,255,0.65)", fontSize: 13 }}>{user.preferredCurrency ?? "SEK"}</span>
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
