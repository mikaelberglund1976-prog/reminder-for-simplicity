"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { withNextDate } from "@/lib/recurrence";
import { useI18n } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

// Category / recurrence words: messages.reminders (2026-10-04).

const CATEGORY_BADGE: Record<string, { bg: string; color: string }> = {
  SUBSCRIPTION: { bg: "var(--tint-accent)", color: "var(--accent-strong)" },
  BIRTHDAY:     { bg: "var(--tint-pink)", color: "var(--pink)" },
  INSURANCE:    { bg: "var(--tint-success)", color: "var(--success)" },
  CONTRACT:     { bg: "var(--tint-warning)", color: "var(--warning)" },
  HEALTH:       { bg: "var(--tint-danger)", color: "var(--danger)" },
  BILL:         { bg: "var(--tint-violet)", color: "var(--violet)" },
  OTHER:        { bg: "var(--border)", color: "var(--slate)" },
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
  return { color: { bg: "var(--accent-bg)", text: "#fff" }, domain: null };
}

type HouseholdMember = { id: string; userId: string; user: { id: string; name: string | null; email: string } };

type Reminder = {
  id: string;
  name: string;
  category: string;
  date: string;
  startTime?: string | null;
  recurrence: string;
  amount: number | null;
  currency: string | null;
  note: string | null;
  reminderDaysBefore: number;
  lastSentAt: string | null;
  assignedTo: string | null;
  handoverState: string;
  handoverTo: string | null;
  urgencyLevel: string;
  canEdit?: boolean;
};

function formatDate(dateStr: string, dateLocale: string) {
  return new Date(dateStr).toLocaleDateString(dateLocale, {
    day: "numeric", month: "long", year: "numeric",
  });
}

// 2026-09-29 (GDPR review): logos used to be loaded from logo.clearbit.com
// straight from the browser, which sent every visitor's IP address (and which
// subscriptions they have) to a US third party. Brand colour + initials now,
// nothing leaves the app.
function ServiceLogo({ name }: { name: string }) {
  const { color } = getBrandInfo(name);
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: 52, height: 52, borderRadius: 16, overflow: "hidden", flexShrink: 0,
      background: color.bg, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{ color: color.text, fontWeight: 700, fontSize: 18 }}>{initials}</span>
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
function IcUser() {
  return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}

function Row({ icon, label, value, valueColor }: {
  icon: React.ReactNode; label: string; value: string; valueColor?: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "15px 0", borderTop: "1px solid var(--border-soft)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--muted)" }}>
        {icon}
        <span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 500 }}>{label}</span>
      </div>
      <span style={{ fontSize: 15, fontWeight: 600, color: valueColor ?? "var(--fg)" }}>{value}</span>
    </div>
  );
}

