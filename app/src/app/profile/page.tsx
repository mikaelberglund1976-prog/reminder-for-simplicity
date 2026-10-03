"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PhoneInput from "@/components/PhoneInput";
import DeleteAccountSection from "@/components/DeleteAccountSection";
import DeletionRequestsCard from "@/components/DeletionRequestsCard";
import { getViewMode, setViewMode, ViewMode } from "@/lib/viewMode";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import Avatar from "@/components/Avatar";
import AvatarPicker from "@/components/AvatarPicker";
import { invalidateMe } from "@/lib/me";
import { DEFAULT_NAV_APPS, parseNavTabs } from "@/lib/navTabs";

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

// Bottom nav apps a person can choose from — 2026-07-28, "under sin person
// kunna säga vilka av apparna som ska ligga i bannern". Calendar isn't in
// this list: it's always shown and can't be turned off (see BottomNav.tsx).
// Keep this in sync with BOTTOM_NAV_APPS in /api/profile/route.ts.
// 2026-10-03: Home is now the fixed first tab, Calendar is one of the
// choices (lib/navTabs.ts handles old saved values).
const BOTTOM_NAV_APP_OPTIONS = [
  { key: "calendar", label: "Calendar", emoji: "📅" },
  { key: "shopping-list", label: "Shopping list", emoji: "🛒" },
  { key: "wishlist", label: "Wishlist", emoji: "🎁" },
  { key: "chores", label: "Chores", emoji: "🧹" },
  { key: "training", label: "Activities", emoji: "🎯" },
  { key: "school", label: "School", emoji: "📚" },
];
const DEFAULT_BOTTOM_NAV_APPS: string[] = [...DEFAULT_NAV_APPS];

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

