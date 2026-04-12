"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

const CATEGORY_LABELS: Record<string, string> = {
  SUBSCRIPTION: "Subscription",
  BIRTHDAY:     "Birthday",
  INSURANCE:    "Insurance",
  CONTRACT:     "Contract",
  HEALTH:       "Health",
  BILL:         "Bill",
  OTHER:        "Other",
};

const CATEGORY_BADGE: Record<string, { bg: string; color: string }> = {
  SUBSCRIPTION: { bg: "#D6E8FF", color: "#3A78D4" },
  BIRTHDAY:     { bg: "#FFE8F5", color: "#C4367A" },
  INSURANCE:    { bg: "#D4F4E6", color: "#1E7D52" },
  CONTRACT:     { bg: "#FFF0E0", color: "#C06010" },
  HEALTH:       { bg: "#FFE8E8", color: "#C44444" },
  BILL:         { bg: "#EDE8FF", color: "#6A44CC" },
  OTHER:        { bg: "#E8EDF4", color: "#5A6080" },
};

const RECURRENCE_LABELS: Record<string, string> = {
  ONCE:    "Once",
  DAILY:   "Daily",
  WEEKLY:  "Weekly",
  MONTHLY: "Monthly",
  YEARLY:  "Yearly",
};

const BRAND_COLORS: Record<string, { bg: string; text: string }> = {
  spotify:   { bg: "#1DB954", text: "#fff" },
  netflix:   { bg: "#E50914", text: "#fff" },
  youtube:   { bg: "#FF0000", text: "#fff" },
  apple:     { bg: "#000000", text: "#fff" },
  google:    { bg: "#4285F4", text: "#fff" },
  amazon:    { bg: "#FF9900", text: "#000" },
  microsoft: { bg: "#00A4EF", text: "#fff" },
  adobe:     { bg: "#FF0000", text: "#fff" },
  dropbox:   { bg: "#0061FF", text: "#fff" },
  slack:     { bg: "#4A154B", text: "#fff" },
  github:    { bg: "#24292E", text: "#fff" },
  notion:    { bg: "#000000", text: "#fff" },
  figma:     { bg: "#F24E1E", text: "#fff" },
  linkedin:  { bg: "#0A66C2", text: "#fff" },
  twitter:   { bg: "#1DA1F2", text: "#fff" },
  discord:   { bg: "#5865F2", text: "#fff" },
  zoom:      { bg: "#2D8CFF", text: "#fff" },
  hulu:      { bg: "#1CE783", text: "#000" },
  disney:    { bg: "#113CCF", text: "#fff" },
};

const BRAND_DOMAINS: Record<string, string> = {
  spotify:   "spotify.com",
  netflix:   "netflix.com",
  youtube:   "youtube.com",
  apple:     "apple.com",
  google:    "google.com",
  amazon:    "amazon.com",
  microsoft: "microsoft.com",
  adobe:     "adobe.com",
  dropbox:   "dropbox.com",
  slack:     "slack.com",
  github:    "github.com",
  notion:    "notion.so",
  figma:     "figma.com",
  linkedin:  "linkedin.com",
  twitter:   "twitter.com",
  discord:   "discord.com",
  zoom:      "zoom.us",
  hulu:      "hulu.com",
  disney:    "disneyplus.com",
};

function getBrandInfo(name: string) {
  const lower = name.toLowerCase();
  for (const brand in BRAND_COLORS) {
    if (lower.includes(brand)) {
      return { color: BRAND_COLORS[brand], domain: BRAND_DOMAINS[brand] ?? null };
    }
  }
  return { color: { bg: "#5B9CF5", text: "#fff" }, domain: null };
}

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
  lastSentAt: string | null;
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function ServiceLogo({ name }: { name: string }) {
  const [imgError, setImgError] = useState(false);
  const { color, domain } = getBrandInfo(name);
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: 52, height: 52, borderRadius: 16, overflow: "hidden", flexShrink: 0,
      background: (!domain || imgError) ? color.bg : "#f0f0f0",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {domain && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={"https://logo.clearbit.com/" + domain} alt={name} width={52} height={52}
          onError={() => setImgError(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ color: color.text, fontWeight: 700, fontSize: 18 }}>{initials}</span>
      )}
    </div>
  );
}

