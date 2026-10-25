"use client";

import { useSession } from "next-auth/react";
import StartGuide from "@/components/StartGuide";
import GiftSharesCard from "@/components/GiftSharesCard";
import QuickAdd from "@/components/QuickAdd";
import AttentionCard, { type SoonSchool } from "@/components/AttentionCard";
import { shortTitle } from "@/lib/displayTitle";
import TomorrowCard from "@/components/TomorrowCard";
import TripSoonCard from "@/components/TripSoonCard";
import { useLessons, StartLine } from "@/components/Timetable";
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
import { CATEGORY_BADGE, ServiceLogo, ReminderRow, getDaysUntil, formatDate, canTickOff, type Reminder, type HouseholdMember } from "@/components/ReminderParts";
import { relativeDay } from "@/lib/i18n/relative";


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


const HOME_LIST_LIMIT = 5;
const HOME_BIRTHDAY_LIMIT = 2;
const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
// 2026-10-23 (row 55): one width for every person on Home, so names line up.
const PERSON_COL = 66;

function SectionTitle({ children, inline }: { children: React.ReactNode; inline?: boolean }) {
  return <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--fg)", margin: inline ? 0 : "0 0 10px", letterSpacing: "-0.2px" }}>{children}</h2>;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reminders, setReminders]        = useState<Reminder[]>([]);
  const [loading, setLoading]            = useState(true);
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
  const { starts } = useLessons(roleChecked);
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

  // 2026-10-25 (Etapp 0 G6): overdue one-off reminders go to "Needs your
  // attention" (with Done right there) instead of Coming up.
  const overdueOnce = hasHousehold ? reminders.filter((r) => canTickOff(r) && getDaysUntil(r.date) < 0) : [];
  const overdueIds = new Set(overdueOnce.map((r) => r.id));
  async function tickOff(id: string) {
    const r = reminders.find((x) => x.id === id);
    setReminders((p) => p.filter((x) => x.id !== id));
    const res = await fetch(`/api/reminders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done: true }) }).catch(() => null);
    if (!res?.ok && r) setReminders((p) => [...p, r]);
  }
  const attentionItems = [...reminders]
    .filter(r => getDaysUntil(r.date) <= 7 && !overdueIds.has(r.id))
    .sort((a, b) => getDaysUntil(a.date) - getDaysUntil(b.date));

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
  // 2026-10-24 (row 59): tests and hand-ins in the next two days, per child.
  const soonSchool: SoonSchool[] = (() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const limit = new Date(today); limit.setDate(limit.getDate() + 2);
    const childIds = new Set(householdMembers.filter((m) => m.role === "CHILD").map((m) => m.userId));
    return schoolItems
      .filter((it) => !it.completedAt && it.assignedUser && childIds.has(it.assignedUser.id) && (it.schoolKind === "TEST" || it.schoolKind === "HOMEWORK"))
      .map((it) => ({ it, day: (() => { const d = new Date(it.date); d.setHours(0, 0, 0, 0); return d; })() }))
      .filter(({ day }) => day >= today && day <= limit)
      .sort((a, b) => a.day.getTime() - b.day.getTime())
      .slice(0, 4)
      .map(({ it, day }) => ({
        key: `soon-${it.id}`, day, kind: (it.schoolKind ?? "OTHER") as SoonSchool["kind"], href: `/dashboard/family/child?id=${it.assignedUser!.id}`,
        who: it.assignedUser!.name?.split(" ")[0] ?? it.assignedUser!.email.split("@")[0],
        title: it.subject ? `${it.subject} · ${it.name}` : it.name,
      }));
  })();
  // 2026-10-24 (row 69): activities nobody is assigned to.
  const unassignedActivities = activities.filter((a) => !a.assignedUser).length;
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
            <img src={homeHeader} alt="" style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} />
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
        {hasHousehold && <TripSoonCard />}

        {/* 2026-09-28 (rows 40 + 44): the family at a glance.
            2026-10-24 (launch list rows 57 + 61): children only, photo and
            name. A tap opens the child's own Home ("my day") exactly as the
            child sees it — the parent can tick off, add and change there. The
            school start moved into each child's card below (never twice). */}
        {hasHousehold && show.family && (
          <div className="rfs-hscroll" style={{ display: "flex", gap: 14, overflowX: "auto", margin: "0 -20px 22px", padding: "2px 20px 4px" }}>
            {householdMembers.filter((m) => m.role === "CHILD").map((m) => {
              const first = m.user.name?.split(" ")[0] ?? m.user.email.split("@")[0];
              return (
                <Link key={m.userId} href={`/dashboard/family/child?id=${m.userId}`} aria-label={msg.home3.openChild(first)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 6, textDecoration: "none", flexShrink: 0, width: PERSON_COL }}>
                  <Avatar userId={m.userId} name={first} size={52} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--fg-2)", maxWidth: PERSON_COL, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{first}</span>
                </Link>
              );
            })}
            <Link href="/dashboard/family/members" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 6, textDecoration: "none", flexShrink: 0, width: PERSON_COL }}>
              <span style={{ width: 52, height: 52, borderRadius: "50%", border: "1.5px dashed var(--accent-border)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 500, boxSizing: "border-box" }}>+</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--accent)" }}>{t.add}</span>
            </Link>
          </div>
        )}

        {/* 2026-10-24 (row 59): what wants a decision — only when something's there. */}
        {hasHousehold && <AttentionCard soon={soonSchool} unassigned={unassignedActivities}
          overdue={overdueOnce.map((r) => ({ id: r.id, name: r.name, date: r.date }))} onDone={tickOff} />}

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
              {todayOpen.length === 0
                ? <span style={{ fontSize: 12, fontWeight: 700, color: "var(--success)" }}>{msg.homePrefs.todayEmptyDone}</span>
                : <Link href="/dashboard/calendar" style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>{msg.home3.showCalendar}</Link>}
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
                      <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: r.done && r.kind !== "ACTIVITY" ? "line-through" : "none" }}>{shortTitle(r.title)}</span>
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
              {/* 2026-10-24 (row 57, sketch B): one compact card per child —
                  school start, the nearest thing, "Next: …" and "+N". The
                  whole card opens the child's own Home. */}
              {nextUpByChild.map((p) => {
                // A repeating activity counts once (its next time) — otherwise a
                // daily training fills "Next" and "+N" with itself.
                const seenIds = new Set<string>();
                const uniq = p.items.filter((it) => (seenIds.has(it.id) ? false : (seenIds.add(it.id), true)));
                const [first, second] = uniq;
                const extra = Math.max(0, uniq.length - 2);
                const whenText = (it: NextUpEntry) => {
                  const d = getDaysUntil(it.day.toISOString());
                  const time = formatTimeRange(it);
                  return `${d === 0 ? msg.common.today : d === 1 ? msg.common.tomorrow : it.day.toLocaleDateString(dateLocale, { weekday: "short", day: "numeric", month: "short" })}${time ? ` ${time}` : ""}`;
                };
                const badge = first ? (familyBadge(first.kind) ?? (first.kind === "TEST" ? { bg: "var(--tint-danger)", fg: "var(--danger)", label: msg.homePrefs.kindTest }
                  : first.kind === "HOMEWORK" ? { bg: "var(--tint-school)", fg: "var(--school)", label: msg.homePrefs.kindHomework }
                  : first.kind === "ACTIVITY" ? { bg: "var(--tint-warning)", fg: "#D85A30", label: msg.homePrefs.kindActivity }
                  : { bg: "var(--surface-3)", fg: "var(--muted)", label: msg.homePrefs.kindSchool })) : null;
                return (
                  <Link key={p.id} href={`/dashboard/family/child?id=${p.id}`} aria-label={msg.home3.openChild(p.name)}
                    style={{ display: "flex", gap: 12, alignItems: "flex-start", textDecoration: "none", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "12px 14px", boxShadow: "var(--shadow)" }}>
                    <Avatar userId={p.id} name={p.name} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontSize: 14.5, fontWeight: 800, color: "var(--fg)", flex: 1 }}>{p.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", flexShrink: 0 }}>{extra > 0 ? `${msg.home3.more(extra)} ›` : "›"}</span>
                      </div>
                      <StartLine days={starts.get(p.id)} />
                      {first && badge ? (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7, minWidth: 0 }}>
                            <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 50, flexShrink: 0, background: badge.bg, color: badge.fg }}>{badge.label}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shortTitle(first.title)}</span>
                          </div>
                          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <span style={{ fontWeight: 700, color: getDaysUntil(first.day.toISOString()) <= 0 ? "var(--warning)" : "var(--muted)" }}>{whenText(first)}</span>
                            {second && <> · {msg.home3.nextLabel} {shortTitle(second.title)} {whenText(second).toLowerCase()}</>}
                          </div>
                        </>
                      ) : (
                        !nextStart(starts.get(p.id)) && <div style={{ fontSize: 12.5, color: "var(--subtle)", marginTop: 4 }}>{msg.homePrefs.nothingSoon}</div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* 2026-10-11: tomorrow as a checklist — bring, rides, clashes. */}
        {hasHousehold && <TomorrowCard hideClashes />}

        {/* 2026-10-24 (row 60): no big "What would you like to do?" on Home —
            everything is in the bottom bar and under More. */}

        {/* Coming up — 2026-10-24 (row 60): the next three, one tap from all
            of them. Overdue first. Empty → not shown. */}
        {show.comingUp && attentionItems.length > 0 && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <SectionTitle inline>{msg.home3.comingUp}</SectionTitle>
            <Link href="/dashboard/reminders" style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>{msg.home3.showAll}</Link>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "2px 14px", boxShadow: "var(--shadow)", marginBottom: 24 }}>
            {attentionItems.slice(0, 3).map((r, i) => {
              const days = getDaysUntil(r.date);
              const overdue = days < 0;
              const owner = r.assignedTo ? householdMembers.find(m => m.userId === r.assignedTo) : null;
              const ownerName = owner ? (owner.user.name?.split(" ")[0] ?? owner.user.email.split("@")[0]) : null;
              return (
                <Link key={r.id} href={`/dashboard/${r.id}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i === 0 ? "none" : "1px solid var(--border-soft)", textDecoration: "none" }}>
                  <ServiceLogo name={r.name} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                    <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {[msg.reminders.categories[r.category] ?? r.category, ownerName, r.amount != null && r.amount > 0 ? `${r.amount.toLocaleString(dateLocale)} ${r.currency}` : null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 800, flexShrink: 0, textAlign: "right", color: overdue ? "var(--danger)" : days <= 1 ? "var(--warning)" : "var(--muted)" }}>
                    {overdue ? msg.reminders.overdueOn(formatDate(r.date, dateLocale)) : relativeDay(msg, locale, r.date)}{r.startTime ? ` · ${r.startTime}` : ""}
                  </span>
                </Link>
              );
            })}
          </div>
        </>)}

        <AdSlot placement="home" style={{ marginBottom: 20 }} />

        {/* 2026-10-24 (row 60): no number tiles on Home. */}

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

    </div>
  );
}
