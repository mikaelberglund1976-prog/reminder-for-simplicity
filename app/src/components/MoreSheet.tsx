"use client";

// 2026-10-18 (Navigation 2.0, spec §10): "More" — the app's complete catalogue,
// opened from the rightmost tab of the bottom nav.
//
// 2026-10-24 ("Ny Mer-meny – slutversion"): More is an overview, not a menu of
// links. Top to bottom: the title, a search that filters the page, four quick
// actions that open the existing create forms directly, then Planning / Family /
// App as rows with a short live status ("3 today · 7 this week", "8 items left",
// "Tyra in 8 days"). Rules:
// - The order never changes; only the status text does.
// - Status comes from the endpoints the pages already use (lib/moreStatus.ts),
//   loads after the sheet is open and never blocks it. No data = name only.
// - A badge only where a number calls for action (overdue reminders).
// - Analytics: more_opened, more_search_used, more_quick_action_clicked,
//   more_feature_clicked (lib/analytics.ts).
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n/client";
import type { Messages } from "@/lib/i18n/messages";
import { track } from "@/lib/analytics";
import { cachedMoreStatuses, loadMoreStatuses, type MoreStatusKey, type MoreStatuses } from "@/lib/moreStatus";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const I = (d: React.ReactNode, size = 20) => function Icon() { return <svg width={size} height={size} viewBox="0 0 24 24" {...STR} aria-hidden>{d}</svg>; };