// Inline SVG icons
function IcClock() {
  return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
function IcRepeat() {
  return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
}
function IcCard() {
  return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
}
function IcBell() {
  return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
}
function IcBack() {
  return <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
}

function Row({ icon, label, value, valueColor }: {
  icon: React.ReactNode; label: string; value: string; valueColor?: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "15px 0", borderTop: "1px solid #F0F3F8",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#8B90A4" }}>
        {icon}
        <span style={{ fontSize: 15, color: "#8B90A4", fontWeight: 500 }}>{label}</span>
      </div>
      <span style={{ fontSize: 15, fontWeight: 600, color: valueColor ?? "#1A2340" }}>{value}</span>
    </div>
  );
}

export default function ReminderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (id) fetchReminder();
  }, [id]);

  async function fetchReminder() {
    try {
      const res = await fetch("/api/reminders/" + id);
      if (!res.ok) throw new Error("Not found");
      setReminder(await res.json());
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch("/api/reminders/" + id, { method: "DELETE" });
      router.push("/dashboard");
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F5F6FA", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <span style={{ color: "#8B90A4", fontSize: 15 }}>AssistIQ is thinking…</span>
      </div>
    );
  }

  if (!reminder) return null;

  const daysUntil = Math.ceil(
    (new Date(reminder.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  const statusLabel = daysUntil < 0
    ? Math.abs(daysUntil) + " days ago"
    : daysUntil === 0 ? "Today"
    : daysUntil + " days left";
  const statusColor = daysUntil < 0 ? "#D94F4F" : daysUntil <= 7 ? "#C06010" : "#2A9D6F";
  const badge = CATEGORY_BADGE[reminder.category] ?? CATEGORY_BADGE.OTHER;

  return (
    <div style={{ minHeight: "100vh", background: "#F5F6FA", fontFamily: FONT, paddingBottom: 40 }}>
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px 0" }}>

        {/* Back */}
        <Link href="/dashboard" style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          color: "#5B9CF5", fontSize: 15, fontWeight: 600,
          textDecoration: "underline", marginBottom: 20,
        }}>
          <IcBack /> Back
        </Link>

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1A2340", margin: 0, letterSpacing: "-0.5px" }}>
            Reminder
          </h1>
          <p style={{ fontSize: 14, color: "#8B90A4", margin: "6px 0 0" }}>
            Edit the details or remove this reminder.
          </p>
        </div>

        {/* Main card */}
        <div style={{
          background: "#fff", borderRadius: 20, border: "1px solid #E8EDF4",
          padding: "20px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", marginBottom: 14,
        }}>
          {/* Logo + name + badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <ServiceLogo name={reminder.name} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1A2340", letterSpacing: "-0.3px" }}>
                {reminder.name}
              </div>
              <div style={{ marginTop: 6 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center",
                  padding: "4px 14px", borderRadius: 50,
                  fontSize: 13, fontWeight: 600,
                  background: badge.bg, color: badge.color,
                }}>
                  {CATEGORY_LABELS[reminder.category] ?? reminder.category}
                </span>
              </div>
            </div>
          </div>

          {/* Date row — no icon, just label: value */}
          <div style={{ borderTop: "1px solid #F0F3F8", padding: "15px 0 0" }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#1A2340" }}>
              Date: {formatDate(reminder.date)}
            </span>
          </div>

          {/* Info rows */}
          <Row icon={<IcClock />}  label="Status"     value={statusLabel}  valueColor={statusColor} />
          <Row icon={<IcRepeat />} label="Recurrence" value={RECURRENCE_LABELS[reminder.recurrence] ?? reminder.recurrence} />
          {reminder.amount != null && (
            <Row icon={<IcCard />} label="Amount"
              value={reminder.amount.toLocaleString("sv") + " " + (reminder.currency ?? "")} />
          )}
          <Row icon={<IcBell />} label="Remind me"
            value={reminder.reminderDaysBefore + " day" + (reminder.reminderDaysBefore !== 1 ? "s" : "") + " before"} />

          {/* Note if present */}
          {reminder.note && (
            <div style={{ borderTop: "1px solid #F0F3F8", paddingTop: 14, marginTop: 2 }}>
              <div style={{ fontSize: 13, color: "#8B90A4", fontWeight: 500, marginBottom: 4 }}>Note</div>
              <div style={{ fontSize: 14, color: "#1A2340", lineHeight: 1.5 }}>{reminder.note}</div>
            </div>
          )}
        </div>

        {/* Edit button */}
        <Link href={"/dashboard/" + reminder.id + "/edit"} style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: "100%", padding: "17px", borderRadius: 50,
          background: "#fff", border: "1.5px solid #E8EDF4",
          fontSize: 16, fontWeight: 600, color: "#1A2340",
          textDecoration: "none", boxSizing: "border-box",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 10,
        }}>
          Edit reminder
        </Link>

        {/* Delete button */}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              width: "100%", padding: "17px", borderRadius: 50,
              background: "#FFF0EE", border: "1.5px solid #FFD9D4",
              fontSize: 16, fontWeight: 600, color: "#D94F4F",
              cursor: "pointer", fontFamily: FONT,
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            Delete reminder
          </button>
        ) : (
          <div style={{
            background: "#FFF0EE", border: "1.5px solid #FFD9D4",
            borderRadius: 20, padding: "18px 20px", textAlign: "center",
          }}>
            <div style={{ fontSize: 14, color: "#1A2340", fontWeight: 600, marginBottom: 4 }}>
              Delete this reminder?
            </div>
            <div style={{ fontSize: 13, color: "#8B90A4", marginBottom: 16 }}>
              This cannot be undone.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  flex: 1, padding: "12px", borderRadius: 50,
                  background: "#fff", border: "1.5px solid #E8EDF4",
                  fontSize: 14, fontWeight: 600, color: "#1A2340",
                  cursor: "pointer", fontFamily: FONT,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1, padding: "12px", borderRadius: 50,
                  background: "#D94F4F", border: "none",
                  fontSize: 14, fontWeight: 600, color: "#fff",
                  cursor: deleting ? "not-allowed" : "pointer",
                  opacity: deleting ? 0.6 : 1, fontFamily: FONT,
                }}
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
