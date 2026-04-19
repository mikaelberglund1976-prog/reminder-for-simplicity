"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { StarBackground } from "@/components/StarBackground";

const ADMIN_EMAIL = "mikaelberglund1976@gmail.com";

type Member = {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    createdAt: string;
    isChildProfile: boolean;
  };
};

type Invite = {
  id: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
};

type ReminderLite = {
  id: string;
  name: string;
  category: string;
  recurrence: string;
  date: string;
  assignedTo: string | null;
  isActive: boolean;
  createdAt: string;
  userId: string;
};

type FamilyTrialInfo = {
  id: string;
  startedAt: string;
  expiresAt: string;
  childId: string;
  createdBy: string;
};

type HouseholdDetail = {
  id: string;
  name: string | null;
  is_pro: boolean;
  createdAt: string;
  updatedAt: string;
  members: Member[];
  invites: Invite[];
  reminders: ReminderLite[];
  familyTrial: FamilyTrialInfo | null;
};

const bg =
  "radial-gradient(ellipse at 60% 25%, #1e3f8a 0%, #0e2268 28%, #070f3c 60%, #030820 100%)";
const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 16,
  padding: 24,
  marginBottom: 20,
};

export default function FamilyDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const householdId = params?.id as string;

  const [household, setHousehold] = useState<HouseholdDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [togglingPro, setTogglingPro] = useState(false);
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [deletingHousehold, setDeletingHousehold] = useState(false);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session?.user?.email !== ADMIN_EMAIL) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email === ADMIN_EMAIL) fetchData();
  }, [status, session, householdId]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/households/${householdId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to load family");
        return;
      }
      const data = await res.json();
      setHousehold(data.household);
      setNameValue(data.household.name ?? "");
    } catch (e) {
      console.error(e);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function notify(type: "ok" | "err", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  }

  async function handleSaveName() {
    setSavingName(true);
    try {
      const res = await fetch(`/api/admin/households/${householdId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed");
      }
      setEditingName(false);
      await fetchData();
      notify("ok", "Family name updated ✓");
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "Failed.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleTogglePro() {
    if (!household) return;
    setTogglingPro(true);
    try {
      const res = await fetch(`/api/admin/households/${householdId}/toggle-pro`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      await fetchData();
      notify("ok", "Pro status toggled ✓");
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "Failed.");
    } finally {
      setTogglingPro(false);
    }
  }

  async function handleAddMember() {
    if (!addMemberEmail.includes("@")) {
      notify("err", "Enter a valid email.");
      return;
    }
    setAddingMember(true);
    try {
      const res = await fetch(`/api/admin/households/${householdId}/add-member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addMemberEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setAddMemberEmail("");
      await fetchData();
      notify("ok", `${data.userName ?? addMemberEmail} added ✓`);
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "Failed.");
    } finally {
      setAddingMember(false);
    }
  }

  async function handleRemoveMember(userId: string, label: string) {
    if (!confirm(`Remove ${label} from this family?`)) return;
    setRemovingUserId(userId);
    try {
      const res = await fetch(`/api/admin/households/${householdId}/remove-member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      await fetchData();
      notify("ok", `Removed ${label} ✓`);
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "Failed.");
    } finally {
      setRemovingUserId(null);
    }
  }

  async function handleDeleteHousehold() {
    if (!household) return;
    const label = household.name ?? "this family";
    if (
      !confirm(
        `Delete ${label}?\n\nThis removes the household, all memberships, reminders, and invites. User accounts (adults) are kept; child profiles are deleted with the household.`
      )
    )
      return;
    setDeletingHousehold(true);
    try {
      const res = await fetch(`/api/admin/households/${householdId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed");
      }
      router.push("/admin");
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "Failed.");
      setDeletingHousehold(false);
    }
  }

  async function handleRevokeInvite(inviteId: string, email: string) {
    if (!confirm(`Revoke invite for ${email}?`)) return;
    setRevokingInviteId(inviteId);
    try {
      const res = await fetch(`/api/admin/invites/${inviteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      await fetchData();
      notify("ok", `Invite for ${email} revoked ✓`);
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "Failed.");
    } finally {
      setRevokingInviteId(null);
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function timeAgo(d: string) {
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (h < 1) return "just now";
    if (h < 24) return `${h}h ago`;
    return `${days}d ago`;
  }

  function timeUntil(d: string) {
    const diff = new Date(d).getTime() - Date.now();
    const h = Math.floor(diff / 3600000);
    if (h <= 0) return "expired";
    if (h < 24) return `${h}h left`;
    return `${Math.floor(h / 24)}d left`;
  }

  if (status === "loading" || loading) {
    return (
      <Frame>
        <span style={{ color: "rgba(180,200,255,0.7)", fontSize: 15 }}>Loading family…</span>
      </Frame>
    );
  }

  if (error || !household) {
    return (
      <Frame>
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 15, color: "#ff8f8f", marginBottom: 16 }}>{error ?? "Family not found."}</div>
          <Link
            href="/admin"
            style={{
              display: "inline-block",
              background: "rgba(74,127,220,0.25)",
              border: "1px solid rgba(74,127,220,0.4)",
              color: "#7BB8FF",
              fontSize: 13,
              fontWeight: 700,
              padding: "8px 18px",
              borderRadius: 50,
              textDecoration: "none",
            }}
          >
            ← Back to admin
          </Link>
        </div>
      </Frame>
    );
  }

  const owner = household.members.find((m) => m.role === "OWNER");
  const adults = household.members.filter((m) => m.role !== "CHILD");
  const children = household.members.filter((m) => m.role === "CHILD");
  const activeInvites = household.invites.filter((i) => !i.usedAt && new Date(i.expiresAt) > new Date());
  const chores = household.reminders.filter((r) => r.category === "CHORE");
  const personalReminders = household.reminders.filter((r) => r.category !== "CHORE");

  return (
    <div style={{ minHeight: "100vh", background: bg, position: "relative", overflow: "hidden" }}>
      <StarBackground />

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
          gap: 20,
        }}
      >
        <Link href="/admin" style={{ color: "rgba(180,205,255,0.75)", fontSize: 14, textDecoration: "none" }}>
          ← Admin
        </Link>
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 18 }}>|</span>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 18, letterSpacing: "-0.3px" }}>
          🏠 {household.name ?? "Unnamed family"}
        </span>
        {household.is_pro && (
          <span
            style={{
              background: "rgba(74,127,220,0.25)",
              border: "1px solid rgba(74,127,220,0.45)",
              color: "#7BB8FF",
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 50,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            ⚡ Pro
          </span>
        )}
      </header>

      <main style={{ position: "relative", zIndex: 10, maxWidth: 1000, margin: "0 auto", padding: "32px 24px 100px" }}>
        {msg && (
          <div
            style={{
              background: msg.type === "ok" ? "rgba(42,157,111,0.2)" : "rgba(217,79,79,0.18)",
              border: `1px solid ${msg.type === "ok" ? "rgba(42,157,111,0.4)" : "rgba(217,79,79,0.4)"}`,
              color: msg.type === "ok" ? "#5ee8a8" : "#ff8f8f",
              borderRadius: 10,
              padding: "12px 18px",
              fontSize: 14,
              marginBottom: 20,
            }}
          >
            {msg.text}
          </div>
        )}

        {/* Overview */}
        <div style={card}>
          <SectionTitle>Overview</SectionTitle>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <Label>Family name</Label>
              {editingName ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    autoFocus
                    style={{
                      flex: 1,
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: 8,
                      padding: "8px 12px",
                      color: "#fff",
                      fontSize: 14,
                      fontFamily: "inherit",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={savingName}
                    style={primaryBtn}
                  >
                    {savingName ? "…" : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setNameValue(household.name ?? "");
                    }}
                    style={secondaryBtn}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>
                    {household.name ?? <em style={{ color: "rgba(200,220,255,0.4)" }}>Unnamed</em>}
                  </span>
                  <button onClick={() => setEditingName(true)} style={linkBtn}>
                    Rename
                  </button>
                </div>
              )}
            </div>

            <div>
              <Label>Plan</Label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    background: household.is_pro ? "rgba(74,127,220,0.2)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${household.is_pro ? "rgba(74,127,220,0.4)" : "rgba(255,255,255,0.12)"}`,
                    color: household.is_pro ? "#7BB8FF" : "rgba(200,220,255,0.7)",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "4px 12px",
                    borderRadius: 50,
                  }}
                >
                  {household.is_pro ? "⚡ Pro" : "Free"}
                </span>
                <button onClick={handleTogglePro} disabled={togglingPro} style={linkBtn}>
                  {togglingPro ? "…" : household.is_pro ? "Disable Pro" : "Enable Pro"}
                </button>
              </div>
            </div>

            <div>
              <Label>Owner</Label>
              <span style={{ color: "#fff", fontSize: 14 }}>
                {owner ? owner.user.email : <em style={{ color: "rgba(200,220,255,0.4)" }}>— no owner —</em>}
              </span>
            </div>

            <div>
              <Label>Created</Label>
              <span style={{ color: "rgba(200,220,255,0.75)", fontSize: 14 }}>
                {formatDate(household.createdAt)} ({timeAgo(household.createdAt)})
              </span>
            </div>
          </div>

          {household.familyTrial && (
            <div
              style={{
                marginTop: 18,
                background: "rgba(255,180,50,0.07)",
                border: "1px solid rgba(255,180,50,0.25)",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 13,
                color: "rgba(220,230,255,0.85)",
              }}
            >
              <strong style={{ color: "#ffd080" }}>Family trial</strong> — started{" "}
              {formatDate(household.familyTrial.startedAt)}, expires {formatDate(household.familyTrial.expiresAt)} (
              {timeUntil(household.familyTrial.expiresAt)}).
            </div>
          )}
        </div>

        {/* Members */}
        <div style={card}>
          <SectionTitle>
            Members{" "}
            <span style={{ color: "rgba(180,200,255,0.5)", fontWeight: 400 }}>
              ({adults.length} adult{adults.length === 1 ? "" : "s"}, {children.length} child
              {children.length === 1 ? "" : "ren"})
            </span>
          </SectionTitle>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {household.members.length === 0 ? (
              <span style={{ color: "rgba(200,220,255,0.5)", fontSize: 13 }}>No members.</span>
            ) : (
              household.members.map((m) => (
                <div
                  key={m.id}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: m.role === "OWNER" ? "#ffd080" : m.role === "CHILD" ? "#A5B4FC" : "#7BB8FF",
                      color: "#1A2340",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    {(m.user.name ?? m.user.email).charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: "#fff",
                        fontSize: 14,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m.user.name ?? <em style={{ color: "rgba(200,220,255,0.5)" }}>No name</em>}
                    </div>
                    <div
                      style={{
                        color: "rgba(175,200,255,0.6)",
                        fontSize: 12,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m.user.isChildProfile ? "PIN login" : m.user.email}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color:
                        m.role === "OWNER"
                          ? "#ffd080"
                          : m.role === "CHILD"
                            ? "#A5B4FC"
                            : "rgba(175,200,255,0.7)",
                      background: "rgba(255,255,255,0.05)",
                      padding: "3px 8px",
                      borderRadius: 50,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      flexShrink: 0,
                    }}
                  >
                    {m.role}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(140,170,220,0.5)", flexShrink: 0 }}>
                    joined {timeAgo(m.joinedAt)}
                  </span>
                  {m.role !== "OWNER" && (
                    <button
                      onClick={() => handleRemoveMember(m.user.id, m.user.name ?? m.user.email)}
                      disabled={removingUserId === m.user.id}
                      style={{
                        background: "none",
                        border: "none",
                        color: removingUserId === m.user.id ? "rgba(255,107,107,0.4)" : "rgba(255,107,107,0.8)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: removingUserId === m.user.id ? "not-allowed" : "pointer",
                        padding: 0,
                      }}
                    >
                      {removingUserId === m.user.id ? "Removing…" : "Remove"}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add member */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="email"
              placeholder="Add existing user by email"
              value={addMemberEmail}
              onChange={(e) => setAddMemberEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddMember();
                }
              }}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                padding: "8px 12px",
                color: "#fff",
                fontSize: 13,
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <button onClick={handleAddMember} disabled={addingMember} style={primaryBtn}>
              {addingMember ? "Adding…" : "Add member"}
            </button>
          </div>
        </div>

        {/* Invites */}
        {activeInvites.length > 0 && (
          <div style={card}>
            <SectionTitle>Pending invites ({activeInvites.length})</SectionTitle>
            {activeInvites.map((inv) => (
              <div
                key={inv.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderTop: "1px solid rgba(255,180,50,0.12)",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <span style={{ fontSize: 13, color: "rgba(220,235,255,0.85)" }}>✉ {inv.email}</span>
                  <span style={{ fontSize: 11, color: "rgba(160,185,255,0.45)" }}>sent {timeAgo(inv.createdAt)}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,200,80,0.55)" }}>{timeUntil(inv.expiresAt)}</span>
                </div>
                <button
                  onClick={() => handleRevokeInvite(inv.id, inv.email)}
                  disabled={revokingInviteId === inv.id}
                  style={{
                    background: "none",
                    border: "none",
                    color: revokingInviteId === inv.id ? "rgba(255,107,107,0.4)" : "rgba(255,107,107,0.8)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: revokingInviteId === inv.id ? "not-allowed" : "pointer",
                    padding: 0,
                  }}
                >
                  {revokingInviteId === inv.id ? "Revoking…" : "Revoke"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Chores */}
        <div style={card}>
          <SectionTitle>
            Chores <span style={{ color: "rgba(180,200,255,0.5)", fontWeight: 400 }}>({chores.length})</span>
          </SectionTitle>
          {chores.length === 0 ? (
            <div style={{ color: "rgba(200,220,255,0.5)", fontSize: 13 }}>No chores yet.</div>
          ) : (
            chores.map((c, i) => {
              const assigned = household.members.find((m) => m.user.id === c.assignedTo);
              return (
                <div
                  key={c.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.4fr 1fr 100px 100px",
                    gap: 12,
                    alignItems: "center",
                    padding: "10px 0",
                    borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{c.name}</span>
                  <span style={{ color: "rgba(200,220,255,0.7)", fontSize: 12 }}>
                    {assigned ? `→ ${assigned.user.name ?? assigned.user.email}` : "— unassigned —"}
                  </span>
                  <span style={{ color: "rgba(175,200,255,0.65)", fontSize: 12 }}>{c.recurrence}</span>
                  <span
                    style={{
                      color: c.isActive ? "#5ee8a8" : "rgba(200,220,255,0.4)",
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      textAlign: "right",
                    }}
                  >
                    {c.isActive ? "Active" : "Archived"}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Personal reminders */}
        <div style={card}>
          <SectionTitle>
            Reminders{" "}
            <span style={{ color: "rgba(180,200,255,0.5)", fontWeight: 400 }}>({personalReminders.length})</span>
          </SectionTitle>
          {personalReminders.length === 0 ? (
            <div style={{ color: "rgba(200,220,255,0.5)", fontSize: 13 }}>No reminders yet.</div>
          ) : (
            personalReminders.slice(0, 20).map((r, i) => {
              const createdByMember = household.members.find((m) => m.user.id === r.userId);
              return (
                <div
                  key={r.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.4fr 0.8fr 0.8fr 100px",
                    gap: 12,
                    alignItems: "center",
                    padding: "10px 0",
                    borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{r.name}</span>
                  <span style={{ color: "rgba(200,220,255,0.7)", fontSize: 12 }}>{r.category}</span>
                  <span style={{ color: "rgba(200,220,255,0.7)", fontSize: 12 }}>
                    {createdByMember ? createdByMember.user.name ?? createdByMember.user.email : r.userId}
                  </span>
                  <span style={{ color: "rgba(175,200,255,0.65)", fontSize: 12, textAlign: "right" }}>
                    {formatDate(r.date)}
                  </span>
                </div>
              );
            })
          )}
          {personalReminders.length > 20 && (
            <div style={{ color: "rgba(200,220,255,0.45)", fontSize: 12, paddingTop: 10 }}>
              Showing 20 of {personalReminders.length} reminders.
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div
          style={{
            ...card,
            borderColor: "rgba(255,107,107,0.3)",
            background: "rgba(255,107,107,0.04)",
          }}
        >
          <SectionTitle>Danger zone</SectionTitle>
          <div style={{ color: "rgba(220,230,255,0.7)", fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
            Deleting this family removes the household, all memberships, reminders, chores, invites, and any active
            trial. Adult user accounts are kept. Child profiles (PIN login) are deleted with the household.
          </div>
          <button
            onClick={handleDeleteHousehold}
            disabled={deletingHousehold}
            style={{
              background: deletingHousehold ? "rgba(255,107,107,0.2)" : "rgba(255,107,107,0.18)",
              border: "1px solid rgba(255,107,107,0.4)",
              color: "#ff8f8f",
              fontSize: 13,
              fontWeight: 700,
              padding: "10px 20px",
              borderRadius: 50,
              cursor: deletingHousehold ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {deletingHousehold ? "Deleting…" : "🗑 Delete this family"}
          </button>
        </div>
      </main>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <StarBackground />
      <div style={{ position: "relative", zIndex: 10 }}>{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        color: "#fff",
        fontSize: 15,
        fontWeight: 700,
        margin: "0 0 16px",
      }}
    >
      {children}
    </h2>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "rgba(130,165,230,0.55)",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  background: "linear-gradient(160deg, #4a7ee0 0%, #2e5ec8 100%)",
  border: "none",
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  padding: "8px 16px",
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: "inherit",
};

const secondaryBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "rgba(200,220,255,0.8)",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 16px",
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: "inherit",
};

const linkBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#7BB8FF",
  fontSize: 12,
  fontWeight: 700,
  padding: 0,
  cursor: "pointer",
  fontFamily: "inherit",
};