const IcCalendar = I(<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>);
const IcBell = I(<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>);
const IcSchool = I(<><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12.5V17c0 1.5 2.5 3 6 3s6-1.5 6-3v-4.5"/></>);
const IcTraining = I(<><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18M3 12h18"/></>);
const IcChecklist = I(<><path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="m4 6 1 1 2-2"/><path d="m4 12 1 1 2-2"/><path d="m4 18 1 1 2-2"/></>);
const IcCart = I(<><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 6H5.6"/></>);
const IcCake = I(<><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3M12 8v3M17 8v3"/></>);
const IcGift = I(<><rect x="3" y="8" width="18" height="4"/><rect x="4" y="12" width="16" height="9"/><path d="M12 8v13M12 8c-1.5-3-5-3-5-1s2 1 5 1zM12 8c1.5-3 5-3 5-1s-2 1-5 1z"/></>);
const IcSuitcase = I(<><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>);
const IcUsers = I(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>);
const IcGear = I(<><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></>);
const IcHelp = I(<><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>);
const IcUser = I(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>);
const IcLogout = I(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>);
const IcPlusCircle = I(<><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></>, 24);
const IcBellBig = I(<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>, 24);
const IcListBig = I(<><path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></>, 24);
const IcCartBig = I(<><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 6H5.6"/></>, 24);
const IcSearch = I(<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>, 18);
const IcChevron = I(<polyline points="9 6 15 12 9 18"/>, 16);

type MoreText = Messages["more"];
type NavKey = keyof Messages["nav"];
type Label = { nav: NavKey } | { more: "help" };

type Row = {
  id: string; href: string; label: Label; Icon: () => React.ReactElement; tint: string; color: string;
  status?: MoreStatusKey;
  /** Extra words the search also matches (both languages). */
  keywords?: string;
};
type Group = { title: NavKey; rows: Row[] };
type Quick = { id: string; href: string; label: keyof MoreText; Icon: () => React.ReactElement; tint: string; color: string };

const R = {
  calendar: { id: "calendar", href: "/dashboard/calendar", label: { nav: "calendar" }, Icon: IcCalendar, tint: "var(--tint-danger)", color: "var(--danger)", status: "calendar", keywords: "kalender calendar schema schedule vecka week" },
  reminders: { id: "reminders", href: "/dashboard/reminders", label: { nav: "reminders" }, Icon: IcBell, tint: "var(--tint-accent)", color: "var(--accent)", status: "reminders", keywords: "påminnelse reminder abonnemang subscription räkning bill" },
  school: { id: "school", href: "/dashboard/school", label: { nav: "school" }, Icon: IcSchool, tint: "var(--tint-school)", color: "var(--school)", status: "school", keywords: "skola school prov test läxa homework schoolsoft studybee veckobrev schema" },
  activities: { id: "activities", href: "/dashboard/training", label: { nav: "activities" }, Icon: IcTraining, tint: "var(--tint-warning)", color: "var(--warning)", status: "activities", keywords: "aktivitet activity träning training match fotboll klubb club" },
  chores: { id: "chores", href: "/dashboard/family", label: { nav: "chores" }, Icon: IcChecklist, tint: "var(--tint-warning)", color: "var(--warning)", status: "chores", keywords: "syssla chore stjärnor stars veckopeng" },
  shopping: { id: "shopping", href: "/dashboard/family/shopping-list", label: { nav: "shoppingList" }, Icon: IcCart, tint: "var(--tint-success)", color: "var(--success)", status: "shopping", keywords: "inköp handla shopping mat food lista list" },
  birthdays: { id: "birthdays", href: "/dashboard/birthdays", label: { nav: "birthdays" }, Icon: IcCake, tint: "var(--tint-pink)", color: "var(--pink)", status: "birthdays", keywords: "födelsedag birthday kalas party" },
  wishlist: { id: "wishlist", href: "/dashboard/wishlist", label: { nav: "wishlist" }, Icon: IcGift, tint: "var(--tint-danger)", color: "var(--danger)", status: "wishlist", keywords: "önskelista wishlist present gift" },
  trips: { id: "trips", href: "/dashboard/trips", label: { nav: "trips" }, Icon: IcSuitcase, tint: "var(--tint-warning)", color: "var(--warning)", status: "trips", keywords: "resa trip semester holiday flyg flight pass packlista packing" },
  members: { id: "family-members", href: "/dashboard/family/members", label: { nav: "familyMembers" }, Icon: IcUsers, tint: "var(--surface-3)", color: "var(--fg-2)", keywords: "familj family barn child bjud invite" },
  settings: { id: "settings", href: "/profile", label: { nav: "settings" }, Icon: IcGear, tint: "var(--surface-3)", color: "var(--fg-2)", keywords: "inställningar settings konto account notiser notifications färger colors tema theme språk language" },
  help: { id: "help", href: "/profile#g-help", label: { more: "help" }, Icon: IcHelp, tint: "var(--tint-school)", color: "var(--school)", keywords: "hjälp help feedback idéer ideas support" },
  aboutMe: { id: "about-me", href: "/dashboard/about-me", label: { nav: "aboutMe" }, Icon: IcUser, tint: "var(--surface-3)", color: "var(--fg-2)", keywords: "om mig about integritet privacy" },
} satisfies Record<string, Row>;

const ADULT: Group[] = [
  { title: "groupPlanning", rows: [R.calendar, R.reminders, R.school, R.activities, R.chores] },
  { title: "groupFamily", rows: [R.shopping, R.birthdays, R.wishlist, R.trips] },
  { title: "groupApp", rows: [R.members, R.settings, R.help] },
];
// A child only gets their own things (2026-09-28, row 38); "About me" since 2026-10-24 (row 62).
const CHILD: Group[] = [
  { title: "groupPlanning", rows: [R.calendar, R.school, R.activities] },
  { title: "groupFamily", rows: [R.shopping, { ...R.wishlist, label: { nav: "myWishlist" } }, R.birthdays, R.trips] },
  { title: "groupApp", rows: [R.aboutMe, R.settings, R.help] },
];

// Each opens the existing create form directly — no dialog in between.
const Q = {
  activity: { id: "new_activity", href: "/dashboard/family/new?type=training", label: "qActivity", Icon: IcPlusCircle, tint: "var(--tint-success)", color: "var(--success)" },
  reminder: { id: "new_reminder", href: "/dashboard/new", label: "qReminder", Icon: IcBellBig, tint: "var(--tint-danger)", color: "var(--danger)" },
  chore: { id: "new_chore", href: "/dashboard/family/new", label: "qChore", Icon: IcListBig, tint: "var(--tint-warning)", color: "var(--warning)" },
  shopping: { id: "new_shopping_item", href: "/dashboard/family/shopping-list?add=1", label: "qShopping", Icon: IcCartBig, tint: "var(--tint-success)", color: "var(--success)" },
} satisfies Record<string, Quick>;
const ADULT_QUICK: Quick[] = [Q.activity, Q.reminder, Q.chore, Q.shopping];
const CHILD_QUICK: Quick[] = [Q.activity, Q.chore, Q.shopping];

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

export default function MoreSheet({ open, onClose, isChild }: { open: boolean; onClose: () => void; isChild: boolean }) {
  const { m, date } = useI18n();
  const t = m.more;
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<MoreStatuses>({});
  const lastTracked = useRef("");

  const labelOf = (l: Label) => ("nav" in l ? m.nav[l.nav] : t[l.more]);

  // Lock the page behind the sheet, Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  // On open: track, reset search, show cached statuses at once, refresh in the background.
  useEffect(() => {
    if (!open) return;
    track("more_opened", { child: isChild });
    setQuery("");
    lastTracked.current = "";
    const cached = cachedMoreStatuses(isChild);
    setStatuses(cached ?? {});
    if (cached) return;
    let alive = true;
    const strip = (s: string) => s.replace(/\.$/, "");
    loadMoreStatuses(isChild, {
      texts: t,
      weekday: (d) => strip(date(d, { weekday: "short" })),
      month: (d) => strip(date(d, { month: "short" })),
      schoolKind: (k) => m.school.kinds[k] ?? k,
    }, (partial) => { if (alive) setStatuses(partial); })
      .then((s) => { if (alive) setStatuses(s); })
      .catch(() => { /* rows keep their names only */ });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isChild]);

  const groups = isChild ? CHILD : ADULT;
  const quick = isChild ? CHILD_QUICK : ADULT_QUICK;
  const q = norm(query);
  const shownGroups = useMemo(() => groups
    .map((g) => ({ ...g, rows: g.rows.filter((r) => !q || norm(`${labelOf(r.label)} ${r.keywords ?? ""}`).includes(q)) }))
    .filter((g) => g.rows.length > 0),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [groups, q, m]);
  const shownQuick = quick.filter((a) => !q || norm(t[a.label] as string).includes(q));
  const results = shownGroups.reduce((n, g) => n + g.rows.length, 0) + shownQuick.length;

  // more_search_used: once the person stops typing (what they look for, and whether anything matched).
  useEffect(() => {
    if (!open || !q || q === lastTracked.current) return;
    const id = setTimeout(() => {
      lastTracked.current = q;
      track("more_search_used", { query: q.slice(0, 40), results });
    }, 900);
    return () => clearTimeout(id);
  }, [open, q, results]);

  if (!open || typeof document === "undefined") return null;

  const sectionTitle: React.CSSProperties = { fontSize: 17, fontWeight: 800, color: "var(--fg)", margin: "0 2px 8px", letterSpacing: "-0.01em" };

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 18, background: "rgba(10,12,20,0.38)", display: "flex", alignItems: "flex-end", justifyContent: "center", fontFamily: FONT }}>
      <div
        role="dialog" aria-modal="true" aria-labelledby="more-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "var(--content-max-width)", height: "92dvh", overflowY: "auto", overflowX: "hidden", overscrollBehavior: "contain",
          background: "var(--background)", borderRadius: "24px 24px 0 0", border: "1px solid var(--border)", borderBottom: "none",
          boxShadow: "0 -12px 40px rgba(0,0,0,0.2)",
          padding: "10px 16px calc(env(safe-area-inset-bottom, 0px) + 104px)", boxSizing: "border-box",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 4, background: "var(--border)", margin: "0 auto 10px" }} aria-hidden />

        {/* 1. Header: only the title, then search. */}
        <h2 id="more-title" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 26, fontWeight: 800, color: "var(--fg)", margin: "4px 2px 12px", letterSpacing: "-0.02em" }}>
          <span aria-hidden style={{ display: "inline-flex", gap: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--fg-2)" }} />
            <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--fg-2)" }} />
            <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--accent)" }} />
          </span>
          {t.title}
        </h2>
        <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 46, padding: "0 14px", borderRadius: 14, background: "var(--surface-3)", color: "var(--subtle)", marginBottom: 18 }}>
          <IcSearch />
          <input
            type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search} aria-label={t.searchLabel} enterKeyHint="search" autoComplete="off"
            style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", color: "var(--fg)", fontSize: 16, fontFamily: FONT, padding: "12px 0" }}
          />
        </label>

        {/* 2. Quick actions. */}
        {shownQuick.length > 0 && (
          <section style={{ marginBottom: 20 }}>
            <h3 style={sectionTitle}>{t.quick}</h3>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(shownQuick.length, 3)}, minmax(0, 1fr))`, gap: 8 }}>
              {shownQuick.map((a) => (
                <Link key={a.id} href={a.href}
                  onClick={() => { track("more_quick_action_clicked", { action: a.id, fromSearch: !!q }); onClose(); }}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
                    minHeight: 84, padding: "12px 4px", borderRadius: 16, background: a.tint, color: a.color, textDecoration: "none",
                  }}>
                  <a.Icon />
                  <span lang={m.nav.home === "Hem" ? "sv" : "en"} style={{ fontSize: 12, fontWeight: 700, color: "var(--fg)", textAlign: "center", lineHeight: 1.2, hyphens: "auto", overflowWrap: "anywhere", maxWidth: "100%" }}>{t[a.label] as string}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 3–5. Planning / Family / App. Stable order; only the status text moves. */}
        {shownGroups.map((g) => (
          <section key={g.title} style={{ marginBottom: 20 }}>
            <h3 style={sectionTitle}>{m.nav[g.title]}</h3>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
              {g.rows.map((r, i) => {
                const st = r.status ? statuses[r.status] : undefined;
                const label = labelOf(r.label);
                return (
                  <Link key={r.id} href={r.href}
                    onClick={() => { track("more_feature_clicked", { feature: r.id, hadStatus: !!st?.text, fromSearch: !!q }); onClose(); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, minHeight: 58, padding: "8px 12px",
                      borderTop: i === 0 ? "none" : "1px solid var(--border)", textDecoration: "none", color: "var(--fg)",
                    }}>
                    <span style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 10, background: r.tint, color: r.color, display: "flex", alignItems: "center", justifyContent: "center" }}><r.Icon /></span>
                    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25 }}>{label}</span>
                      {st?.text && (
                        <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{st.text}</span>
                      )}
                    </span>
                    {st?.badge ? (
                      <span aria-label={st.badgeLabel} title={st.badgeLabel} style={{ minWidth: 24, height: 24, padding: "0 7px", boxSizing: "border-box", borderRadius: 12, background: "var(--tint-danger)", color: "var(--danger)", fontSize: 12.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{st.badge}</span>
                    ) : null}
                    <span style={{ color: "var(--subtle)", display: "flex", flexShrink: 0 }}><IcChevron /></span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        {q && results === 0 && (
          <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 14, margin: "24px 0" }}>{t.noMatch(query.trim())}</p>
        )}

        {!q && (
          <button
            type="button"
            onClick={() => { onClose(); signOut({ callbackUrl: "/login" }); }}
            style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, padding: "10px 6px", border: "none", background: "none", color: "var(--danger)", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}
          >
            <IcLogout /> {m.common.signOut}
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