type Profile = {
  name: string;
  email: string;
  preferredCurrency: string;
  timezone: string;
  createdAt: string;
  isChildProfile?: boolean;
  hasPassword?: boolean;
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
  const [household, setHousehold] = useState<HouseholdData | null>(null);
  const [access, setAccess] = useState<{ plan: "FREE" | "TRIAL" | "PRO"; proForever: boolean; proUntil: string | null; trialDaysLeft: number | null; canStartTrial: boolean; proRequested: boolean } | null>(null);
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
  const [pinChildren, setPinChildren] = useState<{ id: string; name: string; email?: string; emailVerified?: boolean }[]>([]);
  const [inviteSentTo, setInviteSentTo] = useState<string | null>(null);
  const [resendingChild, setResendingChild] = useState<string | null>(null);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editChildName, setEditChildName] = useState("");
  const [editChildEmail, setEditChildEmail] = useState("");
  const [editChildError, setEditChildError] = useState("");
  const [savingChildEdit, setSavingChildEdit] = useState(false);
  const [viewMode, setViewModeLocal] = useState<ViewMode>("mobile");
  const [bottomNavApps, setBottomNavApps] = useState<string[]>(DEFAULT_BOTTOM_NAV_APPS);
  const [savingBottomNav, setSavingBottomNav] = useState(false);

  useEffect(() => {
    setViewModeLocal(getViewMode());
  }, []);

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode);
    setViewModeLocal(mode);
  }

  // 2026-07-28 — toggle one app in/out of the bottom nav (3–4 non-Calendar
  // apps; Calendar itself is fixed, see BottomNav.tsx). Saves immediately,
  // same pattern as the view-mode switcher above.
  async function toggleBottomNavApp(key: string) {
    let next: string[];
    if (bottomNavApps.includes(key)) {
      if (bottomNavApps.length <= 3) return; // keep at least 3
      next = bottomNavApps.filter(k => k !== key);
    } else {
      if (bottomNavApps.length >= 4) return; // at most 4
      next = [...bottomNavApps, key];
    }
    setBottomNavApps(next);
    setSavingBottomNav(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bottomNavTabs: next }),
      });
      invalidateMe();
    } catch (e) { console.error(e); }
    finally { setSavingBottomNav(false); }
  }
  const [showAddPinChild, setShowAddPinChild] = useState(false);
  const [pinChildName, setPinChildName] = useState("");
  const [pinChildEmail, setPinChildEmail] = useState("");
  const [pinChildError, setPinChildError] = useState("");
  const [addingPinChild, setAddingPinChild] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [calendarFeedUrl, setCalendarFeedUrl] = useState<string | null>(null);
  const [calendarFeedLoading, setCalendarFeedLoading] = useState(false);
  const [calendarFeedCopied, setCalendarFeedCopied] = useState(false);
  const [phoneValid, setPhoneValid] = useState(true);

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
        if (data.bottomNavTabs) {
          setBottomNavApps(parseNavTabs(data.bottomNavTabs));
        }
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
        setAccess(data.access ?? null);
        if (data.household?.id) fetchPinChildren(data.household.id);
      }
    } catch (e) { console.error(e); }
  }

  async function fetchPinChildren(hid: string) {
    try {
      // 2026-09-27: authenticated endpoint (the old public PIN-switcher
      // endpoint /api/family/children was retired with PIN login).
      void hid;
      const res = await fetch(`/api/family/child-profiles`);
      if (res.ok) {
        const data = await res.json();
        setPinChildren(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); }
  }

  // 2026-09-27: family admin deletes a child account (soft delete, restorable 60 days)
  async function deleteChild(id: string, name: string) {
    if (!confirm(`Delete ${name}'s account? They'll be removed from the family and can't log in. The data is kept 60 days and can be restored on request.`)) return;
    setResendingChild(id);
    try {
      const res = await fetch(`/api/household/deletion-requests/${id}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete" }),
      });
      if (res.ok) setPinChildren(prev => prev.filter(c => c.id !== id));
    } finally { setResendingChild(null); }
  }

  async function resendChildInvite(id: string, email?: string) {
    setResendingChild(id);
    try {
      const res = await fetch(`/api/family/child-profiles/${id}/invite`, { method: "POST" });
      if (res.ok) setInviteSentTo(email ?? "their email");
    } finally { setResendingChild(null); }
  }

  function startEditChild(c: { id: string; name: string; email?: string }) {
    setEditingChildId(c.id);
    setEditChildName(c.name);
    setEditChildEmail(c.email ?? "");
    setEditChildError("");
  }

  async function saveChildEdit() {
    if (!editingChildId) return;
    if (!editChildName.trim()) { setEditChildError("Enter a name"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editChildEmail.trim())) { setEditChildError("Enter a valid email"); return; }
    setSavingChildEdit(true); setEditChildError("");
    try {
      const res = await fetch(`/api/family/child-profiles/${editingChildId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editChildName.trim(), email: editChildEmail.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setEditChildError(data.error ?? `Error ${res.status}`); return; }
      setEditingChildId(null);
      if (household?.id) fetchPinChildren(household.id);
    } catch (e) {
      setEditChildError("Could not reach server: " + String(e));
    } finally {
      setSavingChildEdit(false);
    }
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
      // 2026-07-28: if this email already belongs to someone with their own
      // account, say so up front — accepting the invite moves them out of
      // their current household (existing behavior, see auth.ts
      // autoJoinPendingInvite), not something that should surprise anyone.
      setInviteMsg({
        type: "ok",
        text: data.existingUser
          ? `Invite sent to ${inviteEmail} ✓ — they already have an account. Accepting will move them out of their current household into yours.`
          : `Invite sent to ${inviteEmail} ✓`,
      });
      fetchHousehold();
    } catch (err: unknown) {
      setInviteMsg({ type: "err", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally { setInviting(false); }
  }

  async function handleBroadcast() {
    if (!broadcastMessage.trim()) return;
    setBroadcasting(true); setBroadcastMsg(null);
    try {
      const res = await fetch("/api/family/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: broadcastMessage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setBroadcastMsg({ type: "ok", text: `Sent to ${data.sent} of ${data.total} member${data.total !== 1 ? "s" : ""} ✓` });
      setBroadcastMessage("");
      setShowBroadcast(false);
    } catch (err: unknown) {
      setBroadcastMsg({ type: "err", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally { setBroadcasting(false); }
  }

  // "Sync with your calendar" — lazily fetches (or, on rotate, regenerates)
  // the user's personal ICS feed link. See PRODUCT_SPEC.md 4b.19.
  async function fetchCalendarFeed(rotate = false) {
    setCalendarFeedLoading(true);
    try {
      const res = await fetch("/api/profile/calendar-feed", { method: rotate ? "POST" : "GET" });
      const data = await res.json();
      if (res.ok) setCalendarFeedUrl(data.url);
    } catch (e) {
      console.error(e);
    } finally {
      setCalendarFeedLoading(false);
    }
  }

  function copyCalendarFeedUrl() {
    if (!calendarFeedUrl) return;
    navigator.clipboard.writeText(calendarFeedUrl);
    setCalendarFeedCopied(true);
    setTimeout(() => setCalendarFeedCopied(false), 2000);
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
    e.preventDefault();
    if (!phoneValid) {
      setError("Please fix the phone number before saving.");
      return;
    }
    setSaving(true); setError(""); setSaved(false);
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

  // Derived from the DB (hasPassword), not session.user.image — the image
  // is only present on a session that came directly from the Google OAuth
  // flow, so it was wrongly showing "Change password" after logging in via
  // PIN on an account that's actually Google-linked. A missing password
  // means the account was created via Google (see auth.ts signIn callback).
  const isGoogleUser = profile ? !profile.hasPassword : session?.user?.image?.includes("googleusercontent");

  if (status === "loading" || loading) return (
    <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <span style={{ color: "var(--muted)", fontSize: 15 }}>Reminder for Simplicity is thinking…</span>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT, paddingBottom: 100 }}>

      {/* Back */}
      <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "20px 20px 0" }}>
        <Link href="/dashboard" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          color: "var(--muted)", fontSize: 14, fontWeight: 500, textDecoration: "none",
        }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </Link>
      </div>

      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "20px 20px 0" }}>

        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          {/* 2026-10-01: the real photo (same as everywhere else), tap to change it. */}
          {session?.user?.id ? (
            <AvatarPicker userId={session.user.id} name={form.firstName || session.user.name} size={60} showRemove />
          ) : null}
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.4px" }}>
              {[form.firstName, form.lastName].filter(Boolean).join(" ") || session?.user?.name || "My Profile"}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
              {profile?.email || session?.user?.email}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: "var(--tint-danger)", border: "1px solid var(--border-danger)", color: "var(--danger)", borderRadius: 12, padding: "12px 16px", fontSize: 14, marginBottom: 20 }}>
            {error}
          </div>
        )}
        {saved && (
          <div style={{ background: "var(--tint-success)", border: "1px solid var(--tint-success)", color: "var(--success)", borderRadius: 12, padding: "12px 16px", fontSize: 14, marginBottom: 20 }}>
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
                  placeholder="e.g. Anna"
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
                style={{ ...inputStyle, color: "var(--subtle)", cursor: "not-allowed" }}
              />
              <Hint>Email cannot be changed.</Hint>
            </Field>
            <Field label="WhatsApp Number">
              <PhoneInput
                value={form.phone}
                onChange={(e164) => set("phone", e164)}
                onValidChange={setPhoneValid}
                placeholder="70 123 45 67"
              />
              <Hint>Select your country, then enter the number. Used for future WhatsApp alerts. Optional.</Hint>
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
            <Field label="Appearance">
              <ThemeSwitcher />
              <Hint>Auto follows your phone or computer — dark in the evening if that&apos;s how you have it set. Saved on this device.</Hint>
            </Field>
            <Field label="Display">
              <div style={{ display: "flex", gap: 8 }}>
                {(["mobile", "web"] as ViewMode[]).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => changeViewMode(mode)}
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 12, cursor: "pointer",
                      fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                      border: viewMode === mode ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                      background: viewMode === mode ? "var(--tint-accent)" : "var(--surface)",
                      color: viewMode === mode ? "var(--accent-strong)" : "var(--fg-2)",
                    }}
                  >
                    {mode === "mobile" ? "📱 Mobile view" : "🖥️ Web view"}
                  </button>
                ))}
              </div>
              <Hint>Web view uses a wider column on bigger screens. Saved on this device — switch back anytime.</Hint>
            </Field>
            <Field label="Bottom nav">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <span style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
                  borderRadius: 50, fontSize: 12.5, fontWeight: 700,
                  background: "var(--surface-3)", color: "var(--subtle)", border: "1.5px solid var(--border)",
                }}>
                  📅 Calendar
                </span>
                {BOTTOM_NAV_APP_OPTIONS.map(opt => {
                  const active = bottomNavApps.includes(opt.key);
                  const disabled = savingBottomNav || (active && bottomNavApps.length <= 3) || (!active && bottomNavApps.length >= 4);
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleBottomNavApp(opt.key)}
                      disabled={disabled}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
                        borderRadius: 50, fontSize: 12.5, fontWeight: 700, fontFamily: "inherit",
                        cursor: disabled ? "not-allowed" : "pointer",
                        border: active ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                        background: active ? "var(--tint-accent)" : "var(--surface)",
                        color: active ? "var(--accent-strong)" : "var(--fg-2)",
                        opacity: disabled && !active ? 0.5 : 1,
                      }}
                    >
                      {opt.emoji} {opt.label}
                    </button>
                  );
                })}
              </div>
              <Hint>Home always shows first. Pick {bottomNavApps.length < 4 ? "one more (" : ""}3 or 4 others{bottomNavApps.length < 4 ? ")" : ""} — everything else is always reachable from the ☰ menu.</Hint>
            </Field>
          </Card>

          {/* ── Calendar sync ── */}
          {/* Outbound-only ICS feed: reminders, chores and trainings visible
              to you (same rule as the in-app dashboard), read into your own
              Google/Outlook/Apple calendar via "Add calendar > From URL".
              No login to Google/Microsoft required, no cost — see
              MARKET_RESEARCH_EU.md and ROADMAP.md, "Produktriktning – nästa
              runda". */}
          <Card title="Calendar sync">
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 14px" }}>
              See your reminders, chores and activities in your own calendar app. Add this link as a subscribed calendar in Google Calendar, Outlook or Apple Calendar — it updates on its own, no login needed.
            </p>
            {!calendarFeedUrl ? (
              <button
                type="button"
                onClick={() => fetchCalendarFeed(false)}
                disabled={calendarFeedLoading}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%",
                  padding: "13px 16px", background: "var(--ink)", color: "#fff", border: "none",
                  borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: calendarFeedLoading ? "not-allowed" : "pointer",
                  fontFamily: FONT, opacity: calendarFeedLoading ? 0.6 : 1,
                }}
              >
                {calendarFeedLoading ? "Getting link…" : "Get my calendar link"}
              </button>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    readOnly
                    value={calendarFeedUrl}
                    onFocus={(e) => e.target.select()}
                    style={{
                      flex: 1, minWidth: 0, padding: "11px 12px", borderRadius: 12,
                      border: "1.5px solid var(--border)", fontSize: 12.5, color: "var(--fg-2)",
                      fontFamily: FONT, background: "var(--background)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={copyCalendarFeedUrl}
                    style={{
                      flexShrink: 0, padding: "0 16px", borderRadius: 12, border: "none",
                      background: calendarFeedCopied ? "var(--tint-success)" : "var(--ink)",
                      color: calendarFeedCopied ? "var(--success)" : "#fff",
                      fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
                    }}
                  >
                    {calendarFeedCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => fetchCalendarFeed(true)}
                  disabled={calendarFeedLoading}
                  style={{
                    marginTop: 10, background: "none", border: "none", color: "var(--muted)",
                    fontSize: 12, fontWeight: 600, cursor: calendarFeedLoading ? "not-allowed" : "pointer",
                    fontFamily: FONT, padding: 0,
                  }}
                >
                  Generate a new link (old one stops working)
                </button>
              </>
            )}
          </Card>

          {/* ── Notifications ── */}
          <Card title="Notifications">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 16, borderBottom: "1px solid var(--border-soft)" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>Email</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  {profile?.email || session?.user?.email}
                </div>
              </div>
              <span style={{
                background: "var(--tint-accent)", color: "var(--accent)", fontSize: 12, fontWeight: 700,
                padding: "4px 12px", borderRadius: 50,
              }}>Active</span>
            </div>
          </Card>

          {/* ── Household ── */}
          <Card title="Household">
            {household ? (
              <>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 14, borderBottom: "1px solid var(--border-soft)" }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                    {editingName && householdRole === "OWNER" ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          autoFocus
                          type="text"
                          value={newHouseholdName}
                          onChange={e => setNewHouseholdName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleRenameHousehold(); } if (e.key === "Escape") setEditingName(false); }}
                          style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "1.5px solid var(--accent)", fontSize: 15, fontWeight: 700, fontFamily: FONT, outline: "none", color: "var(--fg)" }}
                        />
                        <button type="button" onClick={handleRenameHousehold} disabled={renamingHousehold} style={{ padding: "6px 12px", background: "var(--ink)", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: FONT }}>
                          {renamingHousehold ? "…" : "Save"}
                        </button>
                        <button type="button" onClick={() => setEditingName(false)} style={{ padding: "6px 10px", background: "none", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--muted)", cursor: "pointer", fontFamily: FONT }}>✕</button>
                      </div>
                    ) : (
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 6, cursor: householdRole === "OWNER" ? "pointer" : "default" }}
                        onClick={() => { if (householdRole === "OWNER") { setNewHouseholdName(household.name ?? ""); setEditingName(true); } }}
                      >
                        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)" }}>🏠 {household.name ?? "My Household"}</div>
                        {householdRole === "OWNER" && <span style={{ fontSize: 11, color: "var(--faint)" }}>✎</span>}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{household.members.length} member{household.members.length !== 1 ? "s" : ""}</div>
                  </div>
                  {household.is_pro ? (
                    <span style={{ background: "linear-gradient(135deg,var(--tint-accent),var(--tint-accent))", border: "1.5px solid var(--accent-border)", color: "var(--violet)", fontSize: 12, fontWeight: 700, padding: "5px 14px", borderRadius: 50, flexShrink: 0 }}>⚡ Pro</span>
                  ) : (
                    <span style={{ background: "var(--background)", color: "var(--muted)", fontSize: 12, fontWeight: 700, padding: "5px 14px", borderRadius: 50, border: "1.5px solid var(--border)", flexShrink: 0 }}>Free</span>
                  )}
                </div>

                {/* Members list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {household.members.map((m) => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Avatar userId={m.user.id} name={m.user.name ?? m.user.email} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {m.user.name ?? m.user.email}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{m.role === "OWNER" ? "Owner" : m.role === "CHILD" ? "Child" : m.role === "PARENT" ? "Parent" : "Adult"}</div>
                      </div>
                      {householdRole === "OWNER" && m.role !== "OWNER" && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.id)}
                          disabled={removingMemberId === m.id}
                          style={{ background: "none", border: "none", color: "var(--danger)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "4px 8px", borderRadius: 8, flexShrink: 0 }}
                        >
                          {removingMemberId === m.id ? "…" : "Remove"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Broadcast a family update (OWNER/PARENT only) — reuses the
                    existing Resend email infra, no new notification channel.
                    See COMPETITOR_ANALYSIS_BEST4FAMILY.md §3/§6. */}
                {(householdRole === "OWNER" || householdRole === "PARENT") && household.members.length > 1 && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-soft)" }}>
                    {broadcastMsg && (
                      <div style={{ background: broadcastMsg.type === "ok" ? "var(--tint-success)" : "var(--tint-danger)", border: `1px solid ${broadcastMsg.type === "ok" ? "var(--tint-success)" : "var(--border-danger)"}`, color: broadcastMsg.type === "ok" ? "var(--success)" : "var(--danger)", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 12 }}>
                        {broadcastMsg.text}
                      </div>
                    )}
                    {!showBroadcast ? (
                      <button type="button" onClick={() => { setShowBroadcast(true); setBroadcastMsg(null); }}
                        style={{ width: "100%", padding: "11px 16px", background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 14, fontSize: 13, fontWeight: 600, color: "var(--fg)", cursor: "pointer", textAlign: "left", fontFamily: FONT, display: "flex", alignItems: "center", gap: 10 }}>
                        📣 Send a family update
                      </button>
                    ) : (
                      <div style={{ background: "var(--surface-2)", borderRadius: 14, border: "1.5px solid var(--border)", padding: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", marginBottom: 4 }}>Send a family update</div>
                        <div style={{ fontSize: 12, color: "var(--subtle)", marginBottom: 10, lineHeight: 1.5 }}>
                          Emails every adult household member (not you) with a short message from you.
                        </div>
                        <textarea
                          value={broadcastMessage}
                          onChange={e => setBroadcastMessage(e.target.value.slice(0, 2000))}
                          placeholder="e.g. Grandma's coming for dinner Friday — can everyone be home by 6?"
                          rows={4}
                          style={{ ...inputStyle, resize: "vertical", fontFamily: FONT, marginBottom: 10 }}
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="button" onClick={() => { setShowBroadcast(false); setBroadcastMessage(""); }}
                            style={{ padding: "10px 16px", background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 12, fontSize: 13, fontWeight: 600, color: "var(--muted)", cursor: "pointer", fontFamily: FONT }}>
                            Cancel
                          </button>
                          <button type="button" onClick={handleBroadcast} disabled={broadcasting || !broadcastMessage.trim()}
                            style={{ flex: 1, padding: "10px 16px", background: "var(--ink)", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, color: "#fff", cursor: broadcasting ? "not-allowed" : "pointer", fontFamily: FONT, opacity: broadcasting || !broadcastMessage.trim() ? 0.6 : 1 }}>
                            {broadcasting ? "Sending…" : "Send"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Pending invites */}
                {household.invites.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-soft)" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8 }}>Pending invites</div>
                    {household.invites.map(inv => (
                      <div key={inv.id} style={{ fontSize: 13, color: "var(--subtle)", padding: "4px 0" }}>✉ {inv.email}</div>
                    ))}
                  </div>
                )}

                {/* Invite form (OWNER + Pro only) */}
                {householdRole === "OWNER" && household.is_pro ? (
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border-soft)" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", marginBottom: 10 }}>Invite a member</div>
                    {inviteMsg && (
                      <div style={{ background: inviteMsg.type === "ok" ? "var(--tint-success)" : "var(--tint-danger)", border: `1px solid ${inviteMsg.type === "ok" ? "var(--tint-success)" : "var(--border-danger)"}`, color: inviteMsg.type === "ok" ? "var(--success)" : "var(--danger)", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 12 }}>
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
                            border: inviteRole === r.value ? "none" : "1.5px solid var(--border)",
                            background: inviteRole === r.value ? "var(--ink)" : "var(--surface)",
                            color: inviteRole === r.value ? "#fff" : "var(--muted)",
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
                        style={{ padding: "12px 18px", background: "var(--ink)", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, color: "#fff", cursor: inviting ? "not-allowed" : "pointer", fontFamily: FONT, flexShrink: 0, opacity: inviting ? 0.6 : 1 }}
                      >
                        {inviting ? "…" : "Send invite"}
                      </button>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--subtle)", marginTop: 8 }}>They&apos;ll receive an email with a link to join. Valid for 48 hours.</div>
                  </div>
                ) : householdRole === "OWNER" && !household.is_pro ? (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-soft)", background: "linear-gradient(135deg,var(--tint-accent),var(--tint-accent))", borderRadius: 12, padding: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 18 }}>⚡</span>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>Inviting requires Pro</div>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>Ask your admin to enable Pro for your household to invite family members.</div>
                  </div>
                ) : null}

                {/* Child accounts — email + password (PIN retired 2026-09-27) */}
                {householdRole === "OWNER" && (
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border-soft)" }}>
                    <DeletionRequestsCard />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>Child accounts</div>
                      {/* 2026-09-29: one place to add children (with the guardian
                          confirmation) — Family members. */}
                      <Link href="/dashboard/family/members"
                        style={{ background: "var(--tint-accent)", border: "none", borderRadius: 50, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: "var(--accent-strong)", textDecoration: "none", fontFamily: FONT }}>
                        + Add child
                      </Link>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--subtle)", marginBottom: 12, lineHeight: 1.5 }}>
                      Each child gets their own login. We email them a link to confirm the address and choose a password (or they can use Google if it's a Google address).
                    </div>
                    {inviteSentTo && (
                      <div style={{ fontSize: 13, color: "var(--success)", background: "var(--tint-success)", border: "1px solid var(--tint-success)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontWeight: 600 }}>
                        ✓ Invite sent to {inviteSentTo}
                      </div>
                    )}

                    {pinChildren.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                        {pinChildren.map(c => (
                          <div key={c.id}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--surface-2)", borderRadius: 12, border: "1.5px solid var(--border)" }}>
                              <Avatar userId={c.id} name={c.name} size={32} />
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{c.name}</div>
                                {c.email && <div style={{ fontSize: 11, color: "var(--subtle)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</div>}
                                {c.emailVerified === false && (
                                  <div style={{ fontSize: 11, color: "var(--warning)", fontWeight: 600, marginTop: 2 }}>
                                    Not confirmed yet ·{" "}
                                    <button type="button" onClick={() => resendChildInvite(c.id, c.email)} disabled={resendingChild === c.id}
                                      style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                                      {resendingChild === c.id ? "Sending…" : "Resend invite"}
                                    </button>
                                  </div>
                                )}
                              </div>
                              <button type="button" onClick={() => editingChildId === c.id ? setEditingChildId(null) : startEditChild(c)}
                                style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT, flexShrink: 0 }}>
                                {editingChildId === c.id ? "Cancel" : "Edit"}
                              </button>
                              <button type="button" onClick={() => deleteChild(c.id, c.name)} disabled={resendingChild === c.id}
                                style={{ background: "none", border: "none", color: "var(--danger)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT, flexShrink: 0 }}>
                                Delete
                              </button>
                            </div>

                            {editingChildId === c.id && (
                              <div style={{ background: "var(--surface-2)", borderRadius: 14, border: "1.5px solid var(--border)", padding: 16, marginTop: 6 }}>
                                <div style={{ marginBottom: 12 }}>
                                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-2)", display: "block", marginBottom: 6 }}>Name</label>
                                  <input value={editChildName} onChange={e => setEditChildName(e.target.value)} autoComplete="off" style={inputStyle} />
                                </div>
                                <div style={{ marginBottom: 12 }}>
                                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-2)", display: "block", marginBottom: 6 }}>Email</label>
                                  <input value={editChildEmail} onChange={e => setEditChildEmail(e.target.value)} type="email" autoComplete="off" style={inputStyle} />
                                </div>
                                {editChildError && (
                                  <div style={{ fontSize: 13, color: "var(--danger)", background: "var(--tint-danger)", border: "1px solid var(--border-danger)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>{editChildError}</div>
                                )}
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button type="button" onClick={saveChildEdit} disabled={savingChildEdit}
                                    style={{ flex: 1, background: "var(--ink)", color: "#fff", border: "none", borderRadius: 50, padding: "12px", fontSize: 14, fontWeight: 700, cursor: savingChildEdit ? "not-allowed" : "pointer", fontFamily: FONT, opacity: savingChildEdit ? 0.6 : 1 }}>
                                    {savingChildEdit ? "Saving…" : "Save changes"}
                                  </button>
                                  <button type="button" onClick={() => setEditingChildId(null)}
                                    style={{ padding: "12px 20px", borderRadius: 50, background: "var(--surface-3)", border: "none", fontSize: 13, fontWeight: 700, color: "var(--fg-2)", cursor: "pointer", fontFamily: FONT }}>
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                )}

                {/* Re-assignment wizard */}
                {reassignData && (
                  <div style={{ marginTop: 16, background: "var(--tint-warning)", border: "1.5px solid #F6E05E", borderRadius: 14, padding: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--warning)", marginBottom: 8 }}>
                      ⚠ {reassignData.removedUser.name ?? reassignData.removedUser.email} left — {reassignData.assignedReminders.length} reminder{reassignData.assignedReminders.length !== 1 ? "s" : ""} need a new owner
                    </div>
                    {reassignData.assignedReminders.map(r => (
                      <div key={r.id} style={{ fontSize: 13, color: "var(--fg)", padding: "4px 0", borderTop: "1px solid rgba(246,224,94,0.4)" }}>
                        📌 <Link href={`/dashboard/${r.id}`} style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>{r.name}</Link>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setReassignData(null)}
                      style={{ marginTop: 12, padding: "8px 16px", background: "var(--ink)", border: "none", borderRadius: 50, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: FONT }}
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

          {/* ── Plan ── (2026-09-28: driven by lib/entitlements via /api/household) */}
          {household && (
          <Card title="Plan">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)" }}>
                  {access?.plan === "PRO" ? "⚡ Pro" : access?.plan === "TRIAL" ? "⚡ Pro trial" : "Free"}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 3, lineHeight: 1.5 }}>
                  {access?.plan === "PRO"
                    ? (access.proForever ? "No end date." : access.proUntil ? `Until ${new Date(access.proUntil).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.` : "")
                    : access?.plan === "TRIAL"
                      ? `${access.trialDaysLeft} day${access.trialDaysLeft === 1 ? "" : "s"} left of the free trial.`
                      : access?.proRequested ? "Pro requested — we'll email you." : access?.canStartTrial ? "Try Pro free for 14 days." : "Reminders and one shared shopping list."}
                </div>
              </div>
              <Link href="/upgrade" style={{ flexShrink: 0, background: access?.plan === "PRO" ? "var(--surface-3)" : "var(--accent-bg)", color: access?.plan === "PRO" ? "var(--fg)" : "#fff", borderRadius: 50, padding: "10px 16px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                {access?.plan === "PRO" ? "See plan" : "See plans"}
              </Link>
            </div>
          </Card>
          )}

          {/* ── Security ── */}
          <Card title="Security">
            {isGoogleUser ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#7C7C8A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>Signed in with Google</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Password is managed by Google.</div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                style={{
                  width: "100%", padding: "13px 16px", background: "var(--surface)",
                  border: "1.5px solid var(--border)", borderRadius: 14, fontSize: 14,
                  fontWeight: 600, color: "var(--fg)", cursor: "pointer",
                  textAlign: "left", fontFamily: FONT, display: "flex", alignItems: "center", gap: 10,
                }}
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#7C7C8A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Change password
              </button>
            )}

            {/* Data export — GDPR portability right. Downloads a JSON file with
                everything tied to this account (reminders, shopping/wishlist
                items you added, household membership). See
                COMPETITOR_ANALYSIS_BEST4FAMILY.md §5, "Konkreta åtgärder" #4. */}
            <a
              href="/api/profile/export"
              download
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "13px 16px", background: "var(--surface)", border: "1.5px solid var(--border)",
                borderRadius: 14, fontSize: 14, fontWeight: 600, color: "var(--fg)",
                textDecoration: "none", fontFamily: FONT, marginTop: 12, boxSizing: "border-box",
              }}
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#7C7C8A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export my data
            </a>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>
              How we handle your family&apos;s data: <Link href="/privacy" style={{ color: "var(--accent)", fontWeight: 700 }}>privacy notice</Link>.
            </div>

            {/* 2026-09-27: real soft delete with family-admin approval + 60-day restore window */}
            <DeleteAccountSection />
          </Card>

          {/* Save + Sign out */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                width: "100%", padding: "17px", borderRadius: 50,
                background: "var(--ink)", border: "none",
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
                background: "var(--surface)", border: "1.5px solid var(--border)",
                fontSize: 16, fontWeight: 600, color: "var(--fg-2)",
                cursor: "pointer", fontFamily: FONT, transition: "all 0.15s",
              }}
            >
              Sign out
            </button>
          </div>

          {profile?.createdAt && (
            <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "var(--faint)" }}>
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
      <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 16, textAlign: "center" }}>
        You don&apos;t have a household yet. Create one to invite family members.
      </div>
      {err && (
        <div style={{ background: "var(--tint-danger)", border: "1px solid var(--border-danger)", color: "var(--danger)", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 12 }}>
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
          style={{ flex: 1, padding: "12px 14px", borderRadius: 12, border: "1.5px solid var(--border)", fontSize: 14, fontFamily: FONT, background: "var(--surface-2)", outline: "none", color: "var(--fg)" }}
        />
        <button
          type="button"
          onClick={handle}
          disabled={creating}
          style={{ padding: "12px 18px", background: "var(--ink)", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, color: "#fff", cursor: creating ? "not-allowed" : "pointer", fontFamily: FONT, flexShrink: 0, opacity: creating ? 0.6 : 1 }}
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
      background: "var(--surface)", borderRadius: 20, padding: 20,
      marginBottom: 16, border: "1.5px solid var(--border)",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 18 }}>
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
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: "var(--subtle)", marginTop: 6 }}>{children}</div>;
}

function SelectWrap({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "relative" }}>
      {children}
      <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--muted)" }}>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );
}

function Chevron() { return null; } // rendered inside SelectWrap above

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--background)", border: "1.5px solid var(--border)",
  borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "var(--fg)",
  outline: "none", fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
  boxSizing: "border-box",
};
