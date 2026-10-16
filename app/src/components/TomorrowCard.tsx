"use client";

// 2026-10-11: "Tomorrow" on Home (lib/tomorrowPlan.ts) — what's on, what to
// bring (tick it off, shared with the family), who drives, and clashes.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
type Item = { reminderId: string; title: string; kind: "TEST" | "HOMEWORK" | "SCHOOL" | "ACTIVITY" | "TRIP"; who: string | null; startTime: string | null; endTime: string | null; place: string | null; needsRide: boolean; driverId: string | null; driver: string | null; href: string };
type Check = { key: string; label: string; checked: boolean; custom: boolean; who: string | null };
type Start = { childId: string; who: string | null; time: string | null; off: boolean; note: string | null; wake: string | null };
type Plan = { ymd: string; isAdult: boolean; items: Item[]; checks: Check[]; clashes: string[]; starts?: Start[]; todayStarts?: Start[] };

export default function TomorrowCard() {
  const { m, dateLocale } = useI18n();
  const t = m.assist;
  const [plan, setPlan] = useState<Plan | null>(null);
  const [adding, setAdding] = useState("");
  const [me, setMe] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/family/tomorrow").then((r) => (r.ok ? r.json() : null)).then(setPlan).catch(() => {});
  }, []);
  useEffect(() => {
    load();
    fetch("/api/auth/session").then((r) => r.json()).then((s) => setMe(s?.user?.id ?? null)).catch(() => {});
  }, [load]);

  const starts = plan?.starts ?? [];
  // 2026-10-16: in the morning, today's start is what matters ("Idag: Elsa 08:20").
  const morning = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Stockholm", hour: "2-digit", hourCycle: "h23" }).format(new Date())) < 10;
  const todayStarts = morning ? (plan?.todayStarts ?? []) : [];
  if (!plan || (plan.items.length === 0 && plan.checks.length === 0 && starts.length === 0 && todayStarts.length === 0)) return null;

  const post = (body: object) => fetch("/api/family/tomorrow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  async function toggle(c: Check) {
    setPlan((p) => p && { ...p, checks: p.checks.map((x) => (x.key === c.key ? { ...x, checked: !x.checked } : x)) });
    await post({ action: "check", key: c.key, label: c.label, checked: !c.checked }).catch(() => {});
  }
  async function addCheck(e: React.FormEvent) {
    e.preventDefault();
    const label = adding.trim();
    if (!label) return;
    setAdding("");
    await post({ action: "add", label }).catch(() => {});
    load();
  }
  async function removeCheck(c: Check) {
    setPlan((p) => p && { ...p, checks: p.checks.filter((x) => x.key !== c.key) });
    await post({ action: "remove", key: c.key }).catch(() => {});
  }
  async function ride(it: Item, take: boolean) {
    await post({ action: "ride", reminderId: it.reminderId, take }).catch(() => {});
    load();
  }

  const day = new Date(plan.ymd + "T12:00:00Z").toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
  const allPacked = plan.checks.length > 0 && plan.checks.every((c) => c.checked);
  const KIND: Record<Item["kind"], { bg: string; fg: string; label: string }> = {
    TEST: { bg: "var(--tint-danger)", fg: "var(--danger)", label: m.homePrefs.kindTest },
    HOMEWORK: { bg: "var(--tint-school)", fg: "var(--school)", label: m.homePrefs.kindHomework },
    SCHOOL: { bg: "var(--surface-3)", fg: "var(--muted)", label: m.homePrefs.kindSchool },
    ACTIVITY: { bg: "var(--tint-warning)", fg: "#D85A30", label: m.homePrefs.kindActivity },
    TRIP: { bg: "var(--tint-accent)", fg: "var(--accent)", label: m.nav.trips },
  };
  const small = { border: "none", borderRadius: 50, padding: "5px 11px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: FONT } as const;

  return (
    <section id="tomorrow" style={{ marginBottom: 24, fontFamily: FONT }}>
      <h2 style={{ fontSize: 13, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>{t.tmTitle(day)}</h2>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "4px 14px 12px", boxShadow: "var(--shadow)" }}>
        {[{ list: todayStarts, label: t.tmToday }, { list: starts, label: t.tmSchoolStart }].filter((g) => g.list.length > 0).map((g) => (
          <div key={g.label} style={{ margin: "10px 0 2px", display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", fontSize: 13.5, lineHeight: 1.45 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>🏫 {g.label}</span>
            {g.list.map((s, i) => (
              <span key={s.childId} style={{ color: "var(--fg)" }}>
                {i > 0 && <span style={{ color: "var(--subtle)" }}>· </span>}
                {s.who && <span style={{ fontWeight: 700 }}>{s.who} </span>}
                {s.off
                  ? <span style={{ fontWeight: 800, color: "var(--success)" }}>{t.tmOff}</span>
                  : <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{s.time}</span>}
                {s.note && <span style={{ color: "var(--muted)" }}> ({s.note})</span>}
                {s.wake && <span style={{ color: "var(--muted)", fontSize: 12.5 }}> · ⏰ {t.tmWake(s.wake)}</span>}
              </span>
            ))}
          </div>
        ))}

        {plan.clashes.map((c, i) => (
          <div key={i} role="alert" style={{ margin: "10px 0 2px", background: "var(--tint-danger)", color: "var(--danger)", borderRadius: 12, padding: "9px 12px", fontSize: 13.5, fontWeight: 700, lineHeight: 1.4 }}>⚠️ {c}</div>
        ))}

        {plan.items.map((it, i) => {
          const k = KIND[it.kind];
          const time = it.startTime ? `${it.startTime}${it.endTime ? `–${it.endTime}` : ""}` : "";
          return (
            <div key={it.reminderId} style={{ padding: "10px 0", borderTop: i === 0 && !plan.clashes.length && !starts.length && !todayStarts.length ? "none" : "1px solid var(--border-soft)" }}>
              <Link href={it.href} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
                <span style={{ width: 74, flexShrink: 0, fontSize: 13, fontWeight: 800, color: time ? "var(--fg)" : "var(--subtle)", fontVariantNumeric: "tabular-nums" }}>{time || "–"}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</span>
                  {(it.who || it.place) && <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[it.who, it.place && (it.kind === "TRIP" ? it.place : `📍 ${it.place}`)].filter(Boolean).join(" · ")}</span>}
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 50, flexShrink: 0, background: k.bg, color: k.fg }}>{k.label}</span>
              </Link>
              {plan.isAdult && it.needsRide && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7, paddingLeft: 84 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>🚗 {t.tmRide}:</span>
                  {it.driverId ? (
                    <>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--success)" }}>{t.tmDrives(it.driver ?? "?")}</span>
                      {it.driverId === me && <button type="button" onClick={() => ride(it, false)} style={{ ...small, background: "none", color: "var(--muted)", padding: "5px 4px" }}>{t.tmUndo}</button>}
                    </>
                  ) : (
                    <button type="button" onClick={() => ride(it, true)} style={{ ...small, background: "var(--accent-bg)", color: "var(--on-accent)" }}>{t.tmIllTake}</button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div style={{ borderTop: plan.items.length ? "1px solid var(--border-soft)" : "none", paddingTop: 10, marginTop: plan.items.length ? 2 : 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>🎒 {t.tmBring}</span>
            {allPacked && <span style={{ fontSize: 12, fontWeight: 800, color: "var(--success)" }}>{t.tmAllPacked}</span>}
          </div>
          {plan.checks.map((c) => (
            <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: "pointer", fontSize: 14, color: "var(--fg)" }}>
                <input type="checkbox" checked={c.checked} onChange={() => toggle(c)} style={{ width: 20, height: 20, accentColor: "var(--accent)", flexShrink: 0 }} />
                <span style={{ textDecoration: c.checked ? "line-through" : "none", opacity: c.checked ? 0.55 : 1 }}>{c.label}{c.who ? <span style={{ color: "var(--muted)", fontSize: 12.5 }}> ({c.who})</span> : null}</span>
              </label>
              {c.custom && <button type="button" onClick={() => removeCheck(c)} aria-label={m.assist.qaRemove} style={{ border: "none", background: "none", color: "var(--subtle)", fontSize: 18, cursor: "pointer", padding: 2 }}>×</button>}
            </div>
          ))}
          <form onSubmit={addCheck} style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <input value={adding} onChange={(e) => setAdding(e.target.value)} placeholder={t.tmAddPlaceholder} maxLength={60} aria-label={t.tmAddPlaceholder}
              style={{ flex: 1, minWidth: 0, border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", fontSize: 13.5, background: "var(--surface-2)", color: "var(--fg)", fontFamily: FONT }} />
            <button type="submit" disabled={!adding.trim()} style={{ ...small, borderRadius: 10, padding: "0 12px", background: "var(--surface-3)", color: "var(--fg-2)", opacity: adding.trim() ? 1 : 0.5 }}>{t.tmAdd}</button>
          </form>
        </div>
      </div>
    </section>
  );
}
