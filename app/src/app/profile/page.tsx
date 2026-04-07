"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StarBackground } from "@/components/StarBackground";

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

type Profile = {
  name: string;
  email: string;
  preferredCurrency: string;
  timezone: string;
  createdAt: string;
};

const inp: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 10, padding: "11px 14px",
  color: "#fff", fontSize: 15, outline: "none",
};

const lbl: React.CSSProperties = {
  display: "block", color: "rgba(200,215,255,0.75)",
  fontSize: 13, fontWeight: 600, marginBottom: 8,
};

const section: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 16, padding: 24, marginBottom: 16,
};

const secTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700,
  color: "rgba(130,165,230,0.55)",
  textTransform: "uppercase", letterSpacing: "0.07em",
  margin: "0 0 18px",
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ name: "", preferredCurrency: "SEK", timezone: "Europe/Stockholm" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  useEffect(() => { if (status === "authenticated") fetchProfile(); }, [status]);

  async function fetchProfile() {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setForm({ name: data.name || "", preferredCurrency: data.preferredCurrency || "SEK", timezone: data.timezone || "Europe/Stockholm" });
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Error"); }
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setSaving(false); }
  }

  const set = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const bg = "radial-gradient(ellipse at 60% 25%, #1e3f8a 0%, #0e2268 28%, #070f3c 60%, #030820 100%)";

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
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔔</div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 18, letterSpacing: "-0.3px" }}>AssistIQ</span>
        </Link>
        <Link href="/dashboard" style={{ color: "rgba(180,205,255,0.6)", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>← Dashboard</Link>
      </header>

      <main style={{ position: "relative", zIndex: 10, maxWidth: 600, margin: "0 auto", padding: "40px 24px 100px" }}>
        <h1 style={{ color: "#fff", fontWeight: 800, fontSize: 24, letterSpacing: "-0.5px", margin: "0 0 32px" }}>My Profile</h1>

        <form onSubmit={handleSave}>
          {error && <div style={{ background: "rgba(217,79,79,0.18)", border: "1px solid rgba(217,79,79,0.4)", color: "#ff8f8f", borderRadius: 10, padding: "12px 16px", fontSize: 14, marginBottom: 20 }}>{error}</div>}
          {saved && <div style={{ background: "rgba(42,157,111,0.2)", border: "1px solid rgba(42,157,111,0.4)", color: "#5ee8a8", borderRadius: 10, padding: "12px 16px", fontSize: 14, marginBottom: 20 }}>Changes saved ✓</div>}

          <div style={section}>
            <p style={secTitle}>Personal</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={lbl}>Full name</label>
                <input type="text" style={inp} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your name" />
              </div>
              <div>
                <label style={lbl}>Email address</label>
                <input type="email" style={{ ...inp, opacity: 0.4, cursor: "not-allowed" }} value={profile?.email || session?.user?.email || ""} readOnly disabled />
                <p style={{ color: "rgba(160,185,255,0.4)", fontSize: 12, marginTop: 6 }}>Email cannot be changed.</p>
              </div>
            </div>
          </div>

          <div style={section}>
            <p style={secTitle}>Preferences</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={lbl}>Preferred currency</label>
                <select style={inp} value={form.preferredCurrency} onChange={(e) => set("preferredCurrency", e.target.value)}>
                  {CURRENCIES.map((c) => <option key={c.value} value={c.value} style={{ background: "#0e1a4a" }}>{c.label}</option>)}
                </select>
                <p style={{ color: "rgba(160,185,255,0.4)", fontSize: 12, marginTop: 6 }}>Used to display totals. Does not convert amounts.</p>
              </div>
              <div>
                <label style={lbl}>Time zone</label>
                <select style={inp} value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
                  {TIMEZONES.map((tz) => <option key={tz} value={tz} style={{ background: "#0e1a4a" }}>{tz.replace("_", " ")}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div style={{ ...section, marginBottom: 32 }}>
            <p style={secTitle}>Account</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>Current plan</div>
                <div style={{ color: "rgba(160,185,255,0.5)", fontSize: 13, marginTop: 3 }}>Reminders delivered to your inbox</div>
              </div>
              <span style={{ background: "rgba(74,127,220,0.2)", border: "1px solid rgba(74,127,220,0.35)", color: "rgba(130,180,255,0.9)", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 50 }}>Free</span>
            </div>
            {profile?.createdAt && (
              <div style={{ color: "rgba(140,165,220,0.4)", fontSize: 13 }}>
                Member since {new Date(profile.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button type="submit" disabled={saving} style={{ background: saving ? "rgba(74,127,220,0.5)" : "linear-gradient(160deg, #4a7ee0 0%, #2e5ec8 100%)", color: "#fff", fontWeight: 700, fontSize: 15, padding: "12px 28px", borderRadius: 50, border: "none", cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 3px 14px rgba(46,94,200,0.45)" }}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button type="button" onClick={() => signOut({ callbackUrl: "/" })} style={{ background: "none", border: "1px solid rgba(255,255,255,0.13)", color: "rgba(180,205,255,0.65)", fontSize: 14, fontWeight: 600, padding: "11px 20px", borderRadius: 50, cursor: "pointer" }}>
              Sign out
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
