"use client";

import { useSession } from "next-auth/react";
import UpgradeGate from "@/components/UpgradeGate";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import HamburgerMenu from "@/components/HamburgerMenu";
import SchoolSection from "@/components/SchoolSection";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function IcBack() { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6"/></svg>; }

type TrialInfo = {
  status: "NO_HOUSEHOLD" | "NO_TRIAL" | "TRIAL" | "TRIAL_EXPIRED" | "PRO";
  isPro: boolean;
  trialActive: boolean;
  // 2026-08-18: School items can be logged for any household member now, not
  // just children (Mikael: "samma med läxor" — same as chores). Was
  // `childMembers`.
  householdMembers: { id: string; name: string }[];
};

// Dedicated School section — separate from the general Reminders flow and
// separate from Chores, per explicit product direction: parents want a
// single place to see every child's upcoming tests/homework, and children
// need to be able to add their own (see dashboard/family/child for the
// child-facing self-service form). Reuses /api/family/chores?category=SCHOOL,
// which already restricts a logged-in child to only their own items — as an
// adult/parent this same endpoint returns every child's items in the
// household, each with `assignedUser` populated so we can group by child.
// 2026-07-28: next build's static prerender step requires any component that
// calls useSearchParams() to sit inside a <Suspense> boundary — tsc doesn't
// catch this (it's a build/prerender-time check, not a type error), which is
// how this shipped broken once already. Keep the searchParams-reading logic
// in an inner component so the outer default export can wrap it in Suspense.
export default function SchoolPage() {
  return (
    <Suspense fallback={null}>
      <SchoolPageInner />
    </Suspense>
  );
}

function SchoolPageInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  // 2026-07-28: the Calendar's "+" button can land here with a date already
  // chosen (type first, then date, then details) — prefill and open the form
  // right away instead of making the user find "+ Add" again.
  const dateFromQuery = searchParams.get("date");

  const [trial, setTrial] = useState<TrialInfo | null>(null);
  const [loading, setLoading] = useState(true);

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
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "var(--muted)", fontSize: 15 }}>Loading school…</div>
      </div>
    );
  }

  if (!trial || trial.status === "NO_HOUSEHOLD") {
    return (
      <Screen onBack={() => router.push("/dashboard")}>
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--fg)", margin: "0 0 10px" }}>Set up your household first</h2>
          <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, marginBottom: 28 }}>
            School needs a household to belong to.
          </p>
          <Link href="/dashboard/family" style={{ display: "inline-flex", background: "var(--ink)", color: "#fff", borderRadius: 50, padding: "14px 28px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            Go to Family →
          </Link>
        </div>
      </Screen>
    );
  }

  // 2026-09-28: Pro feature — gate both "never tried" and "trial ended".
  if (!trial.isPro && !trial.trialActive) {
    return (
      <Screen onBack={() => router.push("/dashboard")}>
        <UpgradeGate feature="Homework & tests" emoji="📚" description="Keep track of homework and tests for every child — they see theirs first thing when they log in. Try it free for 14 days." />
      </Screen>
    );
  }

  const members = trial.householdMembers ?? [];

  return (
    <Screen onBack={() => router.push("/dashboard")}>
      <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, marginBottom: 20 }}>
        Upcoming homework and tests for the whole family. Tick them off when done, and choose per item whether it shows in the calendar. Children see theirs first thing when they log in.
      </div>
      {members.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: "var(--subtle)", fontSize: 13 }}>
          Add someone in Family before creating school items.
        </div>
      ) : (
        <SchoolSection mode="overview" members={members} initialDate={dateFromQuery} />
      )}
    </Screen>
  );
}

function Screen({ onBack, children }: { onBack: () => void; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT }}>
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-2)", display: "flex", padding: 4 }}>
            <IcBack />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)", margin: 0, flex: 1 }}>📚 School</h1>
          <HamburgerMenu />
        </div>
      </div>
      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "20px 20px 40px" }}>
        {children}
      </main>
    </div>
  );
}
