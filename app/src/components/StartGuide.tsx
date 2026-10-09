"use client";

// 2026-10-09: start guide for a new family (persona review: "the first
// evening is where a family is won or lost"). Shown on adult Home until every
// step is done or the person hides it. Steps: add a child → invite the other
// adult → connect SchoolSoft → connect a club calendar. Each step links to the
// page that already does the job; nothing new to learn.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const ADULT = ["OWNER", "PARENT", "ADULT"];

type Member = { userId: string; role?: string };

export default function StartGuide({ members, userId, plan }: { members: Member[]; userId: string | undefined; plan: "FREE" | "TRIAL" | "PRO" | null }) {
  const { m } = useI18n();
  const t = m.home.guide;
  const key = `rfs-startguide-hidden-${userId ?? "anon"}`;
  const [hidden, setHidden] = useState(true);
  const [school, setSchool] = useState(false);
  const [club, setClub] = useState(false);

  const me = members.find((x) => x.userId === userId);
  const isAdult = !!me && ADULT.includes(me.role ?? "");
  const hasChild = members.some((x) => x.role === "CHILD");
  const hasOtherAdult = members.filter((x) => ADULT.includes(x.role ?? "")).length >= 2;
  const familyFeatures = plan === "TRIAL" || plan === "PRO";

  useEffect(() => {
    try { setHidden(localStorage.getItem(key) === "1"); } catch { setHidden(false); }
  }, [key]);

  useEffect(() => {
    if (!isAdult || !hasChild || !familyFeatures) return;
    fetch("/api/family/school-feeds").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.children?.some((c: { connected: boolean }) => c.connected)) setSchool(true);
    }).catch(() => {});
    fetch("/api/family/activity-feeds").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.children?.some((c: { feeds: unknown[] }) => c.feeds?.length > 0)) setClub(true);
    }).catch(() => {});
  }, [isAdult, hasChild, familyFeatures]);

  if (!isAdult || hidden) return null;

  const needsPro = !familyFeatures;
  const steps = [
    { done: hasChild, title: t.childTitle, body: needsPro ? t.childBodyPro : t.childBody, href: needsPro ? "/upgrade" : "/dashboard/family/members", cta: needsPro ? t.startTrial : t.childCta },
    { done: hasOtherAdult, title: t.adultTitle, body: t.adultBody, href: "/dashboard/family/members", cta: t.adultCta },
    { done: school, title: t.schoolTitle, body: t.schoolBody, href: "/dashboard/school", cta: t.schoolCta, locked: !hasChild },
    { done: club, title: t.clubTitle, body: t.clubBody, href: "/dashboard/training", cta: t.clubCta, locked: !hasChild },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;
  const next = steps.find((s) => !s.done && !s.locked) ?? steps.find((s) => !s.done);

  function hide() {
    try { localStorage.setItem(key, "1"); } catch { /* private mode: hide for this visit only */ }
    setHidden(true);
  }

  return (
    <section aria-label={t.title} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: "16px 16px 12px", marginBottom: 22, boxShadow: "var(--shadow)", fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--fg)" }}>{t.title}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{t.progress(doneCount, steps.length)}</div>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "var(--surface-3)", overflow: "hidden", marginBottom: 12 }}>
        <div style={{ width: `${(doneCount / steps.length) * 100}%`, height: "100%", background: "var(--accent-bg)", transition: "width .3s" }} />
      </div>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        {steps.map((s) => {
          const isNext = s === next;
          return (
            <li key={s.title} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 0", opacity: s.locked && !s.done ? 0.55 : 1 }}>
              <span aria-hidden style={{
                width: 24, height: 24, borderRadius: "50%", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 800,
                background: s.done ? "var(--success)" : "transparent", color: s.done ? "#fff" : "var(--muted)",
                border: s.done ? "none" : "1.5px solid var(--border)",
              }}>{s.done ? "✓" : ""}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: s.done ? "var(--muted)" : "var(--fg)", textDecoration: s.done ? "line-through" : "none" }}>{s.title}</div>
                {isNext && (
                  <>
                    <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.45, margin: "2px 0 8px" }}>{s.body}</div>
                    <Link href={s.href} style={{ display: "inline-block", background: "var(--ink)", color: "#fff", borderRadius: 50, padding: "8px 16px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>{s.cta}</Link>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={hide} style={{ background: "none", border: "none", padding: "6px 0 0", fontSize: 12, fontWeight: 700, color: "var(--subtle)", cursor: "pointer", fontFamily: FONT }}>{t.hide}</button>
    </section>
  );
}
