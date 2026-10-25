"use client";

// The child's start page ("My week").
// 2026-10-01 (phone test, Mikael: "startsidan har chores som en blaffa i
// mitten", "man vill komma in och ha en bra översikt"): rebuilt as an
// overview. Top: greeting with the child's own photo (tap to change it) and
// the family photo — the same picture everyone sees. Then three tiles that
// say what needs doing, then the sections in that order: homework & tests,
// today's activities, chores (compact, no big hero card), and things the
// family has shared with them. A child only ever sees their own items plus
// what's shared with them — enforced by the APIs, not just here.
// A parent can open the same page for one child (?id=…) from Chores.
import { useSession } from "next-auth/react";
import { track } from "@/lib/analytics";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import HamburgerMenu from "@/components/HamburgerMenu";
import Link from "next/link";
import AvatarPicker from "@/components/AvatarPicker";
import Avatar from "@/components/Avatar";
import { headerUrl, homeHeaderUrl, useFamilyMedia } from "@/lib/familyMedia";
import { withNextDate, getOccurrencesInRange, dateKey, type RecurringItem } from "@/lib/recurrence";
import { shortTitle } from "@/lib/displayTitle";
import { formatTimeRange } from "@/lib/timeFormat";
import { useI18n } from "@/lib/i18n/client";
import type { Messages } from "@/lib/i18n/messages";
import StarSummary from "@/components/StarSummary";
import QuickAdd from "@/components/QuickAdd";
import ChangesCard from "@/components/ChangesCard";
import TomorrowCard from "@/components/TomorrowCard";
import TripSoonCard from "@/components/TripSoonCard";
import { useLessons, FirstLessonRow, WeekSheet } from "@/components/Timetable";
import { nextStart } from "@/lib/lessonPlan";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcBack()  { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6"/></svg>; }
function IcCheck() { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR} strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>; }

type Chore = {
  id: string;
  assignedTo?: string | null;
  name: string;
  note: string | null;
  requiresApproval: boolean;
  completions: { id: string; status: string }[];
};
type Activity = { id: string; name: string; note: string | null; recurrence: string; choreRecurrenceDays: string | null; assignedTo?: string | null; date: string; startTime?: string | null; endTime?: string | null; skipDates?: string[] | null };
type SchoolLite = { id: string; name: string; date: string; subject: string | null; schoolKind: string | null; completedAt: string | null; assignedUser: { id: string } | null; startTime?: string | null };
// 2026-10-24 (row 62): one row in "Today" / "Coming up" on the child's Home.
type DayRow = { key: string; day: Date; startTime: string | null; endTime: string | null; title: string; kind: "TEST" | "HOMEWORK" | "OTHER" | "ACTIVITY" | "REMINDER"; href: string };
type SharedReminder = { id: string; name: string; date: string; category: string; userId: string; assignedTo?: string | null; user?: { id: string; name: string | null } };

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function daysUntil(dateStr: string) { return Math.round((startOfDay(new Date(dateStr)).getTime() - startOfDay(new Date()).getTime()) / 86400000); }
function whenText(dateStr: string, m: Messages, dateLocale: string) {
  const d = daysUntil(dateStr);
  if (d < 0) return m.reminders.overdue;
  if (d === 0) return m.common.today;
  if (d === 1) return m.common.tomorrow;
  if (d <= 6) return new Date(dateStr).toLocaleDateString(dateLocale, { weekday: "long" });
  return new Date(dateStr).toLocaleDateString(dateLocale, { day: "numeric", month: "short" });
}

const SECTION_LABEL: React.CSSProperties = { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 };

function ChildViewContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const media = useFamilyMedia();
  const { m: msg, locale, dateLocale, err } = useI18n();
  const t = msg.childHome;
  const [starsKey, setStarsKey] = useState(0);
  const [cheer, setCheer] = useState(false);
  const myId = session?.user?.id;
  const childId = searchParams.get("id") ?? myId;
  const isOwn = !!myId && childId === myId;
  // 2026-10-22: the child's timetable (first lesson + the week).
  const { lessons, starts } = useLessons(!!myId);
  const lessonOwner = childId ?? null;
  const [weekOpen, setWeekOpen] = useState(false);

  const [chores, setChores] = useState<Chore[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [school, setSchool] = useState<SchoolLite[]>([]);
  const [shared, setShared] = useState<SharedReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [childName, setChildName] = useState<string | null>(null);
  const [access, setAccess] = useState<string>("TRIAL");
  const [showDone, setShowDone] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNote, setNewNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // 2026-10-25 (G7, "child activation"): the child's day was opened — by the
  // child (own) or by a parent looking at it.
  useEffect(() => {
    if (status === "authenticated" && childId) track("child_day_opened", { own: isOwn });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, childId]);

  useEffect(() => {
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, childId]);

  async function fetchChores() {
    const res = await fetch("/api/family/chores");
    if (!res.ok) return;
    const data = await res.json();
    setAccess(data.access ?? "TRIAL");
    const all: Chore[] = data.chores ?? [];
    setChores(childId ? all.filter((c) => c.assignedTo === childId) : all);
  }

  async function load() {
    setLoading(true);
    try {
      const [, aRes, sRes, rRes, tRes] = await Promise.all([
        fetchChores(),
        fetch("/api/family/chores?category=TRAINING"),
        fetch("/api/family/chores?category=SCHOOL"),
        isOwn ? fetch("/api/reminders") : Promise.resolve(null),
        fetch("/api/family/trial"),
      ]);
      if (aRes.ok) {
        const list = ((await aRes.json()).chores ?? []) as Activity[];
        setActivities(childId ? list.filter((a) => a.assignedTo === childId) : list);
      }
      if (sRes.ok) {
        const list = ((await sRes.json()).chores ?? []) as SchoolLite[];
        setSchool(childId ? list.filter((s) => s.assignedUser?.id === childId) : list);
      }
      if (rRes && rRes.ok) {
        const list = await rRes.json();
        setShared(Array.isArray(list) ? list.map(withNextDate) : []);
      }
      if (tRes.ok) {
        const t = await tRes.json();
        const found = (t.childMembers ?? []).find((m: { id: string; name: string }) => m.id === childId);
        if (found) setChildName(found.name);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleAddChore(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true); setAddError(null);
    try {
      const res = await fetch("/api/family/chores", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), note: newNote.trim() || undefined, recurrence: "WEEKLY", ...(isOwn ? {} : { assignedTo: childId }) }),
      });
      if (res.ok) {
        setNewName(""); setNewNote(""); setShowAdd(false);
        await fetchChores();
      } else {
        const data = await res.json().catch(() => ({}));
        setAddError(data?.error ? err(data.error) : t.couldNotAdd);
      }
    } catch { setAddError(msg.common.somethingWentWrong); }
    finally { setAdding(false); }
  }

  async function toggleChore(choreId: string) {
    setToggling(choreId);
    try {
      const res = await fetch(`/api/family/chores/${choreId}/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      if (res.ok) {
        const d = await res.json().catch(() => ({}));
        if (d.done && d.status !== "PENDING_APPROVAL") { setCheer(true); setTimeout(() => setCheer(false), 1800); }
        await fetchChores();
        setStarsKey((k) => k + 1);
      }
    } catch (e) { console.error(e); }
    finally { setToggling(null); }
  }

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "var(--muted)", fontSize: 15 }}>{t.loading}</div>
      </div>
    );
  }

  const firstName = (isOwn ? session?.user?.name : childName)?.split(" ")[0] ?? null;

  const done    = chores.filter((c) => c.completions.some((cp) => cp.status === "APPROVED" || cp.status === "DONE"));
  const pending = chores.filter((c) => c.completions.some((cp) => cp.status === "PENDING_APPROVAL"));
  const todo    = chores.filter((c) => c.completions.length === 0);
  const pct = chores.length > 0 ? Math.round((done.length / chores.length) * 100) : 0;

  // 2026-10-24 (launch list row 62): "my day" — today and what's coming,
  // the same rows for the child and for a parent looking at the child's day.
  const h = msg.home3;
  const today0 = startOfDay(new Date());
  const horizon = new Date(today0); horizon.setDate(horizon.getDate() + 14);
  const nowHm = `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
  const rows: DayRow[] = [];
  for (const a of activities) {
    for (const occ of getOccurrencesInRange(a as unknown as RecurringItem, today0, horizon)) {
      rows.push({ key: `a-${a.id}-${dateKey(occ)}`, day: occ, startTime: a.startTime ?? null, endTime: a.endTime ?? null, title: a.name, kind: "ACTIVITY", href: `/dashboard/family/new?type=training&edit=${a.id}` });
    }
  }
  const schoolOpen = school
    .filter((s) => !s.completedAt && daysUntil(s.date) <= 14 && daysUntil(s.date) >= 0)
    .sort((a, b) => daysUntil(a.date) - daysUntil(b.date));
  for (const it of schoolOpen) {
    const kind = it.schoolKind === "TEST" || it.schoolKind === "HOMEWORK" ? it.schoolKind : "OTHER";
    rows.push({ key: `s-${it.id}`, day: startOfDay(new Date(it.date)), startTime: it.startTime ?? null, endTime: null, title: it.subject ? `${it.subject} · ${it.name}` : it.name, kind, href: "/dashboard/school" });
  }
  // What the family has shared with me (or I made myself).
  for (const r of shared) {
    const d = daysUntil(r.date);
    if (d < 0 || d > 14) continue;
    rows.push({ key: `r-${r.id}`, day: startOfDay(new Date(r.date)), startTime: null, endTime: null, title: r.name, kind: "REMINDER", href: `/dashboard/${r.id}` });
  }
  const byTime = (x: DayRow, y: DayRow) => x.day.getTime() - y.day.getTime() || (x.startTime ? 0 : 1) - (y.startTime ? 0 : 1) || (x.startTime ?? "").localeCompare(y.startTime ?? "");
  const todayKey = dateKey(today0);
  // "Passerat är passerat": what's already over today leaves the list.
  const todayRows = rows.filter((r) => dateKey(r.day) === todayKey && !(r.kind === "ACTIVITY" && (r.endTime ?? r.startTime) && (r.endTime ?? r.startTime)! < nowHm)).sort(byTime);
  // 2026-10-25 (masterbrief §13): Today → Needs doing → Next. Tests and
  // homework due within two days are "needs doing"; they're left out of
  // Coming up so nothing shows twice.
  const needSchool = schoolOpen.filter((s) => daysUntil(s.date) <= 2);
  const needKeys = new Set(needSchool.map((s) => `s-${s.id}`));
  const needRows = rows.filter((r) => needKeys.has(r.key) && dateKey(r.day) !== todayKey).sort(byTime);
  const upcoming = rows.filter((r) => r.day > today0 && !needKeys.has(r.key)).sort(byTime);
  const activitiesToday = todayRows.filter((r) => r.kind === "ACTIVITY");
  const nextSchool = schoolOpen[0];

  const kindBadge = (k: DayRow["kind"]) => k === "TEST" ? { bg: "var(--tint-danger)", fg: "var(--danger)", label: msg.homePrefs.kindTest }
    : k === "HOMEWORK" ? { bg: "var(--tint-school)", fg: "var(--school)", label: msg.homePrefs.kindHomework }
    : k === "ACTIVITY" ? { bg: "var(--tint-warning)", fg: "#D85A30", label: msg.homePrefs.kindActivity }
    : k === "REMINDER" ? { bg: "var(--tint-accent)", fg: "var(--accent)", label: msg.homePrefs.kindReminder }
    : { bg: "var(--surface-3)", fg: "var(--muted)", label: msg.homePrefs.kindSchool };

  const tiles: { id: string; emoji: string; value: string; label: string; sub: string; tint: string; color: string; href?: string; target?: string }[] = [
    {
      id: "school", emoji: "📚", value: String(schoolOpen.length), label: h.testsHomework,
      sub: nextSchool ? `${nextSchool.schoolKind === "TEST" ? t.test : t.next} ${whenText(nextSchool.date, msg, dateLocale).toLowerCase()}` : h.allClear,
      tint: "var(--tint-school)", color: "var(--school)", href: "/dashboard/school",
    },
    {
      id: "activities", emoji: "🎯", value: String(activitiesToday.length), label: h.activities,
      sub: activitiesToday[0] ? shortTitle(activitiesToday[0].title) : h.noneToday,
      tint: "var(--tint-warning)", color: "#D85A30", target: todayRows.length ? "sec-today" : "sec-coming",
    },
    {
      id: "chores", emoji: "✅", value: access === "LOCKED" ? "–" : String(todo.length), label: h.chores,
      sub: chores.length ? (todo.length ? h.choresLeft(todo.length) : h.choresDone) : h.nothing,
      tint: "var(--tint-success)", color: "var(--success)", target: "sec-chores",
    },
  ];

  const rowList = (list: DayRow[], withDay: boolean) => (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "2px 14px", boxShadow: "var(--shadow)" }}>
      {list.map((r, i) => {
        const b = kindBadge(r.kind);
        const time = formatTimeRange(r);
        const d = daysUntil(r.day.toISOString());
        const dayText = d === 1 ? msg.common.tomorrow : r.day.toLocaleDateString(dateLocale, { weekday: "short", day: "numeric", month: "short" });
        return (
          <Link key={r.key} href={r.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: i === 0 ? "none" : "1px solid var(--border-soft)", textDecoration: "none" }}>
            <span style={{ width: withDay ? 92 : 74, flexShrink: 0, fontSize: 13, fontWeight: 800, color: time || withDay ? "var(--fg)" : "var(--subtle)", fontVariantNumeric: "tabular-nums", lineHeight: 1.25 }}>
              {withDay ? <>{dayText}{time && <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{time}</span>}</> : (time || msg.common.today)}
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shortTitle(r.title)}</span>
            <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 50, flexShrink: 0, background: b.bg, color: b.fg }}>{b.label}</span>
          </Link>
        );
      })}
    </div>
  );
  const sectionHead = (title: string, link?: { href: string; text: string }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--fg)", margin: 0, letterSpacing: "-0.2px" }}>{title}</h2>
      {link && <Link href={link.href} style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>{link.text}</Link>}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 20px", minHeight: 64, display: "flex", alignItems: "center", gap: 12 }}>
          {isOwn ? (
            myId && <AvatarPicker userId={myId} name={session?.user?.name} size={42} />
          ) : (
            <>
              <button onClick={() => router.back()} aria-label={msg.common.back} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-2)", display: "flex", padding: 4 }}>
                <IcBack />
              </button>
              {childId && <Avatar userId={childId} name={childName} size={36} />}
            </>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
              {new Date().toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" })}
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--fg)", margin: 0, letterSpacing: "-0.3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {isOwn ? t.hi(firstName) : msg.home3.childsDay(firstName ?? "")}
            </h1>
          </div>
          <HamburgerMenu />
        </div>
      </div>

      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "16px 20px 0" }}>
        {/* 2026-10-24 (row 61): a parent opened this child's day from Home. */}
        {!isOwn && firstName && (
          <div role="note" style={{ background: "var(--tint-accent)", color: "var(--accent-strong)", borderRadius: 14, padding: "10px 14px", fontSize: 13, fontWeight: 700, lineHeight: 1.4, marginBottom: 14 }}>
            {h.viewing(firstName)}
          </div>
        )}

        {/* The family photo — lower than before (row 64). On a child's own
            Home their own picture wins (Settings → My picture on Home). */}
        {(() => {
          const src = isOwn ? homeHeaderUrl(media) : media.header ? headerUrl(media.header) : null;
          if (!src) return null;
          const img = (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} />
          );
          return isOwn ? (
            <Link href="/profile#home-picture" style={{ display: "block", borderRadius: 20, overflow: "hidden", boxShadow: "var(--shadow)", marginBottom: 16 }}>{img}</Link>
          ) : (
            <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "var(--shadow)", marginBottom: 16 }}>{img}</div>
          );
        })()}

        {/* Next lesson first — tap for the week's timetable. */}
        {lessonOwner && nextStart(starts.get(lessonOwner)) && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "6px 14px 4px", boxShadow: "var(--shadow)", marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>{h.nextLesson}</div>
            <FirstLessonRow days={starts.get(lessonOwner)} onOpen={lessons.get(lessonOwner) ? () => setWeekOpen(true) : undefined} borderTop={false} />
          </div>
        )}
        {weekOpen && lessonOwner && (
          <WeekSheet childId={lessonOwner} name={(isOwn ? firstName : childName) ?? ""} lessons={lessons.get(lessonOwner) ?? []} onClose={() => setWeekOpen(false)} />
        )}

        {/* 2026-10-11: write it → it lands in the right place (own Home only). */}
        {isOwn && <QuickAdd onAdded={() => { load(); }} />}
        {isOwn && <ChangesCard />}
        {isOwn && <TripSoonCard />}

        {/* Three status tiles — the same counts as the lists below. */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 22 }}>
          {tiles.map((tile) => {
            const body = (
              <>
                <span style={{ display: "inline-flex", width: 30, height: 30, borderRadius: 9, background: tile.tint, alignItems: "center", justifyContent: "center", fontSize: 15, marginBottom: 8 }}>{tile.emoji}</span>
                <div style={{ fontSize: 22, fontWeight: 800, color: tile.color, lineHeight: 1 }}>{tile.value}</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--fg)", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tile.label}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tile.sub}</div>
              </>
            );
            const style: React.CSSProperties = { display: "block", textAlign: "left", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "12px 11px", cursor: "pointer", fontFamily: FONT, boxShadow: "var(--shadow)", minWidth: 0, textDecoration: "none" };
            return tile.href
              ? <Link key={tile.id} href={tile.href} style={style}>{body}</Link>
              : <button key={tile.id} type="button" onClick={() => document.getElementById(tile.target!)?.scrollIntoView({ behavior: "smooth", block: "start" })} style={style}>{body}</button>;
          })}
        </div>

        {/* Today — in time order. Empty → not shown. */}
        {todayRows.length > 0 && (
          <div id="sec-today" style={{ scrollMarginTop: 80, marginBottom: 22 }}>
            {sectionHead(h.today)}
            {rowList(todayRows, false)}
          </div>
        )}

        {/* 2026-10-25 (§13): Needs doing — tests/homework in the next two days + chores left. */}
        {(needRows.length > 0 || (access !== "LOCKED" && todo.length > 0)) && (
          <div id="sec-need" style={{ scrollMarginTop: 80, marginBottom: 22 }}>
            {sectionHead(h.needsDoing)}
            {needRows.length > 0 && rowList(needRows, true)}
            {access !== "LOCKED" && todo.length > 0 && (
              <button type="button" onClick={() => document.getElementById("sec-chores")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", marginTop: needRows.length ? 8 : 0, minHeight: 44, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "10px 14px", cursor: "pointer", fontFamily: FONT, textAlign: "left" }}>
                <span aria-hidden>✅</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>{h.choresLeft(todo.length)}</span>
                <span style={{ color: "var(--accent)", fontWeight: 800 }}>›</span>
              </button>
            )}
          </div>
        )}

        {/* Tomorrow: bring, rides, school start (own Home only). */}
        {isOwn && <TomorrowCard />}

        {/* Coming up — the next three, one tap from the calendar. */}
        {upcoming.length > 0 && (
          <div id="sec-coming" style={{ scrollMarginTop: 80, marginBottom: 22 }}>
            {sectionHead(h.comingUp, { href: "/dashboard/calendar", text: h.showAll })}
            {rowList(upcoming.slice(0, 3), true)}
          </div>
        )}

        {/* Chores — no chores = one compact row. */}
        <div id="sec-chores" style={{ scrollMarginTop: 80, marginBottom: 20 }}>
          {access === "LOCKED" ? (
            chores.length > 0 && (
              <div style={{ background: "var(--tint-warning)", borderRadius: 14, padding: 14, fontSize: 13, color: "var(--warning)", fontWeight: 600 }}>
                {t.choresArePro}
              </div>
            )
          ) : chores.length === 0 && !showAdd ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "10px 14px" }}>
              <span aria-hidden>✅</span>
              <span style={{ flex: 1, fontSize: 13.5, color: "var(--muted)", fontWeight: 600 }}>{h.noChoresRow}</span>
              <button onClick={() => { setShowAdd(true); setAddError(null); }} style={{ background: "none", border: "none", color: "var(--accent-strong)", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: FONT, padding: 0 }}>{t.addChore}</button>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                <div style={{ ...SECTION_LABEL, color: "var(--success)" }}>{t.choresThisWeek}</div>
                {chores.length > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? "var(--success)" : "var(--muted)" }}>{pct === 100 ? t.allDone : t.doneOf(done.length, chores.length)}</div>}
              </div>
              {chores.length > 0 && <StarSummary userId={childId} refreshKey={starsKey} />}
              {cheer && (
                <div role="status" style={{ textAlign: "center", fontSize: 15, fontWeight: 800, color: "var(--warning)", marginBottom: 8 }}>{msg.chores.stars.plusOne}</div>
              )}
              {chores.length > 0 && (
                <div style={{ height: 6, background: "var(--surface-3)", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "var(--success)" : "var(--accent-bg)", borderRadius: 3, transition: "width 0.4s" }} />
                </div>
              )}

              {(todo.length > 0 || pending.length > 0 || (showDone && done.length > 0)) && (
                <div style={{ background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", overflow: "hidden", marginBottom: 8 }}>
                  {[...todo.map((c) => ({ c, s: "todo" as const })), ...pending.map((c) => ({ c, s: "pending" as const })), ...(showDone ? done.map((c) => ({ c, s: "done" as const })) : [])]
                    .map(({ c, s }, i) => (
                      <ChoreRow key={c.id} m={msg} chore={c} state={s} isFirst={i === 0} loading={toggling === c.id} onToggle={() => toggleChore(c.id)} />
                    ))}
                </div>
              )}
              {chores.length > 0 && todo.length === 0 && pending.length === 0 && !showDone && (
                <div style={{ fontSize: 13, color: "var(--success)", fontWeight: 600, padding: "0 2px 8px" }}>{t.everythingDone}</div>
              )}

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {!showAdd && (
                  <button onClick={() => { setShowAdd(true); setAddError(null); }} style={{
                    flex: 1, padding: "11px 14px", borderRadius: 12, background: "var(--surface)", border: "1.5px dashed var(--border)",
                    color: "var(--accent-strong)", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
                  }}>{t.addChore}</button>
                )}
                {done.length > 0 && !showAdd && (
                  <button onClick={() => setShowDone((v) => !v)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT, padding: "8px 4px", flexShrink: 0 }}>
                    {showDone ? t.hideDone : t.showDone(done.length)}
                  </button>
                )}
              </div>
            </>
          )}

          {showAdd && (
            <form onSubmit={handleAddChore} style={{ background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", padding: 14, marginTop: 8 }}>
              <input type="text" placeholder={t.whatWillYouDo} value={newName} onChange={(e) => setNewName(e.target.value)} disabled={adding} autoFocus style={inp} />
              <input type="text" placeholder={t.noteOptional} value={newNote} onChange={(e) => setNewNote(e.target.value)} disabled={adding} style={inp} />
              {addError && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{addError}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => { setShowAdd(false); setNewName(""); setNewNote(""); setAddError(null); }} disabled={adding}
                  style={{ flex: 1, padding: "11px 14px", borderRadius: 12, background: "var(--background)", border: "1.5px solid var(--border)", color: "var(--fg-2)", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                  {msg.common.cancel}
                </button>
                <button type="submit" disabled={adding || !newName.trim()}
                  style={{ flex: 1, padding: "11px 14px", borderRadius: 12, background: "var(--ink)", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT, opacity: adding || !newName.trim() ? 0.5 : 1 }}>
                  {adding ? msg.common.adding : t.addChoreBtn}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 12, background: "var(--background)", border: "1.5px solid var(--border)",
  fontSize: 14, color: "var(--fg)", outline: "none", fontFamily: FONT, boxSizing: "border-box", marginBottom: 10,
};

function ChoreRow({ m, chore, state, isFirst, loading, onToggle }: {
  m: Messages; chore: Chore; state: "todo" | "pending" | "done"; isFirst: boolean; loading: boolean; onToggle: () => void;
}) {
  const isDone = state === "done";
  const isPending = state === "pending";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: isFirst ? "none" : "1px solid var(--border-soft)" }}>
      <button onClick={onToggle} disabled={loading} aria-label={isDone ? m.childHome.markNotDone : m.childHome.markDone}
        style={{
          width: 32, height: 32, borderRadius: "50%", border: "none", cursor: loading ? "wait" : "pointer", flexShrink: 0,
          background: isDone ? "var(--tint-success)" : isPending ? "var(--tint-warning)" : "var(--surface-3)",
          color: isDone ? "var(--success)" : isPending ? "var(--warning)" : "var(--faint)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
        {isDone || isPending ? <IcCheck /> : <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><circle cx="12" cy="12" r="9"/></svg>}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, color: isDone ? "var(--subtle)" : "var(--fg)", textDecoration: isDone ? "line-through" : "none" }}>{chore.name}</div>
        {chore.note && !isDone && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{chore.note}</div>}
        {isPending && <div style={{ fontSize: 11, color: "var(--warning)", fontWeight: 600, marginTop: 2 }}>{m.childHome.waitingParent}</div>}
      </div>
    </div>
  );
}

export default function ChildPage() {
  const { m } = useI18n();
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "var(--muted)" }}>{m.common.loading}</div>
      </div>
    }>
      <ChildViewContent />
    </Suspense>
  );
}
