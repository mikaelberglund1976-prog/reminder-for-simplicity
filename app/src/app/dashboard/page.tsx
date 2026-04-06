"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { differenceInDays } from "date-fns";
import Link from "next/link";
import { StarBackground } from "@/components/StarBackground";

type Reminder = {
  id: string;
  name: string;
  category: string;
  date: string;
  recurrence: string;
  amount: number | null;
  currency: string | null;
  note: string | null;
  reminderDaysBefore: number;
};

const CATEGORY_ICONS: Record<string, string> = {
  SUBSCRIPTION: "💳",
  BIRTHDAY: "🎂",
  INSURANCE: "🛡️",
  CONTRACT: "📄",
  HEALTH: "❤️",
  OTHER: "📌",
};

const CATEGORY_LABELS: Record<string, string> = {
  SUBSCRIPTION: "Subscriptions",
  BIRTHDAY: "Birthdays",
  INSURANCE: "Insurance",
  CONTRACT: "Contracts",
  HEALTH: "Health",
  OTHER: "Other",
};

const RECURRENCE_LABELS: Record<string, string> = {
  ONCE: "Once",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

const CATEGORIES = ["ALL", "SUBSCRIPTION", "BIRTHDAY", "INSURANCE", "CONTRACT", "HEALTH", "OTHER"];

function getDaysUntil(dateStr: string) {
  return differenceInDays(new Date(dateStr), new Date());
}

function DaysLeft({ days }: { days: number }) {
  if (days < 0)
    return <span style={{ fontWeight: 700, color: "#ff6b6b", fontSize: 13 }}>{Math.abs(days)}d ago</span>;
  if (days === 0)
    return <span style={{ fontWeight: 700, color: "#ffaa55", fontSize: 13 }}>Today</span>;
  if (days <= 7)
    return <span style={{ fontWeight: 700, color: "#ffaa55", fontSize: 13 }}>{days}d</span>;
  return <span style={{ fontWeight: 600, color: "rgba(200,220,255,0.8)", fontSize: 13 }}>{days}d</span>;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [preferredCurrency, setPreferredCurrency] = useState("SEK");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchReminders();
      fetchProfile();
    }
  }, [status]);

  async function fetchReminders() {
    try {
      const res = await fetch("/api/reminders");
      const data = await res.json();
      setReminders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProfile() {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        if (data.preferredCurrency) setPreferredCurrency(data.preferredCurrency);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const sorted = [...reminders].sort((a, b) => getDaysUntil(a.date) - getDaysUntil(b.date));
  const filtered = filter === "ALL" ? sorted : sorted.filter((r) => r.category === filter);

  const nextRenewal = sorted.find((r) => getDaysUntil(r.date) >= 0);
  const monthlyTotal = reminders
    .filter((r) => r.recurrence === "MONTHLY" && r.amount)
    .reduce((sum, r) => sum + (r.amount || 0), 0);
  const yearlyTotal = reminders.filter((r) => r.amount).reduce((sum, r) => {
    if (r.recurrence === "MONTHLY") return sum + (r.amount || 0) * 12;
    return sum + (r.amount || 0);
  }, 0);

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  if (status === "loading" || loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "radial-gradient(ellipse at 60% 25%, #1e3f8a 0%, #0e2268 28%, #070f3c 60%, #030820 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <StarBackground />
        <span style={{ color: "rgba(180,200,255,0.7)", fontSize: 15, position: "relative", zIndex: 1 }}>
          Loading…
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at 60% 25%, #1e3f8a 0%, #0e2268 28%, #070f3c 60%, #030820 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <StarBackground />

      {/* Sticky header */}
      <header
        style={{
          position: "sticky", top: 0, zIndex: 20,
          background: "rgba(7,15,60,0.88)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          padding: "0 32px",
          height: 64,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
            }}
          >
            🔔
          </div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 18, letterSpacing: "-0.3px" }}>
            AssistIQ
          </span>
        </Link>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/dashboard/new"
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              background: "linear-gradient(160deg, #4a7ee0 0%, #2e5ec8 100%)",
              color: "#fff", fontWeight: 700, fontSize: 14,
              padding: "9px 20px", borderRadius: 50, textDecoration: "none",
              boxShadow: "0 3px 14px rgba(46,94,200,0.45)",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: 17, lineHeight: 1, marginTop: -1 }}>+</span>
            Add reminder
          </Link>

          <Link
            href="/profile"
            style={{
              color: "rgba(180,205,255,0.6)", fontSize: 14, fontWeight: 500,
              textDecoration: "none", padding: "8px 12px",
            }}
          >
            Profile
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.13)",
              color: "rgba(180,205,255,0.75)", fontSize: 14, fontWeight: 600,
              padding: "8px 18px", borderRadius: 50, cursor: "pointer",
              letterSpacing: "-0.1px",
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main */}
      <main
        style={{
          position: "relative", zIndex: 10,
          maxWidth: 1100, margin: "0 auto",
          padding: "36px 24px 100px",
        }}
      >
        {/* Welcome */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: "#fff", fontWeight: 800, fontSize: 26, letterSpacing: "-0.5px", margin: 0 }}>
            Welcome, {firstName}
          </h1>
          <p style={{ color: "rgba(160,185,255,0.55)", fontSize: 14, marginTop: 5 }}>
            {reminders.length === 0
              ? "No reminders yet"
              : `${reminders.length} active reminder${reminders.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14, marginBottom: 36,
          }}
        >
          {[
            { value: reminders.length.toString(), label: "Active reminders", big: true },
            {
              value: nextRenewal ? nextRenewal.name : "—",
              sub: nextRenewal
                ? getDaysUntil(nextRenewal.date) === 0 ? "today" : `${getDaysUntil(nextRenewal.date)}d away`
                : undefined,
              label: "Next renewal",
            },
            {
              value: monthlyTotal > 0 ? `${monthlyTotal.toLocaleString("en")} ${preferredCurrency}` : "—",
              label: "Monthly cost",
            },
            {
              value: yearlyTotal > 0 ? `${Math.round(yearlyTotal).toLocaleString("en")} ${preferredCurrency}` : "—",
              label: "Yearly total",
            },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 14, padding: "18px 20px",
                backdropFilter: "blur(8px)",
              }}
            >
              <div
                style={{
                  color: "#fff", fontWeight: 800,
                  fontSize: stat.big ? 38 : 18,
                  lineHeight: 1.1, overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >
                {stat.value}
              </div>
              {stat.sub && (
                <div style={{ color: "rgba(255,170,80,0.9)", fontSize: 12, fontWeight: 600, marginTop: 2 }}>
                  {stat.sub}
                </div>
              )}
              <div style={{ color: "rgba(140,170,230,0.55)", fontSize: 12, fontWeight: 500, marginTop: 6 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Category filter */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 18 }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                flexShrink: 0, padding: "7px 16px", borderRadius: 50,
                fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                background:
                  filter === cat
                    ? "linear-gradient(160deg, #4a7ee0 0%, #2e5ec8 100%)"
                    : "rgba(255,255,255,0.07)",
                color: filter === cat ? "#fff" : "rgba(180,205,255,0.6)",
                boxShadow: filter === cat ? "0 2px 12px rgba(46,94,200,0.4)" : "none",
              }}
            >
              {cat === "ALL" ? "All" : `${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]}`}
            </button>
          ))}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16, padding: "60px 24px", textAlign: "center",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <h3 style={{ color: "#fff", fontSize: 17, fontWeight: 700, margin: "0 0 8px" }}>
              {filter === "ALL" ? "No reminders yet" : `No ${CATEGORY_LABELS[filter]?.toLowerCase() ?? ""} reminders`}
            </h3>
            <p style={{ color: "rgba(160,185,255,0.55)", fontSize: 14, margin: "0 0 24px" }}>
              {filter === "ALL"
                ? "Add the things you don't want to forget."
                : "Try a different category or add a new one."}
            </p>
            {filter === "ALL" && (
              <Link
                href="/dashboard/new"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "linear-gradient(160deg, #4a7ee0 0%, #2e5ec8 100%)",
                  color: "#fff", fontWeight: 700, fontSize: 15,
                  padding: "12px 28px", borderRadius: 50, textDecoration: "none",
                }}
              >
                + Add your first reminder
              </Link>
            )}
          </div>
        ) : (
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 16, overflow: "hidden",
              backdropFilter: "blur(10px)",
            }}
          >
            {/* Header row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 100px 68px 114px 130px",
                gap: 16, padding: "13px 22px",
                borderBottom: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              {[
                { label: "", align: "left" },
                { label: "Name", align: "left" },
                { label: "Date", align: "left" },
                { label: "Left", align: "left" },
                { label: "Recurrence", align: "left" },
                { label: "Amount", align: "right" },
              ].map((col, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 11, fontWeight: 700,
                    color: "rgba(130,165,230,0.55)",
                    textTransform: "uppercase", letterSpacing: "0.07em",
                    textAlign: col.align as "left" | "right",
                  }}
                >
                  {col.label}
                </div>
              ))}
            </div>

            {/* Data rows */}
            {filtered.map((reminder, i) => {
              const days = getDaysUntil(reminder.date);
              return (
                <div
                  key={reminder.id}
                  onClick={() => router.push(`/dashboard/${reminder.id}`)}
                  style={{
                    borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.07)",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.05)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLDivElement).style.background = "transparent")
                  }
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "40px 1fr 100px 68px 114px 130px",
                      gap: 16, alignItems: "center",
                      padding: "14px 22px",
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{CATEGORY_ICONS[reminder.category]}</span>

                    <div style={{ overflow: "hidden" }}>
                      <div
                        style={{
                          fontWeight: 600, color: "#fff", fontSize: 14,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}
                      >
                        {reminder.name}
                      </div>
                      {reminder.note && (
                        <div
                          style={{
                            fontSize: 12, color: "rgba(160,185,255,0.45)", marginTop: 2,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}
                        >
                          {reminder.note}
                        </div>
                      )}
                    </div>

                    <span style={{ color: "rgba(175,200,255,0.65)", fontSize: 13 }}>
                      {formatDate(reminder.date)}
                    </span>

                    <DaysLeft days={days} />

                    <span style={{ color: "rgba(175,200,255,0.65)", fontSize: 13 }}>
                      {RECURRENCE_LABELS[reminder.recurrence]}
                    </span>

                    <span
                      style={{
                        fontSize: 14, fontWeight: 600, textAlign: "right",
                        color: reminder.amount ? "#fff" : "rgba(180,205,255,0.25)",
                      }}
                    >
                      {reminder.amount
                        ? `${reminder.amount.toLocaleString("en")} ${reminder.currency}`
                        : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Mobile FAB */}
      <Link
        href="/dashboard/new"
        style={{
          position: "fixed", bottom: 24, right: 24,
          width: 56, height: 56,
          background: "linear-gradient(160deg, #4a7ee0 0%, #2e5ec8 100%)",
          color: "#fff", borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, textDecoration: "none",
          boxShadow: "0 6px 24px rgba(46,94,200,0.55)",
          zIndex: 30,
        }}
        aria-label="Add reminder"
      >
        +
      </Link>
    </div>
  );
}
