"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
    name: "",
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

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  useEffect(() => { if (status === "authenticated") fetchProfile(); }, [status]);

  async function fetchProfile() {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setForm({
          name: data.name || "",
          phone: data.phone || "",
          preferredCurrency: data.preferredCurrency || "SEK",
          timezone: data.timezone || "Europe/Stockholm",
          defaultReminderTime: data.defaultReminderTime || "09:00",
        });
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (\!res.ok) { const d = await res.json(); throw new Error(d.error || "Error"); }
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setSaving(false); }
  }

  const set = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const isGoogleUser = session?.user?.image?.includes("googleusercontent");

  if (status === "loading" || loading) return (
    <div style={{ minHeight: "100vh", background: "#F5F6FA", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <span style={{ color: "#8B90A4", fontSize: 15 }}>Loading…</span>
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
            {form.name ? form.name[0].toUpperCase() : (session?.user?.name?.[0] ?? "?")}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1A2340", letterSpacing: "-0.4px" }}>
              {form.name || session?.user?.name || "My Profile"}
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
            <Field label="Full name">
              <input
                type="text" value={form.name}
                onChange={e => set("name", e.target.value)}
                placeholder="Your name"
                style={inputStyle}
              />
            </Field>
            <Field label="Email address">
              <input
                type="email" value={profile?.email || session?.user?.email || ""}
                readOnly disabled
                style={{ ...inputStyle, color: "#B0B7C8", cursor: "not-allowed" }}
              />
              <Hint>Email cannot be changed.</Hint>
            </Field>
            <Field label="Phone number">
              <input
                type="tel" value={form.phone}
                onChange={e => set("phone", e.target.value)}
                placeholder="+46 70 123 45 67"
                style={inputStyle}
              />
              <Hint>Optional. SMS notifications coming in a future update.</Hint>
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

          {/* ── IQ Features ── */}
          <Card title="IQ Features">
            <div style={{
              background: "linear-gradient(135deg, #EEF5FF 0%, #F5F0FF 100%)",
              borderRadius: 14, padding: 16, marginBottom: 14,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>✉️</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1A2340" }}>Approved senders</div>
                <span style={{ marginLeft: "auto", background: "#fff", color: "#8B90A4", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 50, border: "1.5px solid #E8EDF4" }}>Soon</span>
              </div>
              <div style={{ fontSize: 12, color: "#8B90A4", lineHeight: 1.5 }}>
                Let trusted email senders automatically create reminders for you.
              </div>
            </div>
            <div style={{
              background: "linear-gradient(135deg, #EEF5FF 0%, #F0FFF8 100%)",
              borderRadius: 14, padding: 16,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>📅</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1A2340" }}>Auto calendar sync</div>
                <span style={{ marginLeft: "auto", background: "#fff", color: "#8B90A4", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 50, border: "1.5px solid #E8EDF4" }}>Soon</span>
              </div>
              <div style={{ fontSize: 12, color: "#8B90A4", lineHeight: 1.5 }}>
                Sync reminders with Google Calendar or Outlook automatically.
              </div>
            </div>
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
                background: "#5B9CF5", border: "none",
                fontSize: 16, fontWeight: 600, color: "#fff",
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: "0 2px 10px rgba(91,156,245,0.35)",
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
                fontSize: 16, fontWeight: 600, color: "#8B90A4",
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

// ── Helpers ──
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 20, padding: 20,
      marginBottom: 16, border: "1.5px solid #E8EDF4",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#B0B7C8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 18 }}>
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
      <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2340", marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: "#B0B7C8", marginTop: 6 }}>{children}</div>;
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
