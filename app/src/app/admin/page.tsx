"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
    if (status === "authenticated" && session?.user?.email !== ADMIN_EMAIL) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email === ADMIN_EMAIL) {
      fetchData();
    }
  }, [status, session]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setUsers(data.users);
      setStats(data.stats);
    } catch {
      setActionMsg({ type: "err", text: "Failed to load data." });
    } finally {
      setLoading(false);
    }
  }

  function notify(type: "ok" | "err", text: string) {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 4000);
  }

  async function handleDelete(userId: string, email: string) {
    if (!confirm(`Delete user ${email} and all their data? This cannot be undone.`)) return;
    setDeletingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setUsers((u) => u.filter((x) => x.id !== userId));
      setStats((s) => s ? { ...s, totalUsers: s.totalUsers - 1 } : s);
      notify("ok", `User ${email} deleted.`);
    } catch {
      notify("err", "Failed to delete user.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleTriggerCron() {
    setTriggering(true);
    try {
      const res = await fetch("/api/admin/trigger-cron", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      notify("ok", `Cron ran. Sent: ${data.sent}, Errors: ${data.errors}`);
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
      notify("ok", `Test email sent to ${session?.user?.email}`);
    } catch {
      notify("err", "Failed to send test email.");
    } finally {
      setTestingEmail(false);
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
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-[14px] font-medium text-[#7C7C8A] hover:text-[#1C1C28] transition-colors"
            >
              ← Dashboard
            </Link>
            <span className="text-[#E4E3DE]">|</span>
            <h1 className="text-[16px] font-semibold text-[#1C1C28]">Admin Console</h1>
          </div>
          <span className="badge bg-[#4A5FD5] text-white text-[11px]">Admin</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Action message */}
        {actionMsg && (
          <div className={`rounded-lg px-4 py-3 text-[14px] border ${
            actionMsg.type === "ok"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}>
            {actionMsg.text}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card-sm">
              <div className="text-[28px] font-bold text-[#1C1C28] leading-none">{stats.totalUsers}</div>
              <div className="text-[12px] text-[#7C7C8A] mt-1.5 font-medium">Total users</div>
            </div>
            <div className="card-sm">
              <div className="text-[28px] font-bold text-[#1C1C28] leading-none">{stats.totalReminders}</div>
              <div className="text-[12px] text-[#7C7C8A] mt-1.5 font-medium">Active reminders</div>
            </div>
            <div className="card-sm">
              <div className="text-[28px] font-bold text-[#1C1C28] leading-none">{stats.emailsSent30Days}</div>
              <div className="text-[12px] text-[#7C7C8A] mt-1.5 font-medium">Emails sent (30d)</div>
            </div>
            <div className="card-sm">
              <div className="text-[15px] font-bold text-[#1C1C28] leading-tight">
                {stats.lastEmailSent ? timeAgo(stats.lastEmailSent) : "—"}
              </div>
              <div className="text-[12px] text-[#7C7C8A] mt-1.5 font-medium">Last email sent</div>
            </div>
          </div>
        )}

        {/* System controls */}
        <div className="card">
          <h2 className="text-[15px] font-semibold text-[#1C1C28] mb-4">System</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleTriggerCron}
              disabled={triggering}
              className="btn-primary"
            >
              {triggering ? "Running…" : "▶ Trigger reminder cron now"}
            </button>
            <button
              onClick={handleTestEmail}
              disabled={testingEmail}
              className="btn-secondary"
            >
              {testingEmail ? "Sending…" : "✉ Send test email to me"}
            </button>
            <button
              onClick={fetchData}
              className="btn-secondary"
            >
              ↻ Refresh
            </button>
          </div>
          <p className="text-[12px] text-[#7C7C8A] mt-3">
            Trigger cron runs the full reminder job right now — any reminder due today will get an email.
            Test email sends a sample reminder to <strong>{session?.user?.email}</strong>.
          </p>
        </div>

        {/* User table */}
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E4E3DE] flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#1C1C28]">
              Users <span className="text-[#7C7C8A] font-normal">({users.length})</span>
            </h2>
          </div>

          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_1fr_100px_80px_80px_80px] gap-4 px-6 py-3 bg-[#F5F4F0] border-b border-[#E4E3DE]">
            {["Name", "Email", "Joined", "Reminders", "Currency", ""].map((h) => (
              <div key={h} className="text-[12px] font-semibold text-[#7C7C8A] uppercase tracking-wide">
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {users.length === 0 ? (
            <div className="px-6 py-12 text-center text-[14px] text-[#7C7C8A]">No users yet.</div>
          ) : (
            users.map((user, i) => (
              <div
                key={user.id}
                className={`${i !== 0 ? "border-t border-[#E4E3DE]" : ""}`}
              >
                {/* Desktop */}
                <div className="hidden sm:grid grid-cols-[1fr_1fr_100px_80px_80px_80px] gap-4 items-center px-6 py-4">
                  <span className="font-medium text-[#1C1C28] text-[14px] truncate">
                    {user.name ?? <span className="text-[#7C7C8A] italic">No name</span>}
                  </span>
                  <span className="text-[#7C7C8A] text-[13px] truncate">{user.email}</span>
                  <span className="text-[#7C7C8A] text-[13px]">{formatDate(user.createdAt)}</span>
                  <span className="text-[14px] font-semibold text-[#1C1C28]">
                    {user._count.reminders}
                  </span>
                  <span className="text-[13px] text-[#7C7C8A]">
                    {user.preferredCurrency ?? "SEK"}
                  </span>
                  <div>
                    {user.email !== ADMIN_EMAIL && (
                      <button
                        onClick={() => handleDelete(user.id, user.email)}
                        disabled={deletingId === user.id}
                        className="text-[13px] font-medium text-[#D94F4F] hover:underline disabled:opacity-40"
                      >
                        {deletingId === user.id ? "Deleting…" : "Delete"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Mobile */}
                <div className="flex sm:hidden items-start justify-between px-4 py-4 gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-[#1C1C28] text-[14px] truncate">
                      {user.name ?? "No name"}
                    </div>
                    <div className="text-[12px] text-[#7C7C8A] truncate">{user.email}</div>
                    <div className="text-[12px] text-[#7C7C8A] mt-0.5">
                      Joined {formatDate(user.createdAt)} · {user._count.reminders} reminders
                    </div>
                  </div>
                  {user.email !== ADMIN_EMAIL && (
                    <button
                      onClick={() => handleDelete(user.id, user.email)}
                      disabled={deletingId === user.id}
                      className="text-[13px] font-medium text-[#D94F4F] flex-shrink-0 hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
