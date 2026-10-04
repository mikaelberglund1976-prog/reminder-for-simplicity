"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import LanguageToggle from "@/components/LanguageToggle";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

// Kept in sync with PENDING_APPROVAL_MESSAGE in src/lib/auth.ts by hand
// (duplicated rather than imported — auth.ts pulls in prisma/bcrypt, which
// can't be bundled into a client component).
const PENDING_APPROVAL_MESSAGE = "Your account is pending admin approval.";
// Same for these two (src/lib/verification.ts), added 2026-09-27.
const EMAIL_NOT_VERIFIED_MESSAGE = "Please confirm your email first — check your inbox for the link.";
const ACCOUNT_DELETED_MESSAGE = "This account has been deleted.";
const PASS_THROUGH = [PENDING_APPROVAL_MESSAGE, EMAIL_NOT_VERIFIED_MESSAGE, ACCOUNT_DELETED_MESSAGE];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [info, setInfo] = useState("");
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const { m: msg, err } = useI18n();
  const t = msg.auth;

  // Google's signIn callback redirects here with ?error=PendingApproval when
  // a not-yet-approved account tries to sign in (see auth.ts).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "PendingApproval") {
      setError(t.pendingApproval);
    }
    if (params.get("error") === "AccountDeleted") {
      setError(t.accountDeleted);
    }
    if (params.get("verified") === "1") {
      setInfo(t.emailConfirmed);
    }
    if (params.get("info") === "pin-retired") {
      setInfo(t.pinRetired);
    }
    const e = params.get("email");
    if (e) setEmail(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError("");
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  async function resendVerification() {
    setResendState("sending");
    await fetch("/api/auth/resend-verification", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
    }).catch(() => {});
    setResendState("sent");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError(PASS_THROUGH.includes(result.error) || result.error.startsWith("Too many attempts") ? err(result.error) : t.incorrect);
      setResendState("idle");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "var(--background)",
      fontFamily: FONT, display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>

      <LanguageToggle style={{ position: "absolute", top: 16, right: 20, zIndex: 2 }} />

      {/* Content */}
      <main style={{ flex: 1, maxWidth: "var(--content-max-width)", width: "100%", margin: "0 auto", padding: "60px 28px 0" }}>

        {/* Title */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "var(--fg)", margin: 0, letterSpacing: "-0.5px" }}>
            {t.welcomeBack}
          </h1>
          <p style={{ fontSize: 15, color: "var(--fg-2)", margin: "8px 0 0" }}>
            {t.logInToAccount}
          </p>
        </div>

        {error && (
          <div style={{
            background: "var(--tint-danger)", border: "1px solid var(--border-danger)", color: "var(--danger)",
            borderRadius: 12, padding: "12px 16px", fontSize: 14, marginBottom: 20,
          }}>
            {error}
            {(error === EMAIL_NOT_VERIFIED_MESSAGE || error === t.emailNotVerified) && email && (
              <div style={{ marginTop: 8 }}>
                {resendState === "sent" ? (
                  <span style={{ color: "var(--success)", fontWeight: 600 }}>{t.newLinkSent}</span>
                ) : (
                  <button type="button" onClick={resendVerification} disabled={resendState === "sending"}
                    style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: FONT }}>
                    {resendState === "sending" ? msg.common.sending : t.resendConfirmation}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {info && !error && (
          <div style={{
            background: "var(--tint-success)", border: "1px solid var(--tint-success)", color: "var(--success)",
            borderRadius: 12, padding: "12px 16px", fontSize: 14, marginBottom: 20,
          }}>
            {info}
          </div>
        )}

        {/* Google button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
            gap: 12, background: "var(--surface)", color: "var(--fg)", fontWeight: 500, fontSize: 15,
            padding: "15px 16px", borderRadius: 14, border: "1.5px solid var(--border)",
            cursor: googleLoading ? "not-allowed" : "pointer",
            opacity: googleLoading ? 0.6 : 1, marginBottom: 24,
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)", fontFamily: FONT,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {googleLoading ? t.redirecting : t.continueWithGoogle}
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ color: "var(--muted)", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>
            {t.orSignInEmail}
          </span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        <form onSubmit={handleSubmit}>

          {/* Email */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)", marginBottom: 10 }}>{msg.common.email}</div>
            <input
              type="email"
              placeholder={msg.common.email}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)" }}>{msg.common.password}</div>
              <Link href="/forgot-password" style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>
                {t.forgotPassword}
              </Link>
            </div>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder={msg.common.password}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ ...inputStyle, paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={t.showPassword}
                style={{
                  position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--muted)", display: "flex", alignItems: "center", padding: 0,
                }}
              >
                {showPassword ? (
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Log in button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "17px", borderRadius: 50,
              background: loading ? "#7C7C8A" : "var(--ink)", border: "none",
              fontSize: 16, fontWeight: 700,
              color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 2px 10px rgba(26,35,64,0.22)",
              fontFamily: FONT, transition: "all 0.15s",
            }}
          >
            {loading ? t.signingIn : msg.common.logIn}
          </button>

        </form>

        {/* Create account */}
        <p style={{ textAlign: "center", fontSize: 14, color: "var(--fg-2)", marginTop: 24 }}>
          {t.noAccount}{" "}
          <Link href="/register" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
            {t.createAccount}
          </Link>
        </p>

      </main>

      {/* Decorative wave at bottom */}
      <div className="rfs-deco" style={{ position: "absolute", bottom: 0, left: 0, right: 0, pointerEvents: "none", lineHeight: 0 }}>
        <svg viewBox="0 0 480 180" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", display: "block" }}>
          <ellipse cx="340" cy="200" rx="260" ry="130" fill="#E4E7FB" opacity="0.45" />
          <ellipse cx="180" cy="220" rx="220" ry="110" fill="#E4E7FB" opacity="0.5" />
          <ellipse cx="420" cy="240" rx="180" ry="100" fill="#C5DCFC" opacity="0.3" />
        </svg>
      </div>

    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--surface)",
  border: "1.5px solid var(--border)",
  borderRadius: 14,
  padding: "14px 16px",
  fontSize: 15,
  color: "var(--fg)",
  outline: "none",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
  boxSizing: "border-box" as const,
  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
};
