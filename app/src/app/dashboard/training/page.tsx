"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import HamburgerMenu from "@/components/HamburgerMenu";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; // Date#getDay() order — matches lib/recurrence.ts

function IcBack() { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6"/></svg>; }
function IcLock()  { return <svg width={32} height={32} viewBox="0 0 24 24" {...STR} strokeWidth={1.5}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }
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
};

function formatSchedule(item: TrainingItem): string {
  if (item.choreRecurrenceDays) {
    const days = item.choreRecurrenceDays.split(",").map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n)).sort();
    return days.map((d) => WEEKDAY_SHORT[d]).join(", ");
  }
  if (item.recurrence === "DAILY") return "Every day";
  if (item.recurrence === "WEEKLY") return "Weekly";
  return "One-off";
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
      <div style={{ minHeight: "100vh", background: "#F5F4F0", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "#7C7C8A", fontSize: 15 }}>Loading training…</div>
      </div>
    );
  }

  if (!trial || trial.status === "NO_HOUSEHOLD") {
    return (
      <Screen onBack={() => router.push("/dashboard")}>
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", margin: "0 0 10px" }}>Set up your household first</h2>
          <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, marginBottom: 28 }}>
            Training needs a household with at least one child added.
          </p>
          <Link href="/dashboard/family" style={{ display: "inline-flex", background: "#1C1C28", color: "#fff", borderRadius: 50, padding: "14px 28px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            Go to Chores →
          </Link>
        </div>
      </Screen>
    );
  }

  if (trial.status === "TRIAL_EXPIRED" && !trial.isPro) {
    return (
      <Screen onBack={() => router.push("/dashboard")}>
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ color: "#CBD5E1", marginBottom: 20, display: "flex", justifyContent: "center" }}><IcLock /></div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", margin: "0 0 10px" }}>Trial period ended</h2>
          <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>Upgrade to Pro to keep using Training.</p>
        </div>
      </Screen>
    );
  }

  const children = trial.childMembers ?? [];
  const byChild = new Map<string, TrainingItem[]>();
  for (const item of items) {
    const key = item.assignedUser?.id ?? "unknown";
    if (!byChild.has(key)) byChild.set(key, []);
    byChild.get(key)!.push(item);
  }
  for (const list of Array.from(byChild.values())) {
    list.sort((a: TrainingItem, b: TrainingItem) => a.name.localeCompare(b.name));
  }

  return (
    <Screen onBack={() => router.push("/dashboard")}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>
          Recurring practice times for each child — synced to the calendar automatically.
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
        Add training
      </Link>

      {children.length === 0 && (
        <div style={{ textAlign: "center", padding: "20px 0", color: "#9CA3AF", fontSize: 13 }}>
          Add a child in Chores before creating trainings.
        </div>
      )}

      {children.map(child => {
        const list = byChild.get(child.id) ?? [];
        return (
          <div key={child.id} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              {child.name} · {list.length}
            </div>
            {list.length === 0 ? (
              <div style={{ fontSize: 13, color: "#9CA3AF", padding: "8px 2px" }}>No trainings booked yet.</div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #E4E3DE", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                {list.map((item, i) => (
                  <div key={item.id} style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
                    borderTop: i === 0 ? "none" : "1px solid #F0F3F8",
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, background: "#FBEAE2",
                      color: "#D85A30", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, flexShrink: 0,
                    }}>
                      ⚽
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", lineHeight: 1.3 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                        {formatSchedule(item)}{item.note ? ` · ${item.note}` : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      style={{
                        background: "none", border: "none", color: "#C0C5D0",
                        cursor: deletingId === item.id ? "wait" : "pointer", padding: 6, display: "flex",
                      }}
                      aria-label="Remove"
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
  return (
    <div style={{ minHeight: "100vh", background: "#F5F4F0", fontFamily: FONT }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #E4E3DE", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#4B5563", display: "flex", padding: 4 }}>
            <IcBack />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: 0, flex: 1 }}>⚽ Training</h1>
          <HamburgerMenu />
        </div>
      </div>
      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "20px 20px 40px" }}>
        {children}
      </main>
    </div>
  );
}
