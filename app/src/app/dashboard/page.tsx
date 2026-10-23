"use client";

import { useSession } from "next-auth/react";
import StartGuide from "@/components/StartGuide";
import GiftSharesCard from "@/components/GiftSharesCard";
import QuickAdd from "@/components/QuickAdd";
import ChangesCard from "@/components/ChangesCard";
import TomorrowCard from "@/components/TomorrowCard";
import TripSoonCard from "@/components/TripSoonCard";
import { useLessons, FirstLessonMini, FirstLessonRow, WeekSheet } from "@/components/Timetable";
import { nextStart } from "@/lib/lessonPlan";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import Avatar from "@/components/Avatar";
import { getMe } from "@/lib/me";
import { homeHeaderUrl, useFamilyMedia } from "@/lib/familyMedia";
import { useFamilyColors } from "@/lib/familyColorsClient";
import type { ColorKind } from "@/lib/familyColors";
import { withNextDate, getOccurrencesInRange, dateKey, type RecurringItem } from "@/lib/recurrence";
import { reminderDisplayName, type BirthdayMeta } from "@/lib/birthdayLabel";
import { normalizeHomePrefs, type HomePrefs } from "@/lib/homePrefs";
import { formatTimeRange } from "@/lib/timeFormat";
import { useI18n } from "@/lib/i18n/client";
import { CATEGORY_BADGE, ServiceLogo, StatCard, ReminderRow, getDaysUntil, formatDate, compactAmount, type Reminder, type HouseholdMember } from "@/components/ReminderParts";
import { relativeDay } from "@/lib/i18n/relative";
import type { Messages } from "@/lib/i18n/messages";


type SchoolItem = {
  id: string; name: string; date: string; subject: string | null;
  schoolKind: "HOMEWORK" | "TEST" | "OTHER" | null; completedAt: string | null;
  assignedUser: { id: string; name: string | null; email: string } | null;
  startTime?: string | null;
};

// 2026-10-09: activities for "Next up per child".
type ActivityItem = {
  id: string; name: string; date: string; note: string | null;
  recurrence: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  choreRecurrenceDays: string | null;
  assignedUser: { id: string; name: string | null; email: string } | null;
  startTime?: string | null; endTime?: string | null;
};

type NextUpEntry = {
  key: string; id: string; kind: "TEST" | "HOMEWORK" | "OTHER" | "ACTIVITY";
  title: string; day: Date; startTime: string | null; endTime: string | null; href: string;
};


