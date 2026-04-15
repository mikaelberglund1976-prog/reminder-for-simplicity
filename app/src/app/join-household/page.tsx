"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

type InviteInfo = {
  valid: boolean;
  householdName: string | null;
  ownerName: string;
  invitedEmail: string;
};

export default function JoinHouseholdPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!token) { setError("No invite token found."); setLoading(false); return; }
    fetch(`/api/household/join?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setInfo(d);
      })
      .catch(() => setError("Could not validate invite."))
      .finally(() => setLoading(false));
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
      if (!res.ok) throw new Error(data.error || "Failed to join");
      setJoined(true);
      setTimeout(() => router.push("/dashboard"), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F5F6FA", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <span style={{ color: "#8B90A4", fontSize: 15 }}>Validating invite…</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #EEF5FF 0%, #F5F0FF 100%)", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
      <div style={{ maxWidth: 420, width: "100%" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#4a7ee0,#2e5ec8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🔔</div>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#1A2340", letterSpacing: "-0.5px" }}>AssistIQ</span>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 24, padding: "36px 32px", boxShadow: "0 4px 24px rgba(91,156,245,0.12)", border: "1.5px solid #E8EDF4" }}>

          {joined ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1A2340", margin: "0 0 12px" }}>You&apos;re in!</h2>
              <p style={{ fontSize: 15, color: "#8B90A4", lineHeight: 1.6, margin: 0 }}>
                Welcome to <strong style={{ color: "#1A2340" }}>{info?.householdName ?? "the household"}</strong>. Redirecting to dashboard…
              </p>
            </div>
          ) : error ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1A2340", margin: "0 0 12px" }}>Invalid invite</h2>
              <p style={{ fontSize: 14, color: "#D94F4F", marginBottom: 24 }}>{error}</p>
              <Link href="/dashboard" style={{ display: "inline-block", padding: "12px 28px", background: "#1A2340", color: "#fff", borderRadius: 50, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
                Go to dashboard
              </Link>
            </div>
          ) : info ? (
            <>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏠</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1A2340", margin: "0 0 8px", letterSpacing: "-0.4px" }}>
                  Join {info.householdName ?? "a household"}
                </h2>
                <p style={{ fontSize: 15, color: "#8B90A4", margin: 0, lineHeight: 1.6 }}>
                  <strong style={{ color: "#1A2340" }}>{info.ownerName}</strong> invited you to share reminders and manage tasks together.
                </p>
              </div>

              {/* Pro badge */}
              <div style={{ background: "linear-gradient(135deg,#EEF5FF,#F5F0FF)", borderRadius: 14, padding: "14px 16px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 20 }}>⚡</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1A2340" }}>AssistIQ Pro household</div>
                  <div style={{ fontSize: 12, color: "#8B90A4", marginTop: 2 }}>Shared reminders, handovers & safety net included</div>
                </div>
              </div>

              {status === "unauthenticated" ? (
                <>
                  <p style={{ fontSize: 14, color: "#8B90A4", textAlign: "center", marginBottom: 20 }}>
                    You need to be signed in to accept this invite.
                  </p>
                  <button
                    onClick={handleJoin}
                    style={{ width: "100%", padding: "16px", background: "linear-gradient(135deg,#4a7ee0,#2e5ec8)", border: "none", borderRadius: 50, fontSize: 15, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: FONT, boxShadow: "0 4px 14px rgba(46,94,200,0.3)" }}
                  >
                    Sign in to accept →
                  </button>
                </>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  style={{ width: "100%", padding: "16px", background: joining ? "rgba(74,126,224,0.6)" : "linear-gradient(135deg,#4a7ee0,#2e5ec8)", border: "none", borderRadius: 50, fontSize: 15, fontWeight: 700, color: "#fff", cursor: joining ? "not-allowed" : "pointer", fontFamily: FONT, boxShadow: "0 4px 14px rgba(46,94,200,0.3)", transition: "all 0.15s" }}
                >
                  {joining ? "Joining…" : `Accept & join ${info.householdName ?? "household"}`}
                </button>
              )}

              <p style={{ fontSize: 12, color: "#C0C7D6", textAlign: "center", marginTop: 16 }}>
                By joining, you agree to share your reminders visibility with household members.
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
