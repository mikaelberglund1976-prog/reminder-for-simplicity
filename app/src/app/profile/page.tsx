"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type HouseholdMember = {
  id: string;
  role: string;
  user: { id: string; name: string | null; email: string };
};
type HouseholdData = {
  id: string;
  name: string | null;
  is_pro: boolean;
  members: HouseholdMember[];
  invites: { id: string; email: string; createdAt: string }[];
};

const CURRENCIES = [
  { value: "SEK", label: "SEK — Swedish Krona" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "NOK", label: "NOK — Norwegian Krone" },
  { value: "DKK", label: "DKK — Danish Krone" },
];

const TIMEZONES = [
  "Europe/Stockholm", "Europe/London", "Europe/Berlin", "Europe/Paris",
  "America/New_York", "America/Chicago", "America/Los_Angeles",
  "Asia/Tokyo", "Australia/Sydney",
];

const REMINDER_TIMES = [
  "07:00", "08:00", "09:00", "10:00", "12:00", "15:00", "18:00", "20:00",
];

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

type Profile = {
  name: string;
  email: string;
  preferredCurrency: string;
  timezone: string;
  createdAt: string;
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    preferredCurrency: "SEK",
    timezone: "Europe/Stockholm",
    defaultReminderTime: "09:00",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [household, setHousehold] = useState<HouseholdData | null>(null);
  const [householdRole, setHouseholdRole] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("ADULT");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [reassignData, setReassignData] = useState<{ removedUser: { name: string | null; email: string }; assignedReminders: { id: string; name: string; date: string }[] } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState("");
  const [renamingHousehold, setRenamingHousehold] = useState(false);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  useEffect(() => {
    if (status === "authenticated") { fetchProfile(); fetchHousehold(); }
  }, [status]);

  async function fetchProfile() {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setForm({
          firstName: (data.name || "").split(" ")[0],
          lastName: (data.name || "").split(" ").slice(1).join(" "),
          phone: data.phone || "",
          preferredCurrency: data.preferredCurrency || "SEK",
          timezone: data.timezone || "Europe/Stockholm",
          defaultReminderTime: data.defaultReminderTime || "09:00",
        });
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function fetchHousehold() {
    try {
      const res = await fetch("/api/household");
      if (res.ok) {
        const data = await res.json();
        setHousehold(data.household);
        setHouseholdRole(data.role ?? null);
      }
    } catch (e) { console.error(e); }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true); setInviteMsg(null);
    try {
      const res = await fetch("/api/household/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setInviteEmail("");
      setInviteMsg({ type: "ok", text: `Invite sent to ${inviteEmail} ✓` });
      fetchHousehold();
    } catch (err: unknown) {
      setInviteMsg({ type: "err", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally { setInviting(false); }
  }

  async function handleRenameHousehold() {
    if (!newHouseholdName.trim()) return;
    setRenamingHousehold(true);
    try {
      const res = await fetch("/api/household", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newHouseholdName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setEditingName(false);
      fetchHousehold();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to rename.");
    } finally { setRenamingHousehold(false); }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm("Remove this member from the household?")) return;
    setRemovingMemberId(memberId);
    try {
      const res = await fetch(`/api/household/members/${memberId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      if (data.assignedReminders?.length > 0) {
        setReassignData({ removedUser: data.removedUser, assignedReminders: data.assignedReminders });
      }
      fetchHousehold();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to remove member.");
    } finally { setRemovingMemberId(null); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, name: [form.firstName, form.lastName].filter(Boolean).join(" ") }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Error"); }
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setSaving(false); }
  }

  const set = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const isGoogleUser = session?.user?.image?.includes("googleusercontent");

  if (status === "loading" || loading) return (
    <div style={{ minHeight: "100vh", background: "#F5F6FA", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <span style={{ color: "#8B90A4", fontSize: 15 }}>AssistIQ is thinking…</span>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F5F6FA", fontFamily: FONT, paddingBottom: 100 }}>

      {/* Back */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 20px 0" }}>
        <Link href="/dashboard" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          color: "#8B90A4", fontSize: 14, fontWeight: 500, textDecoration: "none",
        }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </Link>
      </div>

      <main style={{ maxWidth: 480, margin: "0 auto", padding: "20px 20px 0" }}>

        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "#5B9CF5", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, color: "#fff", fontWeight: 700, flexShrink: 0,
            boxShadow: "0 2px 8px rgba(91,156,245,0.35)",
          }}>
            {form.firstName ? form.firstName[0].toUpperCase() : (session?.user?.name?.[0] ?? "?")}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1A2340", letterSpacing: "-0.4px" }}>
              {[form.firstName, form.lastName].filter(Boolean).join(" ") || session?.user?.name || "My Profile"}
            </div>
            <div style={{ fontSize: 13, color: "#8B90A4", marginTop: 2 }}>
              {profile?.email || session?.user?.email}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: "#FFF0F0", border: "1px solid #F5CCCC", color: "#D94F4F", borderRadius: 12, padding: "12px 16px", fontSize: 14, marginBottom: 20 }}>
            {error}
          </div>
        )}
        {saved && (
          <div style={{ background: "#F0FFF6", border: "1px solid #B8F0D0", color: "#2E9A5F", borderRadius: 12, padding: "12px 16px", fontSize: 14, marginBottom: 20 }}>
            Changes saved ✓
          </div>
        )}

        <form onSubmit={handleSave}>

          {/* ── Personal ── */}
          <Card title="Personal">
            <div style={{ display: "flex", gap: 10 }}>
              <Field label="First name">
                <input
                  type="text" value={form.firstName}
                  onChange={e => set("firstName", e.target.value)}
                  placeholder="Mikael"
                  style={inputStyle}
                />
              </Field>
              <Field label="Last name">
                <input
                  type="text" value={form.lastName}
                  onChange={e => set("lastName", e.target.value)}
                  placeholder="Berglund"
                  style={inputStyle}
                />
              </Field>
            </div>
            <Field label="Email address">
              <input
                type="email" value={profile?.email || session?.user?.email || ""}
                readOnly disabled
                style={{ ...inputStyle, color: "#B0B7C8", cursor: "not-allowed" }}
              />
              <Hint>Email cannot be changed.</Hint>
            </Field>
            <Field label="WhatsApp Number">
              <input
                type="tel" value={form.phone}
                onChange={e => set("phone", e.target.value)}
                placeholder="+46 70 123 45 67 (optional)"
                style={inputStyle}
              />
              <Hint>Used for future WhatsApp alerts. Optional.</Hint>
            </Field>
          </Card>

          {/* ── Preferences ── */}
          <Card title="Preferences">
            <Field label="Preferred currency">
              <SelectWrap>
                <select
                  value={form.preferredCurrency}
                  onChange={e => set("preferredCurrency", e.target.value)}
                  style={{ ...inputStyle, appearance: "none", WebkitAppearance: "none", paddingRight: 36, cursor: "pointer" }}
                >
                  {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <Chevron />
              </SelectWrap>
              <Hint>Used to display amounts in reminders.</Hint>
            </Field>
            <Field label="Time zone">
              <SelectWrap>
                <select
                  value={form.timezone}
                  onChange={e => set("timezone", e.target.value)}
                  style={{ ...inputStyle, appearance: "none", WebkitAppearance: "none", paddingRight: 36, cursor: "pointer" }}
                >
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace("_", " ")}</option>)}
                </select>
                <Chevron />
              </SelectWrap>
              <Hint>Controls when your reminder emails are sent.</Hint>
            </Field>
            <Field label="Default reminder time">
              <SelectWrap>
                <select
                  value={form.defaultReminderTime}
                  onChange={e => set("defaultReminderTime", e.target.value)}
                  style={{ ...inputStyle, appearance: "none", WebkitAppearance: "none", paddingRight: 36, cursor: "pointer" }}
                >
                  {REMINDER_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <Chevron />
              </SelectWrap>
              <Hint>Time of day when reminder emails are delivered.</Hint>
            </Field>
          </Card>

          {/* ── Notifications ── */}
          <Card title="Notifications">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 16, borderBottom: "1px solid #F0F2F7" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1A2340" }}>Email</div>
                <div style={{ fontSize: 12, color: "#8B90A4", marginTop: 2 }}>
                  {profile?.email || session?.user?.email}
                </div>
              </div>
              <span style={{
                background: "#EEF5FF", color: "#5B9CF5", fontSize: 12, fontWeight: 700,
                padding: "4px 12px", borderRadius: 50,
              }}>Active</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, opacity: 0.45 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1A2340" }}>SMS</div>
                <div style={{ fontSize: 12, color: "#8B90A4", marginTop: 2 }}>Text message alerts</div>
              </div>
              <span style={{
                background: "#F5F6FA", color: "#8B90A4", fontSize: 12, fontWeight: 700,
                padding: "4px 12px", borderRadius: 50, border: "1.5px solid #E8EDF4",
              }}>Coming soon</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, opacity: 0.45 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1A2340" }}>Push notifications</div>
                <div style={{ fontSize: 12, color: "#8B90A4", marginTop: 2 }}>Browser & mobile app alerts</div>
              </div>
              <span style={{
                background: "#F5F6FA", color: "#8B90A4", fontSize: 12, fontWeight: 700,
                padding: "4px 12px", borderRadius: 50, border: "1.5px solid #E8EDF4",
              }}>Coming soon</span>
            </div>
          </Card>

          {/* ── Household ── */}
          <Card title="Household">
            {household ? (
              <>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 14, borderBottom: "1px solid #F0F2F7" }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                    {editingName && householdRole === "OWNER" ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          autoFocus
                          type="text"
                          value={newHouseholdName}
                          onChange={e => setNewHouseholdName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleRenameHousehold(); } if (e.key === "Escape") setEditingName(false); }}
                          style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "1.5px solid #5B9CF5", fontSize: 15, fontWeight: 700, fontFamily: FONT, outline: "none", color: "#1A2340" }}
                        />
                        <button type="button" onClick={handleRenameHousehold} disabled={renamingHousehold} style={{ padding: "6px 12px", background: "#1A2340", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: FONT }}>
                          {renamingHousehold ? "…" : "Save"}
                        </button>
                        <button type="button" onClick={() => setEditingName(false)} style={{ padding: "6px 10px", background: "none", border: "1.5px solid #E8EDF4", borderRadius: 8, fontSize: 12, color: "#8B90A4", cursor: "pointer", fontFamily: FONT }}>✕</button>
                      </div>
                    ) : (
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 6, cursor: householdRole === "OWNER" ? "pointer" : "default" }}
                        onClick={() => { if (householdRole === "OWNER") { setNewHouseholdName(household.name ?? ""); setEditingName(true); } }}
                      >
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#1A2340" }}>🏠 {household.name ?? "My Household"}</div>
                        {householdRole === "OWNER" && <span style={{ fontSize: 11, color: "#C0C7D6" }}>✎</span>}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: "#8B90A4", marginTop: 2 }}>{household.members.length} member{household.members.length !== 1 ? "s" : ""}</div>
                  </div>
                  {household.is_pro ? (
                    <span style={{ background: "linear-gradient(135deg,#EEF5FF,#F0EDFF)", border: "1.5px solid #C7BBFF", color: "#5B4ECC", fontSize: 12, fontWeight: 700, padding: "5px 14px", borderRadius: 50, flexShrink: 0 }}>⚡ Pro</span>
                  ) : (
                    <span style={{ background: "#F5F6FA", color: "#8B90A4", fontSize: 12, fontWeight: 700, padding: "5px 14px", borderRadius: 50, border: "1.5px solid #E8EDF4", flexShrink: 0 }}>Free</span>
                  )}
                </div>

                {/* Members list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {household.members.map((m) => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#EEF5FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#5B9CF5", flexShrink: 0 }}>
                        {(m.user.name ?? m.user.email)[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#1A2340", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {m.user.name ?? m.user.email}
                        </div>
                        <div style={{ fontSize: 12, color: "#8B90A4" }}>{m.role === "OWNER" ? "Owner" : "Member"}</div>
                      </div>
                      {householdRole === "OWNER" && m.role !== "OWNER" && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.id)}
                          disabled={removingMemberId === m.id}
                          style={{ background: "none", border: "none", color: "#D94F4F", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "4px 8px", borderRadius: 8, flexShrink: 0 }}
                        >
                          {removingMemberId === m.id ? "…" : "Remove"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pending invites */}
                {household.invites.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #F0F2F7" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#8B90A4", marginBottom: 8 }}>Pending invites</div>
                    {household.invites.map(inv => (
                      <div key={inv.id} style={{ fontSize: 13, color: "#B0B7C8", padding: "4px 0" }}>✉ {inv.email}</div>
                    ))}
                  </div>
                )}

                {/* Invite form (OWNER + Pro only) */}
                {householdRole === "OWNER" && household.is_pro ? (
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #F0F2F7" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2340", marginBottom: 10 }}>Invite a member</div>
                    {inviteMsg && (
                      <div style={{ background: inviteMsg.type === "ok" ? "#F0FFF6" : "#FFF0F0", border: `1px solid ${inviteMsg.type === "ok" ? "#B8F0D0" : "#F5CCCC"}`, color: inviteMsg.type === "ok" ? "#2E9A5F" : "#D94F4F", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 12 }}>
                        {inviteMsg.text}
                      </div>
                    )}
                    {/* Role selector */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                      {[
                        { value: "PARENT", label: "🧑‍🦱 Parent" },
                        { value: "ADULT",  label: "🧑 Adult" },
                        { value: "CHILD",  label: "👦 Child" },
                      ].map(r => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setInviteRole(r.value)}
                          style={{
                            padding: "7px 14px", borderRadius: 50, fontSize: 12, fontWeight: 600,
                            border: inviteRole === r.value ? "none" : "1.5px solid #E8EDF4",
                            background: inviteRole === r.value ? "#1A2340" : "#fff",
                            color: inviteRole === r.value ? "#fff" : "#8B90A4",
                            cursor: "pointer", fontFamily: FONT, transition: "all 0.15s",
                          }}
                        >{r.label}</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleInvite(e as unknown as React.FormEvent); } }}
                        placeholder="partner@email.com"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button
                        type="button"
                        disabled={inviting}
                        onClick={handleInvite as unknown as React.MouseEventHandler}
                        style={{ padding: "12px 18px", background: "#1A2340", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, color: "#fff", cursor: inviting ? "not-allowed" : "pointer", fontFamily: FONT, flexShrink: 0, opacity: inviting ? 0.6 : 1 }}
                      >
                        {inviting ? "…" : "Send invite"}
                      </button>
                    </div>
                    <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 8 }}>They&apos;ll receive an email with a link to join. Valid for 48 hours.</div>
                  </div>
                ) : householdRole === "OWNER" && !household.is_pro ? (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #F0F2F7", background: "linear-gradient(135deg,#EEF5FF,#F5F0FF)", borderRadius: 12, padding: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 18 }}>⚡</span>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1A2340" }}>Inviting requires Pro</div>
                    </div>
                    <div style={{ fontSize: 12, color: "#8B90A4", lineHeight: 1.5 }}>Ask your admin to enable Pro for your household to invite family members.</div>
                  </div>
                ) : null}

                {/* Re-assignment wizard */}
                {reassignData && (
                  <div style={{ marginTop: 16, background: "#FFF9E6", border: "1.5px solid #F6E05E", borderRadius: 14, padding: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#B7791F", marginBottom: 8 }}>
                      ⚠ {reassignData.removedUser.name ?? reassignData.removedUser.email} left — {reassignData.assignedReminders.length} reminder{reassignData.assignedReminders.length !== 1 ? "s" : ""} need a new owner
                    </div>
                    {reassignData.assignedReminders.map(r => (
                      <div key={r.id} style={{ fontSize: 13, color: "#1A2340", padding: "4px 0", borderTop: "1px solid rgba(246,224,94,0.4)" }}>
                        📌 <Link href={`/dashboard/${r.id}`} style={{ color: "#5B9CF5", textDecoration: "none", fontWeight: 600 }}>{r.name}</Link>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setReassignData(null)}
                      style={{ marginTop: 12, padding: "8px 16px", background: "#1A2340", border: "none", borderRadius: 50, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: FONT }}
                    >
                      Got it — I&apos;ll reassign them
                    </button>
                  </div>
                )}
              </>
            ) : (
              <CreateHousehold onCreated={fetchHousehold} />
            )}
          </Card>

          {/* ── Subscription ── */}
          <Card title="Subscription">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 16, borderBottom: "1px solid #F0F2F7" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#8B90A4", marginBottom: 2 }}>Current plan</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1A2340" }}>
                  {household?.is_pro ? (
                    <>Pro <span style={{ fontSize: 14, color: "#5B9CF5", fontWeight: 500 }}>(Active)</span></>
                  ) : (
                    <>Basic <span style={{ fontSize: 14, color: "#8B90A4", fontWeight: 500 }}>(Free)</span></>
                  )}
                </div>
              </div>
              <span style={{ background: household?.is_pro ? "linear-gradient(135deg,#EEF5FF,#F0EDFF)" : "#EEF5FF", color: household?.is_pro ? "#5B4ECC" : "#5B9CF5", fontSize: 12, fontWeight: 700, padding: "5px 14px", borderRadius: 50, border: household?.is_pro ? "1.5px solid #C7BBFF" : "none" }}>
                {household?.is_pro ? "⚡ Pro" : "Active"}
              </span>
            </div>
            {!household?.is_pro && (
              <div style={{ paddingTop: 16 }}>
                <div style={{ fontSize: 13, color: "#8B90A4", marginBottom: 14, lineHeight: 1.5 }}>
                  Unlock family sharing, handovers, safety net and more with Pro.
                </div>
                <div style={{ background: "linear-gradient(135deg,#EEF5FF,#F5F0FF)", borderRadius: 12, padding: 14, fontSize: 13, color: "#5B4ECC", fontWeight: 600, textAlign: "center" }}>
                  ⚡ Pro is enabled by your admin during the evaluation period
                </div>
              </div>
            )}
          </Card>

          {/* ── Security ── */}
          <Card title="Security">
            {isGoogleUser ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#8B90A4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1A2340" }}>Signed in with Google</div>
                  <div style={{ fontSize: 12, color: "#8B90A4", marginTop: 2 }}>Password is managed by Google.</div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                style={{
                  width: "100%", padding: "13px 16px", background: "#fff",
                  border: "1.5px solid #E8EDF4", borderRadius: 14, fontSize: 14,
                  fontWeight: 600, color: "#1A2340", cursor: "pointer",
                  textAlign: "left", fontFamily: FONT, display: "flex", alignItems: "center", gap: 10,
                }}
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#8B90A4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Change password
              </button>
            )}

            <div style={{ marginTop: 12 }}>
              {showDeleteConfirm ? (
                <div style={{ background: "#FFF0F0", border: "1px solid #F5CCCC", borderRadius: 14, padding: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#D94F4F", marginBottom: 8 }}>
                    Delete account?
                  </div>
                  <div style={{ fontSize: 13, color: "#8B90A4", marginBottom: 14 }}>
                    All your reminders will be permanently deleted. This cannot be undone.
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      style={{ flex: 1, padding: "11px", background: "#fff", border: "1.5px solid #E8EDF4", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#8B90A4", cursor: "pointer", fontFamily: FONT }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      style={{ flex: 1, padding: "11px", background: "#D94F4F", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: FONT }}
                    >
                      Yes, delete
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    width: "100%", padding: "13px 16px", background: "#FFF5F5",
                    border: "1.5px solid #F5CCCC", borderRadius: 14, fontSize: 14,
                    fontWeight: 600, color: "#D94F4F", cursor: "pointer",
                    textAlign: "left", fontFamily: FONT, display: "flex", alignItems: "center", gap: 10,
                  }}
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#D94F4F" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                  Delete account
                </button>
              )}
            </div>
          </Card>

          {/* Save + Sign out */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                width: "100%", padding: "17px", borderRadius: 50,
                background: "#1A2340", border: "none",
                fontSize: 16, fontWeight: 600, color: "#fff",
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: "0 2px 10px rgba(26,35,64,0.22)",
                fontFamily: FONT, transition: "all 0.15s",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              style={{
                width: "100%", padding: "17px", borderRadius: 50,
                background: "#fff", border: "1.5px solid #E8EDF4",
                fontSize: 16, fontWeight: 600, color: "#4B5563",
                cursor: "pointer", fontFamily: FONT, transition: "all 0.15s",
              }}
            >
              Sign out
            </button>
          </div>

          {profile?.createdAt && (
            <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "#C0C7D6" }}>
              Member since {new Date(profile.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </div>
          )}

        </form>
      </main>
    </div>
  );
}

// ── CreateHousehold ──
function CreateHousehold({ onCreated }: { onCreated: () => void }) {
  const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");

  async function handle() {
    setCreating(true); setErr("");
    try {
      const res = await fetch("/api/household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      onCreated();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setCreating(false); }
  }

  return (
    <div>
      <div style={{ fontSize: 14, color: "#8B90A4", marginBottom: 16, textAlign: "center" }}>
        You don&apos;t have a household yet. Create one to invite family members.
      </div>
      {err && (
        <div style={{ background: "#FFF0F0", border: "1px solid #F5CCCC", color: "#D94F4F", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 12 }}>
          {err}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Berglund Family"
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handle(); } }}
          style={{ flex: 1, padding: "12px 14px", borderRadius: 12, border: "1.5px solid #E8EDF4", fontSize: 14, fontFamily: FONT, background: "#F9FAFB", outline: "none", color: "#1A2340" }}
        />
        <button
          type="button"
          onClick={handle}
          disabled={creating}
          style={{ padding: "12px 18px", background: "#1A2340", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, color: "#fff", cursor: creating ? "not-allowed" : "pointer", fontFamily: FONT, flexShrink: 0, opacity: creating ? 0.6 : 1 }}
        >
          {creating ? "…" : "Create"}
        </button>
      </div>
    </div>
  );
}

// ── Helpers ──
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 20, padding: 20,
      marginBottom: 16, border: "1.5px solid #E8EDF4",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 18 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>{children}</div>;
}

function SelectWrap({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "relative" }}>
      {children}
      <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#8B90A4" }}>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );
}

function Chevron() { return null; } // rendered inside SelectWrap above

const inputStyle: React.CSSProperties = {
  width: "100%", background: "#F5F6FA", border: "1.5px solid #E8EDF4",
  borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "#1A2340",
  outline: "none", fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
  boxSizing: "border-box",
};
