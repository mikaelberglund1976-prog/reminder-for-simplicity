"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StarBackground } from "@/components/StarBackground";

const ADMIN_EMAIL = "mikaelberglund1976@gmail.com";

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

type UserLite = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  _count: { reminders: number };
  householdMembers: { household: { id: string } }[];
};

const bg =
  "radial-gradient(ellipse at 60% 25%, #1e3f8a 0%, #0e2268 28%, #070f3c 60%, #030820 100%)";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<UserLite[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [households, setHouseholds] = useState<HouseholdAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [cronLog, setCronLog] = useState<string[] | null>(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"families" | "users">("families");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session?.user?.email !== ADMIN_EMAIL) {
      router.push("/dashboard");
    }
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
    } catch {
      notify("err", "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }

  function notify(type: "ok" | "err", text: string) {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 5000);
  }

  async function handleTriggerCron() {
    setTriggering(true);
    try {
      const res = await fetch("/api/admin/trigger-cron", { method: "POST" });
      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {
        /* empty */
      }
      if (!res.ok) throw new Error((data.error as string) || `Server error ${res.status}`);
      notify(
        "ok",
        `Cron ran ✓ — Sent: ${data.sent}, Skipped: ${data.skipped ?? 0}, Errors: ${data.errors}`
      );
      if (data.log) setCronLog(data.log as string[]);
      fetchData();
    } catch (e: unknown) {
      notify("err", e instanceof Error ? e.message : "Failed.");
    } finally {
      setTriggering(false);
    }
  }

  async function handleTestEmail() {
    setTestingEmail(true);
    try {
      const res = await fetch("/api/admin/test-email", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      notify("ok", `Test email sent to ${session?.user?.email} ✓`);
    } catch {
      notify("err", "Failed to send test email.");
    } finally {
      setTestingEmail(false);
    }
  }

  async function handleDeleteUser(userId: string, email: string) {
    if (!confirm(`Delete user ${email} and all their data? Cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setUsers((u) => u.filter((x) => x.id !== userId));
      setStats((s) => (s ? { ...s, totalUsers: s.totalUsers - 1 } : s));
      notify("ok", `User ${email} deleted.`);
    } catch {
      notify("err", "Failed to delete user.");
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (h < 1) return "just now";
    if (h < 24) return `${h}h ago`;
    return `${d}d ago`;
  }

  if (status === "loading" || loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <StarBackground />
        <span style={{ color: "rgba(180,200,255,0.7)", fontSize: 15, position: "relative", zIndex: 1 }}>
          Loading…
        </span>
      </div>
    );

  const q = query.trim().toLowerCase();

  // Derive the Families list from households — add a helper for the OWNER email
  const familiesFiltered = q
    ? households.filter((h) => {
        const ownerEmail = h.members.find((m) => m.role === "OWNER")?.user.email ?? "";
        return (
          (h.name ?? "").toLowerCase().includes(q) ||
          ownerEmail.toLowerCase().includes(q) ||
          h.members.some(
            (m) =>
              (m.user.name ?? "").toLowerCase().includes(q) ||
              m.user.email.toLowerCase().includes(q)
          )
        );
      })
    : households;

  // Users-without-household list (for the "Users" tab)
  const usersFiltered = q
    ? users.filter(
        (u) =>
          (u.name ?? "").toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      )
    : users;
  const usersWithoutHousehold = usersFiltered.filter((u) => u.householdMembers.length === 0);

  return (
    <div style={{ minHeight: "100vh", background: bg, position: "relative", overflow: "hidden" }}>
      <StarBackground />

      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(7,15,60,0.88)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          padding: "0 32px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}
            >
              🔔
            </div>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 18, letterSpacing: "-0.3px" }}>
              AssistIQ
            </span>
          </Link>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 18 }}>|</span>
          <span style={{ color: "rgba(130,180,255,0.8)", fontSize: 14, fontWeight: 600 }}>
            Admin Console
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              background: "rgba(74,127,220,0.25)",
              border: "1px solid rgba(74,127,220,0.4)",
              color: "rgba(130,180,255,0.9)",
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 50,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Admin
          </span>
          <Link href="/dashboard" style={{ color: "rgba(180,205,255,0.6)", fontSize: 14, textDecoration: "none" }}>
            ← Dashboard
          </Link>
        </div>
      </header>

      <main style={{ position: "relative", zIndex: 10, maxWidth: 1200, margin: "0 auto", padding: "36px 24px 100px" }}>
        {/* Action message */}
        {actionMsg && (
          <div
            style={{
              background: actionMsg.type === "ok" ? "rgba(42,157,111,0.2)" : "rgba(217,79,79,0.18)",
              border: `1px solid ${actionMsg.type === "ok" ? "rgba(42,157,111,0.4)" : "rgba(217,79,79,0.4)"}`,
              color: actionMsg.type === "ok" ? "#5ee8a8" : "#ff8f8f",
              borderRadius: 10,
              padding: "12px 18px",
              fontSize: 14,
              marginBottom: 24,
            }}
          >
            {actionMsg.text}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
            {[
              { value: households.length, label: "Families" },
              { value: stats.totalUsers, label: "Total users" },
              { value: stats.totalReminders, label: "Active reminders" },
              { value: stats.emailsSent30Days, label: "Emails sent (30d)" },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 14,
                  padding: "18px 20px",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 28, lineHeight: 1.1 }}>{s.value}</div>
                <div style={{ color: "rgba(140,170,230,0.55)", fontSize: 12, fontWeight: 500, marginTop: 6 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* System controls */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(130,165,230,0.55)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              margin: "0 0 16px",
            }}
          >
            System
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={handleTriggerCron}
              disabled={triggering}
              style={{
                background: triggering ? "rgba(74,127,220,0.4)" : "linear-gradient(160deg, #4a7ee0 0%, #2e5ec8 100%)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                padding: "10px 22px",
                borderRadius: 50,
                border: "none",
                cursor: triggering ? "not-allowed" : "pointer",
                boxShadow: "0 3px 14px rgba(46,94,200,0.4)",
              }}
            >
              {triggering ? "Running…" : "▶ Trigger reminder cron now"}
            </button>
            <button
              onClick={handleTestEmail}
              disabled={testingEmail}
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(200,220,255,0.85)",
                fontWeight: 600,
                fontSize: 14,
                padding: "10px 22px",
                borderRadius: 50,
                cursor: testingEmail ? "not-allowed" : "pointer",
              }}
            >
              {testingEmail ? "Sending…" : "✉ Send test email to me"}
            </button>
            <button
              onClick={fetchData}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(180,205,255,0.6)",
                fontWeight: 600,
                fontSize: 14,
                padding: "10px 20px",
                borderRadius: 50,
                cursor: "pointer",
              }}
            >
              ↻ Refresh
            </button>
          </div>
          {cronLog && (
            <div
              style={{
                marginTop: 16,
                background: "rgba(0,0,0,0.3)",
                borderRadius: 10,
                padding: "14px 16px",
                maxHeight: 300,
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "rgba(130,165,230,0.6)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginBottom: 10,
                }}
              >
                Cron debug log
              </div>
              {cronLog.map((line, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 12,
                    color: line.includes("ERROR")
                      ? "#ff8f8f"
                      : line.includes("sent to")
                        ? "#5ee8a8"
                        : "rgba(180,205,255,0.7)",
                    fontFamily: "monospace",
                    lineHeight: 1.7,
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs + search */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 16,
            overflow: "hidden",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              padding: "14px 22px",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <TabButton active={tab === "families"} onClick={() => setTab("families")}>
                Families ({households.length})
              </TabButton>
              <TabButton active={tab === "users"} onClick={() => setTab("users")}>
                Users without family ({users.filter((u) => u.householdMembers.length === 0).length})
              </TabButton>
            </div>
            <input
              type="search"
              placeholder={tab === "families" ? "Search family, owner, member…" : "Search by name or email…"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 10,
                padding: "8px 14px",
                color: "#fff",
                fontSize: 13,
                fontFamily: "inherit",
                outline: "none",
                width: 320,
                maxWidth: "100%",
              }}
            />
          </div>

          {tab === "families" ? (
            <FamilyTable families={familiesFiltered} formatDate={formatDate} timeAgo={timeAgo} />
          ) : (
            <UserTable users={usersWithoutHousehold} formatDate={formatDate} onDelete={handleDeleteUser} />
          )}
        </div>
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "rgba(74,127,220,0.25)" : "transparent",
        border: `1px solid ${active ? "rgba(74,127,220,0.5)" : "rgba(255,255,255,0.12)"}`,
        color: active ? "#7BB8FF" : "rgba(200,220,255,0.7)",
        fontSize: 13,
        fontWeight: 700,
        padding: "7px 14px",
        borderRadius: 8,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

// ── Families table ────────────────────────────────────────────────

function FamilyTable({
  families,
  formatDate,
  timeAgo,
}: {
  families: HouseholdAdmin[];
  formatDate: (d: string) => string;
  timeAgo: (d: string) => string;
}) {
  if (families.length === 0) {
    return (
      <div style={{ padding: "48px 24px", textAlign: "center", color: "rgba(160,185,255,0.5)", fontSize: 14 }}>
        No families yet.
      </div>
    );
  }

  return (
    <div>
      {/* Column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1.6fr 110px 100px 110px 100px",
          gap: 12,
          padding: "11px 22px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        {["Family", "Owner", "Members", "Plan", "Created", ""].map((h, i) => (
          <div
            key={i}
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(130,165,230,0.55)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}
          >
            {h}
          </div>
        ))}
      </div>

      {families.map((fam, i) => {
        const owner = fam.members.find((m) => m.role === "OWNER");
        const childCount = fam.members.filter((m) => m.role === "CHILD").length;
        const adultCount = fam.members.length - childCount;

        return (
          <Link
            key={fam.id}
            href={`/admin/families/${fam.id}`}
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1.6fr 110px 100px 110px 100px",
              gap: 12,
              alignItems: "center",
              padding: "14px 22px",
              borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.07)",
              textDecoration: "none",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(74,127,220,0.08)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
            }}
          >
            <span
              style={{
                fontWeight: 700,
                color: "#fff",
                fontSize: 14,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              🏠 {fam.name ?? "Unnamed household"}
            </span>
            <span
              style={{
                color: "rgba(200,220,255,0.75)",
                fontSize: 13,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {owner ? owner.user.email : "— no owner —"}
            </span>
            <span style={{ color: "rgba(200,220,255,0.75)", fontSize: 13 }}>
              {adultCount} adult{adultCount === 1 ? "" : "s"}, {childCount} child
              {childCount === 1 ? "" : "ren"}
            </span>
            <span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: fam.is_pro ? "rgba(74,127,220,0.2)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${fam.is_pro ? "rgba(74,127,220,0.4)" : "rgba(255,255,255,0.12)"}`,
                  color: fam.is_pro ? "#7BB8FF" : "rgba(200,220,255,0.7)",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 9px",
                  borderRadius: 50,
                }}
              >
                {fam.is_pro ? "⚡ Pro" : "Free"}
              </span>
            </span>
            <span style={{ color: "rgba(175,200,255,0.6)", fontSize: 12 }}>
              {formatDate(fam.createdAt)}
              <div style={{ fontSize: 10, color: "rgba(140,170,220,0.45)", marginTop: 2 }}>
                {timeAgo(fam.createdAt)}
              </div>
            </span>
            <span
              style={{
                color: "rgba(130,180,255,0.85)",
                fontSize: 12,
                fontWeight: 700,
                textAlign: "right",
              }}
            >
              Open →
            </span>
          </Link>
        );
      })}
    </div>
  );
}

