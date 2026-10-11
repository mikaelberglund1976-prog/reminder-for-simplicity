"use client";

// 2026-10-11: the change watch on Home (lib/changeWatch.ts) — what the school
// and club calendars changed in the last few days. "OK" closes it until the
// next change.
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
type Alert = { id: string; childId: string; kind: "MOVED" | "TIME" | "CANCELLED" | "NEW_TEST" | "NEW" | "MANY"; title: string; oldYmd: string | null; newYmd: string | null; oldTime: string | null; newTime: string | null; count: number | null };
const ICON: Record<Alert["kind"], string> = { MOVED: "📅", TIME: "⏰", CANCELLED: "🚫", NEW_TEST: "📝", NEW: "✨", MANY: "🔄" };

export default function ChangesCard() {
  const { m, dateLocale } = useI18n();
  const t = m.assist;
  const [data, setData] = useState<{ alerts: Alert[]; names: Record<string, string>; me: string } | null>(null);

  useEffect(() => {
    fetch("/api/changes").then((r) => (r.ok ? r.json() : null)).then(setData).catch(() => {});
  }, []);
  if (!data?.alerts.length) return null;

  const day = (ymd: string | null) => ymd ? new Date(ymd + "T12:00:00Z").toLocaleDateString(dateLocale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) : "";
  const line = (a: Alert) => {
    switch (a.kind) {
      case "TIME": return t.chTime(a.title, a.newTime ?? "", a.oldTime, day(a.newYmd));
      case "MOVED": return t.chMoved(a.title, day(a.newYmd), a.newTime);
      case "CANCELLED": return t.chCancelled(a.title, day(a.oldYmd));
      case "NEW_TEST": return t.chNewTest(a.title, day(a.newYmd));
      case "NEW": return t.chNew(a.title, day(a.newYmd), a.newTime);
      case "MANY": return t.chMany(a.title, a.count ?? 0);
    }
  };
  async function seen() {
    setData(null);
    await fetch("/api/changes", { method: "POST" }).catch(() => {});
  }

  return (
    <section id="changes" style={{ background: "var(--tint-warning)", border: "1px solid var(--border)", borderRadius: 18, padding: "14px 16px 12px", marginBottom: 22, fontFamily: FONT }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--fg)" }}>🔔 {t.changesTitle}</h2>
        <button type="button" onClick={seen} style={{ border: "none", background: "var(--surface)", color: "var(--fg-2)", borderRadius: 50, padding: "6px 14px", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: FONT }}>{t.changesSeen}</button>
      </div>
      {data.alerts.slice(0, 6).map((a) => {
        const who = a.childId !== data.me ? data.names[a.childId] : null;
        return (
          <div key={a.id} style={{ display: "flex", gap: 10, padding: "7px 0", fontSize: 14, lineHeight: 1.4, color: "var(--fg)" }}>
            <span aria-hidden style={{ flexShrink: 0 }}>{ICON[a.kind]}</span>
            <span>{who && <strong>{who}: </strong>}{line(a)}</span>
          </div>
        );
      })}
    </section>
  );
}
