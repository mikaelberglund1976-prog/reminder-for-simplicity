"use client";

import { useSession } from "next-auth/react";
import UpgradeGate from "@/components/UpgradeGate";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import HamburgerMenu from "@/components/HamburgerMenu";
import Avatar from "@/components/Avatar";
import { useI18n, useM } from "@/lib/i18n/client";
import { weekdayName } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/config";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function IcBack() { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6"/></svg>; }
function IcTrash() { return <svg width={16} height={16} viewBox="0 0 24 24" {...STR}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>; }

type TrainingItem = {
  id: string;
  name: string;
  note: string | null;
  recurrence: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  choreRecurrenceDays: string | null;
  assignedUser: { id: string; name: string | null; email: string } | null;
};

type TrialInfo = {
  status: "NO_HOUSEHOLD" | "NO_TRIAL" | "TRIAL" | "TRIAL_EXPIRED" | "PRO";
  isPro: boolean;
  trialActive: boolean;
  childMembers: { id: string; name: string }[];
  householdMembers?: { id: string; name: string; role: string }[];
};

function formatSchedule(item: TrainingItem, m: Messages, locale: Locale): string {
  const t = m.activities;
  if (item.choreRecurrenceDays) {
    const days = item.choreRecurrenceDays.split(",").map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n))
      .sort((x, y) => ((x + 6) % 7) - ((y + 6) % 7)); // Monday first
    if (days.length === 1) return t.every(weekdayName(locale, days[0], "long"));
    return days.map((d) => weekdayName(locale, d)).join(", ");
  }
  if (item.recurrence === "DAILY") return t.everyDay;
  if (item.recurrence === "WEEKLY") return t.weekly;
  return t.oneOff;
}

// Dedicated Training section — separate from Chores, mirrors the
// /dashboard/school pattern (2026-07-28, direct feedback: "Training ska ju
// vara en helt egen"). Reuses /api/family/chores?category=TRAINING, which
// already restricts a logged-in child to only their own bookings; as an
// adult/parent it returns every child's trainings in the household. Creating
// a new booking still goes through the existing /dashboard/family/new form
// (Chore/Training toggle already built), just linked to directly here.
export default function TrainingPage() {
  const { status } = useSession();
  const router = useRouter();
  const { m: msg, locale } = useI18n();
  const t = msg.activities;

  const [trial, setTrial] = useState<TrialInfo | null>(null);
  const [items, setItems] = useState<TrainingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status]);

  async function load() {
    setLoading(true);
    try {
      const tRes = await fetch("/api/family/trial");
      if (tRes.ok) setTrial(await tRes.json());
      const res = await fetch("/api/family/chores?category=TRAINING");
      if (res.ok) {
        const data = await res.json();
        setItems(data.chores ?? []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/reminders/${id}`, { method: "DELETE" });
      if (res.ok) await load();
    } catch (e) { console.error(e); }
    finally { setDeletingId(null); }
  }

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "var(--muted)", fontSize: 15 }}>{t.loading}</div>
      </div>
    );
  }

  if (!trial || trial.status === "NO_HOUSEHOLD") {
    return (
      <Screen onBack={() => router.push("/dashboard")}>
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--fg)", margin: "0 0 10px" }}>{t.setUpHousehold}</h2>
          <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, marginBottom: 28 }}>
            {t.needsHousehold}
          </p>
          <Link href="/dashboard/family" style={{ display: "inline-flex", background: "var(--ink)", color: "#fff", borderRadius: 50, padding: "14px 28px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            {t.goToChores}
          </Link>
        </div>
      </Screen>
    );
  }

  // 2026-09-28: Pro feature — gate both "never tried" and "trial ended".
  if (!trial.isPro && !trial.trialActive) {
    return (
      <Screen onBack={() => router.push("/dashboard")}>
        <UpgradeGate feature={t.feature} emoji="🎯" description={t.gateDescription} />
      </Screen>
    );
  }

  // 2026-09-28 (rows 43/46): activities can belong to anyone — show every
  // child, plus each adult who has at least one.
  const allMembers = trial.householdMembers ?? trial.childMembers.map((c) => ({ ...c, role: "CHILD" }));
  const byChild = new Map<string, TrainingItem[]>();
  for (const item of items) {
    const key = item.assignedUser?.id ?? "unknown";
    if (!byChild.has(key)) byChild.set(key, []);
    byChild.get(key)!.push(item);
  }
  for (const list of Array.from(byChild.values())) {
    list.sort((a: TrainingItem, b: TrainingItem) => a.name.localeCompare(b.name));
  }
  const children = [
    ...allMembers.filter((m) => m.role === "CHILD"),
    ...allMembers.filter((m) => m.role !== "CHILD" && (byChild.get(m.id)?.length ?? 0) > 0),
  ];
  // 2026-10-04: activities for no one (or someone who left the family) were
  // never listed, so they couldn't be removed.
  const memberIds = new Set(allMembers.map((m) => m.id));
  const orphanList = items.filter((i) => !i.assignedUser?.id || !memberIds.has(i.assignedUser.id)).sort((a, b) => a.name.localeCompare(b.name));
  if (orphanList.length > 0) {
    byChild.set("__orphans", orphanList);
    children.push({ id: "__orphans", name: t.notAssigned, role: "ORPHAN" } as (typeof children)[number]);
  }

  return (
    <Screen onBack={() => router.push("/dashboard")}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
          {t.intro}
        </div>
      </div>

      <Link
        href="/dashboard/family/new?type=training"
        style={{
          width: "100%", padding: "14px 16px", borderRadius: 14, marginBottom: 20,
          background: "#D85A30", border: "none", color: "#fff",
          fontSize: 14, fontWeight: 700, textDecoration: "none",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
        {t.add}
      </Link>

      {children.length === 0 && (
        <div style={{ textAlign: "center", padding: "20px 0", color: "var(--subtle)", fontSize: 13 }}>
          {t.noneYet1}<strong>{t.add}</strong>{t.noneYet2}
        </div>
      )}

      {children.map(child => {
        const list = byChild.get(child.id) ?? [];
        return (
          <div key={child.id} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              {child.id !== "__orphans" && <Avatar userId={child.id} name={child.name} size={22} />}
              {child.name} · {list.length}
            </div>
            {list.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--subtle)", padding: "8px 2px" }}>{t.noneBooked}</div>
            ) : (
              <div style={{ background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                {list.map((item, i) => (
                  <div key={item.id} style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
                    borderTop: i === 0 ? "none" : "1px solid var(--border-soft)",
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, background: "var(--tint-warning)",
                      color: "#D85A30", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, flexShrink: 0,
                    }}>
                      🎯
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)", lineHeight: 1.3 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                        {formatSchedule(item, msg, locale)}{item.note ? ` · ${item.note}` : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      style={{
                        background: "none", border: "none", color: "var(--faint)",
                        cursor: deletingId === item.id ? "wait" : "pointer", padding: 6, display: "flex",
                      }}
                      aria-label={msg.common.remove}
                    >
                      <IcTrash />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </Screen>
  );
}

function Screen({ onBack, children }: { onBack: () => void; children: React.ReactNode }) {
  const m = useM();
  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT }}>
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} aria-label={m.common.back} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-2)", display: "flex", padding: 4 }}>
            <IcBack />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)", margin: 0, flex: 1 }}>{m.activities.title}</h1>
          <HamburgerMenu />
        </div>
      </div>
      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "20px 20px 40px" }}>
        {children}
      </main>
    </div>
  );
}