const SZ = { width: 20, height: 20 };
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function IcBell()    { return <svg {...SZ} viewBox="0 0 24 24" {...STR}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
function IcCard()    { return <svg {...SZ} viewBox="0 0 24 24" {...STR}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>; }
function IcAlert()   { return <svg {...SZ} viewBox="0 0 24 24" {...STR}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>; }

const HOME_LIST_LIMIT = 5;
const HOME_BIRTHDAY_LIMIT = 2;
const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
// 2026-10-23 (row 55): one width for every person on Home, so names and school start line up.
const PERSON_COL = 66;

function IcCart()    { return <svg {...SZ} viewBox="0 0 24 24" {...STR}><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 6H5.6"/></svg>; }
function IcCamera()  { return <svg {...SZ} viewBox="0 0 24 24" {...STR}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>; }
function IcSchool()  { return <svg {...SZ} viewBox="0 0 24 24" {...STR}><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12.5V17c0 1.5 2.5 3 6 3s6-1.5 6-3v-4.5"/></svg>; }
function IcChecklist() { return <svg {...SZ} viewBox="0 0 24 24" {...STR}><path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="m4 6 1 1 2-2"/><path d="m4 12 1 1 2-2"/><path d="m4 18 1 1 2-2"/></svg>; }
function IcGift()    { return <svg {...SZ} viewBox="0 0 24 24" {...STR}><rect x="3" y="8" width="18" height="4"/><rect x="4" y="12" width="16" height="9"/><path d="M12 8v13M12 8c-1.5-3-5-3-5-1s2 1 5 1zM12 8c1.5-3 5-3 5-1s-2 1-5 1z"/></svg>; }
function IcCalendar() { return <svg {...SZ} viewBox="0 0 24 24" {...STR}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function IcSuitcase() { return <svg {...SZ} viewBox="0 0 24 24" {...STR}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M8 11v5M16 11v5"/></svg>; }
function IcCake() { return <svg {...SZ} viewBox="0 0 24 24" {...STR}><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3M12 8v3M17 8v3"/></svg>; }
function IcBellPlus() { return <svg {...SZ} viewBox="0 0 24 24" {...STR}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M12 6v5M9.5 8.5h5"/></svg>; }

// Order = how often the personas reached for them in the review.
const QUICK_ACTIONS: { label: keyof Messages["home"]["quick"]; href: string; Icon: () => React.ReactElement; color: string; tint: string; pro?: boolean }[] = [
  { label: "newReminder",  href: "/dashboard/new",                 Icon: IcBellPlus,  color: "var(--accent)",  tint: "var(--tint-accent)" },
  { label: "shoppingList", href: "/dashboard/family/shopping-list", Icon: IcCart,      color: "var(--success)", tint: "var(--tint-success)" },
  { label: "scan",          href: "/dashboard/intake",               Icon: IcCamera,    color: "var(--violet)",  tint: "var(--tint-accent)", pro: true },
  { label: "homework", href: "/dashboard/school",           Icon: IcSchool,    color: "var(--accent)",  tint: "var(--tint-accent)" , pro: true },
  { label: "chores",        href: "/dashboard/family",               Icon: IcChecklist, color: "var(--warning)", tint: "var(--tint-warning)" , pro: true },
  { label: "wishlists",     href: "/dashboard/wishlist",             Icon: IcGift,      color: "var(--danger)",  tint: "var(--tint-danger)" , pro: true },
  // 2026-10-10: birthdays are free.
  { label: "birthdays",     href: "/dashboard/birthdays",            Icon: IcCake,      color: "var(--pink)",    tint: "var(--tint-pink)" },
  // 2026-10-11: trips — passports, flights, packing, ideas.
  { label: "trips",         href: "/dashboard/trips",                Icon: IcSuitcase,  color: "var(--accent)",  tint: "var(--tint-accent)" },
  { label: "calendar",      href: "/dashboard/calendar",             Icon: IcCalendar,  color: "var(--fg-2)",    tint: "var(--surface-3)" },
];

function SectionTitle({ children, inline }: { children: React.ReactNode; inline?: boolean }) {
  return <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--fg)", margin: inline ? 0 : "0 0 10px", letterSpacing: "-0.2px" }}>{children}</h2>;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reminders, setReminders]        = useState<Reminder[]>([]);
  const [loading, setLoading]            = useState(true);
  const [preferredCurrency, setCurrency] = useState("SEK");
  // 2026-10-18: filter + sort live on the Reminders page now.
  const filterCategory = "ALL" as string;
  const sortBy = "date_asc" as string;
  const [hasHousehold, setHasHousehold]  = useState(false);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [plan, setPlan] = useState<{ plan: "FREE" | "TRIAL" | "PRO"; trialDaysLeft: number | null } | null>(null);
  const [familySummary, setFamilySummary] = useState<{ childId: string; childName: string; total: number; done: number; pending: number }[]>([]);
  // 2026-09-28 (test round, row 39): upcoming tests & homework per child.
  const [schoolItems, setSchoolItems] = useState<SchoolItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  // 2026-10-09: what this person wants on Home (Settings → Home).
  const [prefs, setPrefs] = useState<HomePrefs>(() => normalizeHomePrefs(null));
  // 2026-09-28 (row 38): don't render the adult home at all until we know
  // this isn't a child (they're sent to their own "My week").
  const [roleChecked, setRoleChecked] = useState(false);
  const media = useFamilyMedia();
  // 2026-10-22: each child's first lesson + the week's timetable.
  const { lessons, starts } = useLessons(roleChecked);
  const [weekFor, setWeekFor] = useState<{ id: string; name: string } | null>(null);
  const { m: msg, locale, dateLocale } = useI18n();
  const t = msg.home;
  // 2026-10-10: a type colour the family picked (Settings → Colours) wins over the built-in badge colour.
  const famColors = useFamilyColors().colors;
  function familyBadge(kind: string): { bg: string; fg: string; label: string } | null {
    const map: Record<string, [ColorKind, string]> = {
      TEST: ["test", msg.homePrefs.kindTest], HOMEWORK: ["homework", msg.homePrefs.kindHomework],
      ACTIVITY: ["training", msg.homePrefs.kindActivity], REMINDER: ["reminder", msg.homePrefs.kindReminder],
    };
    const hit = map[kind];
    const c = hit && famColors.kinds[hit[0]];
    return hit && c ? { bg: `${c}1F`, fg: c, label: hit[1] } : null;
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    getMe().then((me) => {
      if (me?.isChildProfile) { router.replace("/dashboard/family/child"); return; }
      if (me?.preferredCurrency) setCurrency(me.preferredCurrency);
      setRoleChecked(true);
      fetchReminders(); fetchHousehold(); fetchFamilyData();
      fetch("/api/profile/home-prefs").then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.prefs) setPrefs(normalizeHomePrefs(d.prefs)); }).catch(() => {});
    });
  }, [status]);

  async function fetchReminders() {
    try {
      const res = await fetch("/api/reminders");
      const data = await res.json();
      // 2026-10-04: recurring items show their next date everywhere (as in the calendar).
      // 2026-10-10: birthdays read "🎂 Elsa turns 13" for their next occurrence.
      setReminders(Array.isArray(data) ? data.map(withNextDate).map((r: Reminder) => ({ ...r, name: reminderDisplayName(r, new Date(r.date), msg.birthdays) })) : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function fetchHousehold() {
    try {
      const res = await fetch("/api/household");
      if (res.ok) {
        const d = await res.json();
        if (d.access) setPlan(d.access);
        if (d.household) {
          setHasHousehold(true);
          setHouseholdMembers(d.household.members ?? []);
        }
      }
    } catch (e) { console.error(e); }
  }

  const [creatingHousehold, setCreatingHousehold] = useState(false);
  async function createHousehold() {
    setCreatingHousehold(true);
    try {
      const res = await fetch("/api/household", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      if (res.ok) await fetchHousehold();
    } finally {
      setCreatingHousehold(false);
    }
  }

  async function fetchFamilyData() {
    try {
      const trialRes = await fetch("/api/family/trial");
      if (!trialRes.ok) return;
      const trialData = await trialRes.json();
      if (trialData.trialActive || trialData.isPro) {
        const [weekRes, schoolRes, actRes] = await Promise.all([fetch("/api/family/week"), fetch("/api/family/chores?category=SCHOOL"), fetch("/api/family/chores?category=TRAINING")]);
        if (actRes.ok) {
          const ad = await actRes.json();
          setActivities(ad.chores ?? []);
        }
        if (weekRes.ok) {
          const weekData = await weekRes.json();
          setFamilySummary(weekData.summary ?? []);
        }
        if (schoolRes.ok) {
          const sd = await schoolRes.json();
          setSchoolItems(sd.chores ?? []);
        }
      }
    } catch (e) { console.error(e); }
  }

  // Stats
  const totalActive   = reminders.length;
  const passedCount   = reminders.filter(r => getDaysUntil(r.date) < 0).length;
  const attentionItems = [...reminders]
    .filter(r => getDaysUntil(r.date) <= 7)
    .sort((a, b) => getDaysUntil(a.date) - getDaysUntil(b.date));

  // Yearly budget — annualise each amount by recurrence
  const yearlyTotal = reminders
    .filter(r => r.amount != null && r.amount > 0)
    .reduce((sum, r) => {
      const a = r.amount ?? 0;
      switch (r.recurrence) {
        case "MONTHLY": return sum + a * 12;
        case "WEEKLY":  return sum + a * 52;
        case "DAILY":   return sum + a * 365;
        default:        return sum + a; // ONCE, YEARLY
      }
    }, 0);



  const sorted = [...reminders].sort((a, b) => {
    if (sortBy === "date_asc")    return getDaysUntil(a.date) - getDaysUntil(b.date);
    if (sortBy === "date_desc")   return getDaysUntil(b.date) - getDaysUntil(a.date);
    if (sortBy === "name_asc")    return a.name.localeCompare(b.name);
    if (sortBy === "amount_desc") return (b.amount ?? 0) - (a.amount ?? 0);
    return 0;
  });
  // 2026-10-11 (Mikael): with the whole family's birthdays on, they took over
  // the list. Home shows only the next two; the Birthdays page has them all.
  // Picking the "Birthdays" filter still lists every one.
  const birthdaysSoonest = reminders.filter(r => r.category === "BIRTHDAY").sort((a, b) => getDaysUntil(a.date) - getDaysUntil(b.date));
  const shownBirthdayIds = new Set(birthdaysSoonest.slice(0, HOME_BIRTHDAY_LIMIT).map(r => r.id));
  const hiddenBirthdays = filterCategory === "BIRTHDAY" ? 0 : Math.max(0, birthdaysSoonest.length - HOME_BIRTHDAY_LIMIT);
  const filtered = sorted.filter(r => {
    if (r.category === "BIRTHDAY" && filterCategory !== "BIRTHDAY" && !shownBirthdayIds.has(r.id)) return false;
    if (filterCategory === "FAMILY")     return r.user && r.user.id !== session?.user?.id;
    if (filterCategory === "UNASSIGNED") return !r.assignedTo;
    if (filterCategory !== "ALL")        return r.category === filterCategory;
    return true;
  });
  const firstName = session?.user?.name?.split(" ")[0] ?? t.there;

  // Pre-compute family card display values (avoids complex JSX expressions)
  // 2026-10-04 (Mikael): only children who actually have chores this week —
  // the card used to show "0/0" for everyone before any chore existed.
  const familyCardRows = familySummary.filter(c => c.total > 0).slice(0, 4).map(c => ({
    id: c.childId,
    name: c.childName,
    label: c.done + "/" + c.total,
    pct: c.total > 0 ? Math.round((c.done / c.total) * 100) : 0,
    allDone: c.done === c.total && c.total > 0,
  }));
  const pendingApprovals = familySummary.reduce((s, c) => s + c.pending, 0);

  // 2026-10-09 (Mikael: "man borde se de närmaste aktiviteterna per barn –
  // prov, uppgifter och träningar eller matcher"): per child, the next few
  // things coming up — tests, homework, activities (and optionally other
  // school events), in date/time order. What's included and how many is
  // chosen under Settings → Home. Replaces the tests-only section.
  const nextUpByChild = (() => {
    const children = householdMembers.filter((m) => m.role === "CHILD" && !prefs.hiddenChildren.includes(m.userId));
    if (children.length === 0) return [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const horizon = new Date(today); horizon.setDate(horizon.getDate() + 14);
    const testHorizon = new Date(today); testHorizon.setDate(testHorizon.getDate() + 21);
    const nowHm = `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
    const byChild = new Map<string, NextUpEntry[]>(children.map((c) => [c.userId, []]));
    for (const it of schoolItems) {
      const list = it.assignedUser ? byChild.get(it.assignedUser.id) : undefined;
      if (!list || it.completedAt) continue;
      const kind = it.schoolKind ?? "OTHER";
      if (kind === "TEST" ? !prefs.perChild.tests : kind === "HOMEWORK" ? !prefs.perChild.homework : !prefs.perChild.schoolOther) continue;
      const day = new Date(it.date); day.setHours(0, 0, 0, 0);
      if (day < today || day > (kind === "TEST" ? testHorizon : horizon)) continue;
      list.push({ key: `s-${it.id}`, id: it.id, kind, title: it.subject ? `${it.subject} · ${it.name}` : it.name, day, startTime: it.startTime ?? null, endTime: null, href: "/dashboard/school" });
    }
    if (prefs.perChild.activities) {
      for (const a of activities) {
        const list = a.assignedUser ? byChild.get(a.assignedUser.id) : undefined;
        if (!list) continue;
        for (const occ of getOccurrencesInRange(a as unknown as RecurringItem, today, horizon)) {
          // Today's activity that's already over isn't "next up".
          if (dateKey(occ) === dateKey(today) && (a.endTime ?? a.startTime) && (a.endTime ?? a.startTime)! < nowHm) continue;
          list.push({ key: `a-${a.id}-${dateKey(occ)}`, id: a.id, kind: "ACTIVITY", title: a.name, day: occ, startTime: a.startTime ?? null, endTime: a.endTime ?? null, href: `/dashboard/family/new?type=training&edit=${a.id}` });
        }
      }
    }
    return children.map((c) => {
      const items = (byChild.get(c.userId) ?? []).sort((x, y) => x.day.getTime() - y.day.getTime() || (x.startTime ?? "00:00").localeCompare(y.startTime ?? "00:00"));
      return { id: c.userId, name: c.user.name?.split(" ")[0] ?? c.user.email.split("@")[0], items };
    });
  })();
  // 2026-10-09 (persona review — Jonas: "who goes where at 17?"): today for
  // the whole family in time order — activities, tests/homework due today and
  // reminders. Timed items first; finished ones are dimmed.
  const todayRows = (() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const key = dateKey(today);
    const nowHm = `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
    const first = (u: { name: string | null; email: string } | null | undefined) => (u ? u.name?.split(" ")[0] ?? u.email.split("@")[0] : null);
    const rows: { key: string; startTime: string | null; endTime: string | null; title: string; who: string | null; kind: "ACTIVITY" | "TEST" | "HOMEWORK" | "OTHER" | "REMINDER"; href: string; done: boolean }[] = [];
    for (const a of activities) {
      if (getOccurrencesInRange(a as unknown as RecurringItem, today, today).length === 0) continue;
      const end = a.endTime ?? a.startTime ?? null;
      rows.push({ key: `a-${a.id}`, startTime: a.startTime ?? null, endTime: a.endTime ?? null, title: a.name, who: first(a.assignedUser), kind: "ACTIVITY", href: `/dashboard/family/new?type=training&edit=${a.id}`, done: !!end && end < nowHm });
    }
    for (const it of schoolItems) {
      if (dateKey(new Date(it.date)) !== key) continue;
      rows.push({ key: `s-${it.id}`, startTime: it.startTime ?? null, endTime: null, title: it.subject ? `${it.subject} · ${it.name}` : it.name, who: first(it.assignedUser), kind: it.schoolKind ?? "OTHER", href: "/dashboard/school", done: !!it.completedAt });
    }
    for (const r of reminders) {
      if (dateKey(new Date(r.date)) !== key) continue;
      rows.push({ key: `r-${r.id}`, startTime: r.startTime ?? null, endTime: null, title: r.name, who: null, kind: "REMINDER", href: `/dashboard/${r.id}`, done: false });
    }
    return rows.sort((x, y) => (x.startTime ? 0 : 1) - (y.startTime ? 0 : 1) || (x.startTime ?? "").localeCompare(y.startTime ?? "") || x.title.localeCompare(y.title));
  })();
  // 2026-10-22 (Mikael: "passerat är passerat"): what's already over today
  // leaves the list instead of being dimmed.
  const todayOpen = todayRows.filter((r) => !r.done);
  const show = prefs.sections;

  if (status === "loading" || loading || !roleChecked) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "var(--muted)", fontSize: 15 }}>{t.thinking}</div>
      </div>
    );
  }

  const homeHeader = homeHeaderUrl(media);



  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", paddingBottom: 24, fontFamily: FONT }}>
      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "32px 20px 0" }}>

        {/* 2026-09-28 (test round, row 40): the family's own photo on top.
            2026-10-11: a person's own picture wins over it (Settings → My
            picture on Home); remove it and the family photo comes back. */}
        {homeHeader && (
          <Link href="/profile#home-picture" aria-label={t.familyPhotoAria} style={{ display: "block", margin: "-12px 0 18px", borderRadius: 22, overflow: "hidden", boxShadow: "var(--shadow)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={homeHeader} alt="" style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }} />
          </Link>
        )}

        {/* Header — 2026-09-27 UI review: short greeting + today's date
            instead of a paragraph of explanation (personas skimmed past it). */}
        <div style={{ marginBottom: 22, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
                {new Date().toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" })}
              </span>
              {/* 2026-10-18 (Home 2.0: "Pro status shouldn't dominate"): the
                  chip only shows while a trial is counting down — the plan
                  itself is under Settings → Plan. */}
              {plan && hasHousehold && plan.plan === "TRIAL" && (
                <Link href="/upgrade" style={{
                  fontSize: 11, fontWeight: 800, textDecoration: "none", padding: "3px 9px", borderRadius: 50,
                  background: "var(--tint-premium)", color: "var(--premium)",
                }}>
                  {t.planTrial(plan.trialDaysLeft)}
                </Link>
              )}
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--fg)", margin: 0, letterSpacing: "-0.6px" }}>
              {t.hi(firstName)}
            </h1>
          </div>
        </div>

        {/* 2026-09-28: no family yet → one clear next step instead of a
            dozen buttons that lead to "set up your household first". */}
        {!hasHousehold && (
          <div style={{ background: "var(--hero-grad)", borderRadius: 20, padding: "20px 20px 18px", marginBottom: 22, color: "#fff" }}>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{t.setUpTitle}</div>
            <div style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.5, marginBottom: 14 }}>
              {t.setUpBody}
            </div>
            <button onClick={createHousehold} disabled={creatingHousehold} style={{ background: "#fff", color: "#1C1C28", border: "none", borderRadius: 50, padding: "11px 20px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: FONT }}>
              {creatingHousehold ? t.creating : t.createFamily}
            </button>
          </div>
        )}

        {/* 2026-10-11: just write it — the app works out where it goes. Then
            what the school/club calendars changed (the change watch). */}
        {hasHousehold && <QuickAdd onAdded={() => { fetchReminders(); fetchFamilyData(); }} />}
        {hasHousehold && <ChangesCard />}
        {hasHousehold && <TripSoonCard />}

        {/* 2026-09-28 (rows 40 + 44): the family at a glance — photos, and
            adding someone is one tap from Home instead of buried in Settings. */}
        {hasHousehold && show.family && (
          <div className="rfs-hscroll" style={{ display: "flex", gap: 14, overflowX: "auto", margin: "0 -20px 22px", padding: "2px 20px 4px" }}>
            {householdMembers.map((m) => {
              const first = m.user.name?.split(" ")[0] ?? m.user.email.split("@")[0];
              // 2026-10-22/23 (rows 54–55): a child shows "Mån 08:20 / Matte"
              // centred under the photo — every column the same width so the
              // row lines up. With a timetable a tap opens the week.
              const own = starts.get(m.userId);
              const hasStart = !!nextStart(own);
              const col: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 6, textDecoration: "none", flexShrink: 0, width: PERSON_COL };
              const body = (
                <>
                  <Avatar userId={m.userId} name={first} size={52} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--fg-2)", maxWidth: PERSON_COL, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{first}</span>
                  {hasStart && <FirstLessonMini days={own} />}
                </>
              );
              if (hasStart && lessons.get(m.userId)) {
                return (
                  <button key={m.userId} type="button" onClick={() => setWeekFor({ id: m.userId, name: first })} aria-label={msg.timetable.open(first)} style={{ all: "unset", cursor: "pointer", boxSizing: "border-box", ...col }}>
                    {body}
                  </button>
                );
              }
              return <Link key={m.userId} href="/dashboard/family/members" style={col}>{body}</Link>;
            })}
            <Link href="/dashboard/family/members" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 6, textDecoration: "none", flexShrink: 0, width: PERSON_COL }}>
              <span style={{ width: 52, height: 52, borderRadius: "50%", border: "1.5px dashed var(--accent-border)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 500, boxSizing: "border-box" }}>+</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--accent)" }}>{t.add}</span>
            </Link>
          </div>
        )}

        {/* 2026-10-09: wishlists other families have shared with me. */}
        <GiftSharesCard />

        {/* 2026-10-09: start guide for a new family (persona review). */}
        {hasHousehold && (
          <StartGuide members={householdMembers} userId={session?.user?.id} plan={plan?.plan ?? null} />
        )}

        {/* 2026-10-09: today for the whole family. */}
        {show.today && todayRows.length > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <SectionTitle inline>{msg.homePrefs.todayTitle}</SectionTitle>
              {todayOpen.length === 0 && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--success)" }}>{msg.homePrefs.todayEmptyDone}</span>}
            </div>
            {todayOpen.length === 0 && <div style={{ marginBottom: 18 }} />}
            {todayOpen.length > 0 && <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "4px 14px", boxShadow: "var(--shadow)", marginBottom: 24 }}>
              {todayOpen.map((r, i) => {
                const badge = familyBadge(r.kind) ?? (r.kind === "TEST" ? { bg: "var(--tint-danger)", fg: "var(--danger)", label: msg.homePrefs.kindTest }
                  : r.kind === "HOMEWORK" ? { bg: "var(--tint-school)", fg: "var(--school)", label: msg.homePrefs.kindHomework }
                  : r.kind === "ACTIVITY" ? { bg: "var(--tint-warning)", fg: "#D85A30", label: msg.homePrefs.kindActivity }
                  : r.kind === "REMINDER" ? { bg: "var(--tint-accent)", fg: "var(--accent)", label: msg.homePrefs.kindReminder }
                  : { bg: "var(--surface-3)", fg: "var(--muted)", label: msg.homePrefs.kindSchool });
                const time = formatTimeRange(r);
                return (
                  <Link key={r.key} href={r.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: i === 0 ? "none" : "1px solid var(--border-soft)", textDecoration: "none", opacity: r.done ? 0.45 : 1 }}>
                    <span style={{ width: 74, flexShrink: 0, fontSize: 13, fontWeight: 800, color: time ? "var(--fg)" : "var(--subtle)", fontVariantNumeric: "tabular-nums" }}>{time || msg.common.today}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: r.done && r.kind !== "ACTIVITY" ? "line-through" : "none" }}>{r.title}</span>
                      {r.who && <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{r.who}</span>}
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 50, flexShrink: 0, background: badge.bg, color: badge.fg }}>{badge.label}</span>
                  </Link>
                );
              })}
            </div>}
          </>
        )}

        {/* 2026-10-09: next up per child — tests, homework, activities. */}
        {show.perChild && nextUpByChild.length > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <SectionTitle inline>{msg.homePrefs.nextUpTitle}</SectionTitle>
              <Link href="/profile#home-settings" style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>{msg.homePrefs.customize}</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {nextUpByChild.map((p) => (
                <div key={p.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "12px 14px", boxShadow: "var(--shadow)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: p.items.length || nextStart(starts.get(p.id)) ? 6 : 0 }}>
                    <Avatar userId={p.id} name={p.name} size={28} />
                    <span style={{ fontSize: 14, fontWeight: 800, color: "var(--fg)", flex: 1 }}>{p.name}</span>
                    {p.items.length === 0 && !nextStart(starts.get(p.id)) && <span style={{ fontSize: 12, color: "var(--subtle)" }}>{msg.homePrefs.nothingSoon}</span>}
                  </div>
                  {/* 2026-10-22: always first — when school starts next. */}
                  <FirstLessonRow days={starts.get(p.id)} onOpen={lessons.get(p.id) ? () => setWeekFor({ id: p.id, name: p.name }) : undefined} />
                  {p.items.slice(0, prefs.perChildCount).map((it) => {
                    const d = getDaysUntil(it.day.toISOString());
                    const badge = familyBadge(it.kind) ?? (it.kind === "TEST" ? { bg: "var(--tint-danger)", fg: "var(--danger)", label: msg.homePrefs.kindTest }
                      : it.kind === "HOMEWORK" ? { bg: "var(--tint-school)", fg: "var(--school)", label: msg.homePrefs.kindHomework }
                      : it.kind === "ACTIVITY" ? { bg: "var(--tint-warning)", fg: "#D85A30", label: msg.homePrefs.kindActivity }
                      : { bg: "var(--surface-3)", fg: "var(--muted)", label: msg.homePrefs.kindSchool });
                    const time = formatTimeRange(it);
                    return (
                      <Link key={it.key} href={it.href} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderTop: "1px solid var(--border-soft)", textDecoration: "none" }}>
                        <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 50, flexShrink: 0, background: badge.bg, color: badge.fg }}>{badge.label}</span>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, color: d <= 0 ? "var(--warning)" : "var(--muted)", textAlign: "right" }}>
                          {d === 0 ? msg.common.today : d === 1 ? msg.common.tomorrow : it.day.toLocaleDateString(dateLocale, { weekday: "short", day: "numeric", month: "short" })}{time ? ` ${time}` : ""}
                        </span>
                      </Link>
                    );
                  })}
                  {p.items.length > prefs.perChildCount && (
                    <div style={{ fontSize: 12, color: "var(--subtle)", paddingTop: 4 }}>{msg.homePrefs.moreSoon(p.items.length - prefs.perChildCount)}</div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* 2026-10-11: tomorrow as a checklist — bring, rides, clashes. */}
        {hasHousehold && <TomorrowCard />}

        {/* Quick actions — "What would you like to do?" row, borrowed from the
            reference app: the most common jobs one tap away, horizontally
            scrollable so the row never wraps on a phone. */}
        {show.quick && (<>
        <SectionTitle>{t.whatToDo}</SectionTitle>
        <div className="rfs-hscroll" style={{ display: "flex", gap: 10, overflowX: "auto", margin: "0 -20px 24px", padding: "2px 20px 4px", scrollSnapType: "x proximity", scrollPaddingInline: 20 }}>
          {QUICK_ACTIONS.map((qa) => (
            <Link key={qa.href + qa.label} href={qa.href} style={{
              flex: "0 0 auto", width: 104, minHeight: 96, scrollSnapAlign: "start",
              background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18,
              padding: "14px 10px 12px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
              textDecoration: "none", color: "var(--fg)", boxShadow: "var(--shadow)",
            }}>
              <span style={{ position: "relative", width: 40, height: 40, borderRadius: 12, background: qa.tint, color: qa.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <qa.Icon />
                {qa.pro && plan?.plan === "FREE" && (
                  <span style={{ position: "absolute", top: -6, right: -14, fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 6, background: "var(--accent-bg)", color: "var(--on-accent)" }}>{t.pro}</span>
                )}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>{t.quick[qa.label]}</span>
            </Link>
          ))}
        </div>
        </>)}

        {/* Coming up — horizontal cards for the next 7 days (overdue first).
            Replaces both the old "Needs your attention" list (which repeated
            the same rows as the main list below) and the "IQ Spotlight" card. */}
        {/* 2026-10-04 (Mikael): empty sections aren't shown. */}
        {show.comingUp && attentionItems.length > 0 && (<>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <SectionTitle inline>{t.comingUp}</SectionTitle>
          <Link href="/dashboard/calendar" style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>{t.calendarLink}</Link>
        </div>
        {(
          <div className="rfs-hscroll" style={{ display: "flex", gap: 10, overflowX: "auto", margin: "0 -20px 24px", padding: "2px 20px 4px", scrollSnapType: "x mandatory", scrollPaddingInline: 20 }}>
            {attentionItems.slice(0, 10).map((r) => {
              const days = getDaysUntil(r.date);
              const overdue = days < 0;
              const badge = CATEGORY_BADGE[r.category] ?? CATEGORY_BADGE.OTHER;
              const owner = r.assignedTo ? householdMembers.find(m => m.userId === r.assignedTo) : null;
              const ownerName = owner ? (owner.user.name?.split(" ")[0] ?? owner.user.email.split("@")[0]) : null;
              return (
                <button key={r.id} onClick={() => router.push(`/dashboard/${r.id}`)} style={{
                  flex: "0 0 auto", width: 250, scrollSnapAlign: "start", textAlign: "left", cursor: "pointer",
                  background: "var(--surface)", border: overdue ? "1.5px solid var(--border-danger)" : "1px solid var(--border)",
                  borderRadius: 18, padding: 14, display: "flex", gap: 12, alignItems: "center", fontFamily: FONT, boxShadow: "var(--shadow)",
                }}>
                  <ServiceLogo name={r.name} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: overdue ? "var(--danger)" : days <= 1 ? "var(--warning)" : "var(--accent)", marginTop: 3 }}>
                      {overdue ? msg.reminders.overdueOn(formatDate(r.date, dateLocale)) : relativeDay(msg, locale, r.date)}{r.startTime ? ` · ${r.startTime}` : ""}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6, flexWrap: "nowrap", overflow: "hidden" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 50, fontSize: 10.5, fontWeight: 700, background: badge.bg, color: badge.color, whiteSpace: "nowrap" }}>
                        {msg.reminders.categories[r.category] ?? r.category}
                      </span>
                      {ownerName && <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>👤 {ownerName}</span>}
                      {r.amount != null && r.amount > 0 && <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>{r.amount.toLocaleString(dateLocale)} {r.currency}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        </>)}

        <AdSlot placement="home" style={{ marginBottom: 20 }} />

        {/* Overview tiles — three honest numbers. "Needs attention" used to
            count only overdue items while the list above said "4 items";
            it's now labelled for what it is. */}
        {show.stats && reminders.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 12 }}>
          <StatCard icon={<IcBell />} iconColor="var(--accent)" iconBg="var(--tint-accent)" value={totalActive} label={t.statActive} />
          <StatCard icon={<IcAlert />} iconColor="var(--danger)" iconBg="var(--tint-danger)" value={passedCount} label={t.statOverdue} />
          <button onClick={() => router.push("/dashboard/reminders")}
            style={{ all: "unset", cursor: "pointer", display: "block" }} aria-label={t.reviewCosts}>
            <StatCard icon={<IcCard />} iconColor="var(--success)" iconBg="var(--tint-success)"
              value={yearlyTotal > 0 ? compactAmount(yearlyTotal) : "—"} label={`${t.perYear}${yearlyTotal > 0 ? " · " + preferredCurrency : ""}`} />
          </button>
        </div>
        )}

        {/* Family progress — only when there's something to show. */}
        {show.chores && familyCardRows.length > 0 && (
          <Link href="/dashboard/family" style={{
            display: "block", textDecoration: "none", background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 18, padding: "14px 16px", marginBottom: 12, boxShadow: "var(--shadow)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>{t.choresThisWeek}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: pendingApprovals > 0 ? "var(--warning)" : "var(--muted)" }}>
                {pendingApprovals > 0 ? t.waitingApproval(pendingApprovals) : t.openLink}
              </span>
            </div>
            {familyCardRows.map(row => (
              <div key={row.id} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-2)" }}>{row.name}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{row.label}</span>
                </div>
                <div style={{ height: 6, background: "var(--surface-3)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: row.allDone ? "#2A9D6F" : "var(--accent-bg)", width: row.pct + "%" }} />
                </div>
              </div>
            ))}
          </Link>
        )}

        {/* 2026-10-18 (Home 2.0): the full list moved to the Reminders page
            (/dashboard/reminders, in More). Home keeps — when turned on under
            Settings → Home — just the next few, one tap from all of them. */}
        {show.reminders && reminders.length > 0 && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <SectionTitle inline>{msg.nav.reminders}</SectionTitle>
            <Link href="/dashboard/reminders" style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>{t.seeAllCount(reminders.length)}</Link>
          </div>
          <div style={{ background: "var(--surface)", borderRadius: 20, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "var(--shadow)", marginBottom: 24 }}>
            {filtered.slice(0, HOME_LIST_LIMIT).map((r, i) => (
              <ReminderRow key={r.id} reminder={r} badge={CATEGORY_BADGE[r.category] ?? CATEGORY_BADGE.OTHER}
                isFirst={i === 0} onClick={() => router.push(`/dashboard/${r.id}`)} currentUserId={session?.user?.id} householdMembers={householdMembers} hasHousehold={hasHousehold} />
            ))}
          </div>
        </>)}

      </main>

      {weekFor && (
        <WeekSheet childId={weekFor.id} name={weekFor.name} lessons={lessons.get(weekFor.id) ?? []} onClose={() => setWeekFor(null)} />
      )}
    </div>
  );
}
