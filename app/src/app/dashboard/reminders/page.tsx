"use client";

// 2026-10-18 (Navigation 2.0, spec §11 + §35): Reminders as a full area of its
// own — reachable from More and pickable as a bottom tab. Holds what used to
// make Home long: every reminder with filter + sort, and the three numbers.
// Same data and the same rows as before (components/ReminderParts.tsx).
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMe } from "@/lib/me";
import { withNextDate } from "@/lib/recurrence";
import { reminderDisplayName } from "@/lib/birthdayLabel";
import { useI18n } from "@/lib/i18n/client";
import { CATEGORY_BADGE, StatCard, ReminderRow, getDaysUntil, compactAmount, type Reminder, type HouseholdMember } from "@/components/ReminderParts";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcBell() { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
function IcAlert() { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>; }
function IcCard() { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>; }
function IcDown() { return <svg width={13} height={13} viewBox="0 0 24 24" {...STR} strokeWidth={2.5}><polyline points="6 9 12 15 18 9"/></svg>; }

export default function RemindersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { m: msg } = useI18n();
  const t = msg.home;
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("SEK");
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [hasHousehold, setHasHousehold] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [sortBy, setSort] = useState("date_asc");

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    getMe().then((me) => {
      if (me?.isChildProfile) { router.replace("/dashboard/family/child"); return; }
      if (me?.preferredCurrency) setCurrency(me.preferredCurrency);
    });
    fetch("/api/reminders").then((r) => r.json()).then((data) => {
      setReminders(Array.isArray(data) ? data.map(withNextDate).map((r: Reminder) => ({ ...r, name: reminderDisplayName(r, new Date(r.date), msg.birthdays) })) : []);
    }).catch(() => {}).finally(() => setLoading(false));
    fetch("/api/household").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.household) { setHasHousehold(true); setMembers(d.household.members ?? []); }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const me = session?.user?.id;
  const overdue = reminders.filter((r) => getDaysUntil(r.date) < 0).length;
  const yearly = reminders.filter((r) => r.amount != null && r.amount > 0).reduce((sum, r) => {
    const a = r.amount ?? 0;
    return sum + (r.recurrence === "MONTHLY" ? a * 12 : r.recurrence === "WEEKLY" ? a * 52 : r.recurrence === "DAILY" ? a * 365 : a);
  }, 0);
  const shared = reminders.filter((r) => r.user && r.user.id !== me);
  const sorted = [...reminders].sort((a, b) => {
    if (sortBy === "date_desc") return getDaysUntil(b.date) - getDaysUntil(a.date);
    if (sortBy === "name_asc") return a.name.localeCompare(b.name);
    if (sortBy === "amount_desc") return (b.amount ?? 0) - (a.amount ?? 0);
    return getDaysUntil(a.date) - getDaysUntil(b.date);
  });
  const list = sorted.filter((r) => {
    if (filter === "FAMILY") return r.user && r.user.id !== me;
    if (filter === "UNASSIGNED") return !r.assignedTo;
    if (filter !== "ALL") return r.category === filter;
    return true;
  });

  const dropdown: React.CSSProperties = {
    width: "100%", appearance: "none", WebkitAppearance: "none", background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 12,
    padding: "11px 38px 11px 14px", fontSize: 13, fontWeight: 600, color: "var(--fg)", cursor: "pointer", fontFamily: FONT,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT }}>
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)", margin: 0, flex: 1 }}>{msg.nav.reminders}</h1>
          <Link href="/dashboard/new" style={{ background: "var(--accent-bg)", color: "var(--on-accent)", borderRadius: 50, padding: "8px 14px", fontSize: 13.5, fontWeight: 800, textDecoration: "none" }}>
            + {t.quick.newReminder}
          </Link>
        </div>
      </div>

      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "20px 20px 40px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)", fontSize: 14 }}>{t.thinking}</div>
        ) : reminders.length === 0 ? (
          <div style={{ background: "var(--surface)", borderRadius: 20, border: "1px solid var(--border)", padding: "40px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden>🔔</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", marginBottom: 6 }}>{t.noReminders}</div>
            <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20, lineHeight: 1.5 }}>{t.noRemindersBody}</div>
            <Link href="/dashboard/new" style={{ display: "inline-flex", background: "var(--accent-bg)", color: "var(--on-accent)", borderRadius: 50, padding: "12px 24px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
              {t.addFirst}
            </Link>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 16 }}>
              <StatCard icon={<IcBell />} iconColor="var(--accent)" iconBg="var(--tint-accent)" value={reminders.length} label={t.statActive} />
              <button onClick={() => { setFilter("ALL"); setSort("date_asc"); }} style={{ all: "unset", cursor: "pointer", display: "block" }} aria-label={t.statOverdue}>
                <StatCard icon={<IcAlert />} iconColor="var(--danger)" iconBg="var(--tint-danger)" value={overdue} label={t.statOverdue} />
              </button>
              <button onClick={() => setSort("amount_desc")} style={{ all: "unset", cursor: "pointer", display: "block" }} aria-label={t.reviewCosts}>
                <StatCard icon={<IcCard />} iconColor="var(--success)" iconBg="var(--tint-success)" value={yearly > 0 ? compactAmount(yearly) : "—"} label={`${t.perYear}${yearly > 0 ? " · " + currency : ""}`} />
              </button>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <select value={filter} onChange={(e) => setFilter(e.target.value)} style={dropdown} aria-label={t.allReminders}>
                  <option value="ALL">{t.allReminders}</option>
                  {hasHousehold && shared.length > 0 && <option value="FAMILY">{t.familyShared}</option>}
                  {hasHousehold && <option value="UNASSIGNED">{t.unassigned}</option>}
                  {["SUBSCRIPTION", "BIRTHDAY", "INSURANCE", "CONTRACT", "HEALTH", "BILL", "OTHER"].map((c) => (
                    <option key={c} value={c}>{msg.reminders.categoriesPlural[c]}</option>
                  ))}
                </select>
                <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--muted)" }}><IcDown /></div>
              </div>
              <div style={{ position: "relative", flex: 1 }}>
                <select value={sortBy} onChange={(e) => setSort(e.target.value)} style={dropdown} aria-label={t.sort.date_asc}>
                  <option value="date_asc">{t.sort.date_asc}</option>
                  <option value="date_desc">{t.sort.date_desc}</option>
                  <option value="name_asc">{t.sort.name_asc}</option>
                  <option value="amount_desc">{t.sort.amount_desc}</option>
                </select>
                <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--muted)" }}><IcDown /></div>
              </div>
            </div>

            {list.length === 0 ? (
              <div style={{ background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)", padding: "28px 16px", textAlign: "center", color: "var(--subtle)", fontSize: 13.5 }}>
                {t.noReminders}
              </div>
            ) : (
              <div style={{ background: "var(--surface)", borderRadius: 20, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "var(--shadow)" }}>
                {list.map((r, i) => (
                  <ReminderRow key={r.id} reminder={r} badge={CATEGORY_BADGE[r.category] ?? CATEGORY_BADGE.OTHER} isFirst={i === 0}
                    onClick={() => router.push(`/dashboard/${r.id}`)} currentUserId={me} householdMembers={members} hasHousehold={hasHousehold} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