// ── Users-without-family table (secondary tab) ────────────────────

function UserTable({
  users,
  formatDate,
  onDelete,
}: {
  users: UserLite[];
  formatDate: (d: string) => string;
  onDelete: (id: string, email: string) => void;
}) {
  if (users.length === 0) {
    return (
      <div style={{ padding: "48px 24px", textAlign: "center", color: "rgba(160,185,255,0.5)", fontSize: 14 }}>
        No orphan users — everyone belongs to a family.
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1.6fr 110px 90px 80px",
          gap: 12,
          padding: "11px 22px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        {["Name", "Email", "Joined", "Reminders", ""].map((h, i) => (
          <div
            key={i}
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(130,165,230,0.55)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}
          >
            {h}
          </div>
        ))}
      </div>

      {users.map((user, i) => (
        <div
          key={user.id}
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1.6fr 110px 90px 80px",
            gap: 12,
            alignItems: "center",
            padding: "14px 22px",
            borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <span
            style={{
              fontWeight: 600,
              color: user.name ? "#fff" : "rgba(160,185,255,0.4)",
              fontSize: 14,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontStyle: user.name ? "normal" : "italic",
            }}
          >
            {user.name ?? "No name"}
          </span>
          <span
            style={{
              color: "rgba(175,200,255,0.65)",
              fontSize: 13,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user.email}
          </span>
          <span style={{ color: "rgba(175,200,255,0.65)", fontSize: 13 }}>
            {formatDate(user.createdAt)}
          </span>
          <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{user._count.reminders}</span>
          <div>
            {user.email !== ADMIN_EMAIL && (
              <button
                onClick={() => onDelete(user.id, user.email)}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,107,107,0.8)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
