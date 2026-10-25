"use client";

// 2026-10-24 (launch list row 59): "Needs your attention" on the adult Home.
// One place for what wants a decision: what the school/club calendars
// changed (the change watch — replaces ChangesCard on the adult Home),
// clashes and activities without a ride tomorrow, tests and hand-ins in the
// next two days, and activities nobody is assigned to (row 69). Shown only
// when something is there — never as an empty state.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { shortTitle } from "@/lib/displayTitle";
import { track } from "@/lib/analytics";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
type Alert = { id: string; childId: string; kind: "MOVED" | "TIME" | "CANCELLED" | "NEW_TEST" | "NEW" | "MANY"; title: string; oldYmd: string | null; newYmd: string | null; oldTime: string | null; newTime: string | null; count: number | null };
type Changes = { alerts: Alert[]; names: Record<string, string>; me: string };
type TItem = { reminderId: string; title: string; who: string | null; needsRide: boolean; driverId: string | null; href: string };
type Plan = { isAdult: boolean; items: TItem[]; clashes: string[] };
// 2026-10-25 (Etapp 0 G8): links that stopped syncing — see /api/family/feed-health.
type FeedIssue = { id: string; kind: "school" | "activity"; who: string; source: string; lastSyncAt: string | null; failed: boolean };
const ICON: Record<Alert["kind"], string> = { MOVED: "📅", TIME: "⏰", CANCELLED: "🚫", NEW_TEST: "📝", NEW: "✨", MANY: "🔄" };

export type SoonSchool = { key: string; who: string; title: string; day: Date; kind: "TEST" | "HOMEWORK" | "OTHER"; href: string };

export default function AttentionCard({ soon, unassigned }: { soon: SoonSchool[]; unassigned: number }) {
  const { m, dateLocale } = useI18n();
  const t = m.home3;
  const a = m.assist;
  const [changes, setChanges] = useState<Changes | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [feedIssues, setFeedIssues] = useState<FeedIssue[]>([]);

  useEffect(() => {
    fetch("/api/changes").then((r) => (r.ok ? r.json() : null)).then(setChanges).catch(() => {});
    fetch("/api/family/tomorrow").then((r) => (r.ok ? r.json() : null)).then(setPlan).catch(() => {});
    fetch("/api/family/feed-health").then((r) => (r.ok ? r.json() : null)).then((d) => setFeedIssues(d?.issues ?? [])).catch(() => {});
  }, []);

  const alerts = changes?.alerts ?? [];
  const clashes = plan?.clashes ?? [];
  const noRide = plan?.isAdult ? plan.items.filter((i) => i.needsRide && !i.driverId) : [];
  if (alerts.length === 0 && clashes.length === 0 && noRide.length === 0 && soon.length === 0 && unassigned === 0 && feedIssues.length === 0) return null;

  const day = (ymd: string | null) => ymd ? new Date(ymd + "T12:00:00Z").toLocaleDateString(dateLocale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) : "";
  const changeLine = (x: Alert) => {
    switch (x.kind) {
      case "TIME": return a.chTime(x.title, x.newTime ?? "", x.oldTime, day(x.newYmd));
      case "MOVED": return a.chMoved(x.title, day(x.newYmd), x.newTime);
      case "CANCELLED": return a.chCancelled(x.title, day(x.oldYmd));
      case "NEW_TEST": return a.chNewTest(x.title, day(x.newYmd));
      case "NEW": return a.chNew(x.title, day(x.newYmd), x.newTime);
      case "MANY": return a.chMany(x.title, x.count ?? 0);
    }
  };
  const when = (d: Date) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    return diff <= 0 ? m.common.today.toLowerCase() : diff === 1 ? m.common.tomorrow.toLowerCase() : d.toLocaleDateString(dateLocale, { weekday: "long" });
  };
  const feedLine = (f: FeedIssue) => {
    if (f.failed) return t.attFeedFailed(f.source, f.who);
    if (!f.lastSyncAt) return t.attFeedNever(f.source, f.who);
    const since = new Date(f.lastSyncAt).toLocaleDateString(dateLocale, { weekday: "short", day: "numeric", month: "short" });
    return t.attFeedStale(f.source, f.who, since);
  };
  async function seen() {
    setChanges((c) => c && { ...c, alerts: [] });
    await fetch("/api/changes", { method: "POST" }).catch(() => {});
  }

  const row = (key: string, icon: string, text: React.ReactNode, href?: string, action?: string, tone: "warn" | "danger" = "warn") => {
    const inner = (
      <>
        <span aria-hidden style={{ flexShrink: 0, width: 20, textAlign: "center" }}>{icon}</span>
        <span style={{ flex: 1, minWidth: 0, color: tone === "danger" ? "var(--danger)" : "var(--fg)", fontWeight: tone === "danger" ? 700 : 500 }}>{text}</span>
        {href && <span style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 800, color: "var(--accent)" }}>{action ?? "›"}</span>}
      </>
    );
    const style: React.CSSProperties = { display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", fontSize: 14, lineHeight: 1.4, textDecoration: "none", borderTop: "1px solid var(--border-soft)" };
    // 2026-10-25 (G7): which kinds of attention rows lead to action.
    const kind = key.startsWith("c") ? "clash" : key.startsWith("r") ? "ride" : key.startsWith("f") ? "feed" : key === "unassigned" ? "unassigned" : "school";
    return href ? <Link key={key} href={href} style={style} onClick={() => track("attention_clicked", { kind })}>{inner}</Link> : <div key={key} style={style}>{inner}</div>;
  };

  return (
    <section id="attention" aria-label={t.attentionTitle} style={{ background: "var(--tint-warning)", border: "1px solid var(--border)", borderRadius: 18, padding: "12px 16px 6px", marginBottom: 22, fontFamily: FONT }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--fg)" }}>{t.attentionTitle}</h2>
        {alerts.length > 0 && (
          <button type="button" onClick={seen} title={a.changesTitle} style={{ border: "none", background: "var(--surface-3)", color: "var(--fg-2)", borderRadius: 50, padding: "5px 12px", fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: FONT }}>{t.attSeen}</button>
        )}
      </div>
      {clashes.map((c, i) => row(`c${i}`, "⚠️", t.attClash(c), "#tomorrow", undefined, "danger"))}
      {noRide.map((it) => row(`r${it.reminderId}`, "🚗", t.attNoRide(shortTitle(it.title), it.who), "#tomorrow"))}
      {alerts.slice(0, 6).map((x) => {
        const who = changes && x.childId !== changes.me ? changes.names[x.childId] : null;
        return row(`a${x.id}`, ICON[x.kind], <>{who && <strong>{who}: </strong>}{changeLine(x)}</>);
      })}
      {soon.map((s) => row(s.key, s.kind === "TEST" ? "📝" : "📚", t.attTestSoon(s.who, s.title, when(s.day)), s.href))}
      {feedIssues.map((f) => row(`f${f.id}`, "🔌", feedLine(f), f.kind === "school" ? "/dashboard/school" : "/dashboard/training", t.attCheck))}
      {unassigned > 0 && row("unassigned", "👤", t.attUnassigned(unassigned), "/dashboard/training", t.attFix)}
    </section>
  );
}
