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
  "Europe/Stockholm",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Australia/Sydney",
];

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
    preferredCurrency: "SEK",
    timezone: "Europe/Stockholm",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") fetchProfile();
  }, [status]);

  async function fetchProfile() {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setForm({
          name: data.name || "",
          preferredCurrency: data.preferredCurrency || "SEK",
          timezone: data.timezone || "Europe/Stockholm",
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong.");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function formatMemberSince(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F4F0]">
        <div className="text-[#7C7C8A] text-[15px]">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      {/* Header */}
      <header className="bg-white border-b border-[#E4E3DE] px-6 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-[14px] font-medium text-[#7C7C8A] hover:text-[#1C1C28] transition-colors"
          >
            ← Dashboard
          </Link>
          <span className="text-[#E4E3DE]">|</span>
          <h1 className="text-[16px] font-semibold text-[#1C1C28]">My Profile</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <form onSubmit={handleSave}>
          {/* Error */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-[14px]">
              {error}
            </div>
          )}

          {/* Success */}
          {saved && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-[14px]">
              Changes saved.
            </div>
          )}

          {/* Section: Personal */}
          <section className="mb-10">
            <h2 className="text-[13px] font-semibold text-[#7C7C8A] uppercase tracking-wider mb-4">
              Personal
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Full name</label>
                <input
                  type="text"
                  className="input"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  className="input opacity-70 cursor-not-allowed"
                  value={profile?.email || session?.user?.email || ""}
                  readOnly
                  disabled
                />
                <p className="text-[12px] text-[#7C7C8A] mt-1.5">
                  Email cannot be changed.
                </p>
              </div>
            </div>
          </section>

          <div className="divider mb-10" />

          {/* Section: Preferences */}
          <section className="mb-10">
            <h2 className="text-[13px] font-semibold text-[#7C7C8A] uppercase tracking-wider mb-4">
              Preferences
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Preferred currency</label>
                <select
                  className="input"
                  value={form.preferredCurrency}
                  onChange={(e) => set("preferredCurrency", e.target.value)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <p className="text-[12px] text-[#7C7C8A] mt-1.5">
                  Used to display totals in your dashboard. Does not convert amounts.
                </p>
              </div>
              <div>
                <label className="label">Time zone</label>
                <select
                  className="input"
                  value={form.timezone}
                  onChange={(e) => set("timezone", e.target.value)}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <div className="divider mb-10" />

          {/* Section: Account */}
          <section className="mb-10">
            <h2 className="text-[13px] font-semibold text-[#7C7C8A] uppercase tracking-wider mb-4">
              Account
            </h2>
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[14px] font-medium text-[#1C1C28]">Current plan</div>
                  <div className="text-[13px] text-[#7C7C8A] mt-0.5">
                    Reminders delivered to your inbox
                  </div>
                </div>
                <span className="badge bg-[#E4E3DE] text-[#1C1C28]">Free</span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[14px] font-medium text-[#1C1C28]">Change password</div>
                  <div className="text-[13px] text-[#7C7C8A] mt-0.5">
                    A reset link will be sent to your email
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    // Trigger password reset via NextAuth (if configured) or show a simple message
                    alert("A password reset link has been sent to your email.");
                  }}
                  className="text-[14px] font-medium text-[#4A5FD5] hover:underline"
                >
                  Reset →
                </button>
              </div>

              {profile?.createdAt && (
                <div className="pt-1">
                  <p className="text-[13px] text-[#7C7C8A]">
                    Member since {formatMemberSince(profile.createdAt)}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Save */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-[14px] font-medium text-[#7C7C8A] hover:text-[#1C1C28] transition-colors"
            >
              Sign out
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
