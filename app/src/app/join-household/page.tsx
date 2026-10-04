"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

type InviteInfo = {
  valid: boolean;
  householdName: string | null;
  ownerName: string;
  invitedEmail: string;
};

function JoinHouseholdContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const { m: msg, err: tErr } = useI18n();
  const t = msg.auth;

  useEffect(() => {
    if (!token) { setError(t.noInviteToken); setLoading(false); return; }
    fetch(`/api/household/join?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(tErr(d.error));
        else setInfo(d);
      })
      .catch(() => setError(t.couldNotValidate))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleJoin() {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=/join-household?token=${token}`);
      return;
    }
    setJoining(true);
    try {
      const res = await fetch("/api/household/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ? tErr(data.error) : t.failedJoin);
      setJoined(true);
      setTimeout(() => router.push("/dashboard"), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.somethingWrong);
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <span style={{ color: "var(--muted)", fontSize: 15 }}>{t.validating}</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, var(--tint-accent) 0%, var(--tint-accent) 100%)", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
      <div style={{ maxWidth: 420, width: "100%" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,var(--accent),var(--accent))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🔔</div>
            <span style={{ fontSize: 22, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.5px" }}>Reminder for Simplicity</span>
          </div>
        </div>

        <div style={{ background: "var(--surface)", borderRadius: 24, padding: "36px 32px", boxShadow: "0 4px 24px rgba(91,156,245,0.12)", border: "1.5px solid var(--border)" }}>

          {joined ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--fg)", margin: "0 0 12px" }}>{t.youreIn}</h2>
              <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
                {t.welcomeTo1}<strong style={{ color: "var(--fg)" }}>{info?.householdName ?? t.theHousehold}</strong>{t.welcomeTo2}
              </p>
            </div>
          ) : error ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--fg)", margin: "0 0 12px" }}>{t.invalidInvite}</h2>
              <p style={{ fontSize: 14, color: "var(--danger)", marginBottom: 24 }}>{error}</p>
              <Link href="/dashboard" style={{ display: "inline-block", padding: "12px 28px", background: "var(--ink)", color: "#fff", borderRadius: 50, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
                {t.goToDashboard}
              </Link>
            </div>
          ) : info ? (
            <>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏠</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--fg)", margin: "0 0 8px", letterSpacing: "-0.4px" }}>
                  {t.joinName(info.householdName)}
                </h2>
                <p style={{ fontSize: 15, color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>
                  <strong style={{ color: "var(--fg)" }}>{info.ownerName}</strong>{t.invitedYou}
                </p>
              </div>

              {/* Pro badge */}
              <div style={{ background: "linear-gradient(135deg,var(--tint-accent),var(--tint-accent))", borderRadius: 14, padding: "14px 16px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 20 }}>⚡</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>{t.proHousehold}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{t.proHouseholdSub}</div>
                </div>
              </div>

              {status === "unauthenticated" ? (
                <>
                  <p style={{ fontSize: 14, color: "var(--muted)", textAlign: "center", marginBottom: 20 }}>
                    {t.needSignIn}
                  </p>
                  <button
                    onClick={handleJoin}
                    style={{ width: "100%", padding: "16px", background: "linear-gradient(135deg,var(--accent),var(--accent))", border: "none", borderRadius: 50, fontSize: 15, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: FONT, boxShadow: "0 4px 14px rgba(46,94,200,0.3)" }}
                  >
                    {t.signInToAccept}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  style={{ width: "100%", padding: "16px", background: joining ? "rgba(74,126,224,0.6)" : "linear-gradient(135deg,var(--accent),var(--accent))", border: "none", borderRadius: 50, fontSize: 15, fontWeight: 700, color: "#fff", cursor: joining ? "not-allowed" : "pointer", fontFamily: FONT, boxShadow: "0 4px 14px rgba(46,94,200,0.3)", transition: "all 0.15s" }}
                >
                  {joining ? t.joining : t.acceptJoin(info.householdName)}
                </button>
              )}

              <p style={{ fontSize: 12, color: "var(--faint)", textAlign: "center", marginTop: 16 }}>
                {t.joinNote}
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function JoinHouseholdPage() {
  const { m } = useI18n();
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <span style={{ color: "var(--muted)", fontSize: 15 }}>{m.common.loading}</span>
      </div>
    }>
      <JoinHouseholdContent />
    </Suspense>
  );
}