export default function ReminderDetailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { m: msg, dateLocale, err: tErr } = useI18n();
  const t = msg.reminderDetail;

  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Household & handover state
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [isPro, setIsPro] = useState(false);
  const [showHandoverPanel, setShowHandoverPanel] = useState(false);
  const [selectedHandoverUser, setSelectedHandoverUser] = useState("");
  const [handoverLoading, setHandoverLoading] = useState(false);
  const [handoverMsg, setHandoverMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [respondingHandover, setRespondingHandover] = useState(false);

  useEffect(() => {
    if (id) fetchReminder();
    fetchHousehold();
  }, [id]);

  async function fetchHousehold() {
    try {
      const res = await fetch("/api/household");
      if (res.ok) {
        const data = await res.json();
        if (data.household) {
          setIsPro(data.household.is_pro);
          setHouseholdMembers(data.household.members ?? []);
        }
      }
    } catch (e) { console.error(e); }
  }

  async function handleInitiateHandover(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedHandoverUser) return;
    setHandoverLoading(true);
    try {
      const res = await fetch(`/api/reminders/${id}/handover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: selectedHandoverUser }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ? tErr(data.error) : t.failed);
      setHandoverMsg({ type: "ok", text: t.handoverSent });
      setShowHandoverPanel(false);
      fetchReminder();
    } catch (err: unknown) {
      setHandoverMsg({ type: "err", text: err instanceof Error ? err.message : t.failed });
    } finally { setHandoverLoading(false); }
  }

  async function handleRespondHandover(action: "accept" | "reject") {
    setRespondingHandover(true);
    try {
      const res = await fetch(`/api/reminders/${id}/handover`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ? tErr(data.error) : t.failed);
      setHandoverMsg({ type: "ok", text: action === "accept" ? t.handoverAccepted : t.handoverDeclined });
      fetchReminder();
    } catch (err: unknown) {
      setHandoverMsg({ type: "err", text: err instanceof Error ? err.message : t.failed });
    } finally { setRespondingHandover(false); }
  }

  async function fetchReminder() {
    try {
      const res = await fetch("/api/reminders/" + id);
      if (!res.ok) throw new Error("Not found");
      // 2026-10-04: recurring reminders show their next date (same as Home + calendar).
      setReminder(withNextDate(await res.json()));
    } catch {
      // Used to bounce straight back to Home, which looked like "nothing happens".
      setNotFound(true);
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
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <span style={{ color: "var(--muted)", fontSize: 15 }}>{msg.home.thinking}</span>
      </div>
    );
  }

  if (!reminder) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT, padding: "24px 20px" }}>
        <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--accent)", fontSize: 14, fontWeight: 600, textDecoration: "none", marginBottom: 20 }}>
          <IcBack /> {t.back}
        </Link>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: 20, color: "var(--muted)", fontSize: 14 }}>
          {notFound ? t.notFound : t.couldNotLoad}
        </div>
      </div>
    );
  }
  const canEdit = reminder.canEdit !== false;

  const daysUntil = Math.ceil(
    (new Date(reminder.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  const statusLabel = daysUntil < 0
    ? t.daysAgo(Math.abs(daysUntil))
    : daysUntil === 0 ? t.today
    : t.daysLeft(daysUntil);
  const statusColor = daysUntil < 0 ? "var(--danger)" : daysUntil <= 3 ? "var(--warning)" : "var(--success)";
  const badge = CATEGORY_BADGE[reminder.category] ?? CATEGORY_BADGE.OTHER;

  const ownerMember = reminder.assignedTo
    ? householdMembers.find(m => m.userId === reminder.assignedTo)
    : null;
  const ownerDisplayName = ownerMember
    ? (ownerMember.user.name ?? ownerMember.user.email)
    : t.unassigned;

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT, paddingBottom: 40 }}>
      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "24px 20px 0" }}>

        {/* Back */}
        <Link href="/dashboard" style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          color: "var(--accent)", fontSize: 14, fontWeight: 600,
          textDecoration: "none", marginBottom: 20,
        }}>
          <IcBack /> {t.back}
        </Link>

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--fg)", margin: 0, letterSpacing: "-0.5px" }}>
            {t.title}
          </h1>
          <p style={{ fontSize: 14, color: "var(--fg-2)", margin: "6px 0 0" }}>
            {t.intro}
          </p>
        </div>

        {/* Main card */}
        <div style={{
          background: "var(--surface)", borderRadius: 20, border: "1px solid var(--border)",
          padding: "20px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", marginBottom: 14,
        }}>
          {/* Logo + name + badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <ServiceLogo name={reminder.name} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.3px" }}>
                {reminder.name}
              </div>
              <div style={{ marginTop: 6 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center",
                  padding: "4px 14px", borderRadius: 50,
                  fontSize: 13, fontWeight: 600,
                  background: badge.bg, color: badge.color,
                }}>
                  {msg.reminders.categories[reminder.category] ?? reminder.category}
                </span>
              </div>
            </div>
          </div>

          {/* Date row — no icon, just label: value */}
          <div style={{ borderTop: "1px solid var(--border-soft)", padding: "15px 0 0" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)" }}>
              {reminder.recurrence !== "ONCE" ? t.next : t.dateLabel}{formatDate(reminder.date, dateLocale)}{reminder.startTime ? ` · ${reminder.startTime}` : ""}
            </span>
          </div>

          {/* Info rows */}
          <Row icon={<IcClock />}  label={t.status}     value={statusLabel}  valueColor={statusColor} />
          <Row icon={<IcRepeat />} label={t.recurrence} value={msg.reminders.recurrence[reminder.recurrence] ?? reminder.recurrence} />
          {reminder.amount != null && (
            <Row icon={<IcCard />} label={t.amount}
              value={reminder.amount.toLocaleString(dateLocale) + " " + (reminder.currency ?? "")} />
          )}
          <Row icon={<IcBell />} label={t.remindMe}
            value={t.daysBefore(reminder.reminderDaysBefore)} />
          {householdMembers.length > 0 && (
            <Row icon={<IcUser />} label={t.owner}
              value={ownerDisplayName}
              valueColor={reminder.assignedTo ? undefined : "var(--subtle)"} />
          )}

          {/* Note if present */}
          {reminder.note && (
            <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 14, marginTop: 2 }}>
              <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500, marginBottom: 4 }}>{t.note}</div>
              <div style={{ fontSize: 14, color: "var(--fg)", lineHeight: 1.5 }}>{reminder.note}</div>
            </div>
          )}
        </div>

        {/* Handover message */}
        {handoverMsg && (
          <div style={{ background: handoverMsg.type === "ok" ? "var(--tint-success)" : "var(--tint-danger)", border: `1px solid ${handoverMsg.type === "ok" ? "var(--tint-success)" : "var(--border-danger)"}`, color: handoverMsg.type === "ok" ? "var(--success)" : "var(--danger)", borderRadius: 12, padding: "12px 16px", fontSize: 14, marginBottom: 12 }}>
            {handoverMsg.text}
          </div>
        )}

        {/* Pending handover — receiver sees Accept/Reject */}
        {reminder.handoverState === "PENDING" && reminder.handoverTo === session?.user?.id && (
          <div style={{ background: "var(--tint-warning)", border: "1.5px solid #F6E05E", borderRadius: 18, padding: 20, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--warning)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{t.pendingTitle}</div>
            <p style={{ fontSize: 14, color: "#4A3728", lineHeight: 1.5, marginBottom: 16 }}>
              {t.pendingBody1}<strong>{reminder.name}</strong>{t.pendingBody2}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => handleRespondHandover("accept")}
                disabled={respondingHandover}
                style={{ flex: 1, padding: "13px", background: "#2A9D6F", border: "none", borderRadius: 50, fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: FONT, opacity: respondingHandover ? 0.6 : 1 }}
              >
                {t.accept}
              </button>
              <button
                onClick={() => handleRespondHandover("reject")}
                disabled={respondingHandover}
                style={{ flex: 1, padding: "13px", background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 50, fontSize: 14, fontWeight: 600, color: "var(--danger)", cursor: "pointer", fontFamily: FONT, opacity: respondingHandover ? 0.6 : 1 }}
              >
                {t.decline}
              </button>
            </div>
          </div>
        )}

        {/* Pending handover indicator — for initiator */}
        {reminder.handoverState === "PENDING" && reminder.handoverTo !== session?.user?.id && (
          <div style={{ background: "var(--tint-warning)", border: "1.5px solid #F6E05E", borderRadius: 14, padding: "14px 16px", marginBottom: 12, fontSize: 14, color: "var(--warning)", fontWeight: 600 }}>
            {t.pendingWaiting}
          </div>
        )}

        {/* Assign owner button — visible to all household members */}
        {householdMembers.length > 1 && reminder.handoverState === "NONE" && (
          <>
            {!showHandoverPanel ? (
              <button
                onClick={() => setShowHandoverPanel(true)}
                style={{ width: "100%", padding: "15px", borderRadius: 50, background: "var(--surface)", border: "1.5px solid var(--border)", fontSize: 15, fontWeight: 600, color: "var(--fg)", cursor: "pointer", fontFamily: FONT, marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
              >
                {t.assignOwner}
              </button>
            ) : (
              <form onSubmit={handleInitiateHandover} style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", borderRadius: 18, padding: 20, marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)", marginBottom: 14 }}>{t.assignOwnerLabel}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  {householdMembers
                    .filter(m => m.userId !== session?.user?.id)
                    .map(m => (
                      <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: selectedHandoverUser === m.userId ? "var(--tint-accent)" : "var(--surface)", border: `1.5px solid ${selectedHandoverUser === m.userId ? "var(--accent)" : "var(--border)"}`, borderRadius: 12, cursor: "pointer" }}>
                        <input type="radio" name="handoverUser" value={m.userId} checked={selectedHandoverUser === m.userId} onChange={() => setSelectedHandoverUser(m.userId)} style={{ accentColor: "var(--accent)" }} />
                        <Avatar userId={m.userId} name={m.user.name ?? m.user.email} size={32} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{m.user.name ?? m.user.email}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>{m.user.email}</div>
                        </div>
                      </label>
                    ))}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" onClick={() => setShowHandoverPanel(false)} style={{ flex: 1, padding: "13px", background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 50, fontSize: 14, fontWeight: 600, color: "var(--muted)", cursor: "pointer", fontFamily: FONT }}>{msg.common.cancel}</button>
                  <button type="submit" disabled={!selectedHandoverUser || handoverLoading} style={{ flex: 2, padding: "13px", background: selectedHandoverUser ? "var(--ink)" : "var(--border)", border: "none", borderRadius: 50, fontSize: 14, fontWeight: 700, color: selectedHandoverUser ? "#fff" : "var(--subtle)", cursor: selectedHandoverUser ? "pointer" : "not-allowed", fontFamily: FONT, opacity: handoverLoading ? 0.6 : 1 }}>
                    {handoverLoading ? t.sending : t.sendHandover}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* Upsell card — shown when not Pro */}
        {!isPro && (
          <div style={{ background: "linear-gradient(135deg,var(--tint-accent),var(--tint-accent))", border: "1.5px solid var(--accent-border)", borderRadius: 18, padding: 18, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 22 }}>⚡</span>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>{t.proHandover}</div>
            </div>
            <div style={{ fontSize: 13, color: "#6B7080", lineHeight: 1.5 }}>
              {t.proHandoverBody}
            </div>
            <div style={{ fontSize: 12, color: "#8B80C8", marginTop: 10, fontWeight: 600 }}>{t.askAdmin}</div>
          </div>
        )}

        {canEdit ? (<>
        {/* Edit button */}
        <Link href={"/dashboard/" + reminder.id + "/edit"} style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: "100%", padding: "17px", borderRadius: 50,
          background: "var(--ink)", border: "none",
          fontSize: 16, fontWeight: 700, color: "#fff",
          textDecoration: "none", boxSizing: "border-box",
          boxShadow: "0 2px 10px rgba(26,35,64,0.22)", marginBottom: 10,
        }}>
          {t.edit}
        </Link>

        {/* Delete button */}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              width: "100%", padding: "17px", borderRadius: 50,
              background: "var(--tint-danger)", border: "1.5px solid var(--border-danger)",
              fontSize: 16, fontWeight: 600, color: "var(--danger)",
              cursor: "pointer", fontFamily: FONT,
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            {t.delete}
          </button>
        ) : (
          <div style={{
            background: "var(--tint-danger)", border: "1.5px solid var(--border-danger)",
            borderRadius: 20, padding: "18px 20px", textAlign: "center",
          }}>
            <div style={{ fontSize: 14, color: "var(--fg)", fontWeight: 600, marginBottom: 4 }}>
              {t.deleteConfirm}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
              {t.cannotUndo}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  flex: 1, padding: "12px", borderRadius: 50,
                  background: "var(--surface)", border: "1.5px solid var(--border)",
                  fontSize: 14, fontWeight: 600, color: "var(--fg)",
                  cursor: "pointer", fontFamily: FONT,
                 }}
              >
                {msg.common.cancel}
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
                {deleting ? t.deleting : t.yesDelete}
              </button>
            </div>
          </div>
        )}
        </>) : (
          <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "8px 0" }}>{t.sharedReadOnly}</div>
        )}

      </main>
    </div>
  );
}
