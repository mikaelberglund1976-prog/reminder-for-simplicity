"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError("");
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Incorrect email or password.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#F5F6FA",
      fontFamily: FONT, display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>

      {/* Content */}
      <main style={{ flex: 1, maxWidth: 480, width: "100%", margin: "0 auto", padding: "60px 28px 0" }}>

        {/* Title */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "#1A2340", margin: 0, letterSpacing: "-0.5px" }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 15, color: "#8B90A4", margin: "8px 0 0" }}>
            Log in to your account.
          </p>
        </div>

        {error && (
          <div style={{
            background: "#FFF0F0", border: "1px solid #F5CCCC", color: "#D94F4F",
            borderRadius: 12, padding: "12px 16px", fontSize: 14, marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        {/* Google button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
            gap: 12, background: "#fff", color: "#1A2340", fontWeight: 500, fontSize: 15,
            padding: "15px 16px", borderRadius: 14, border: "1.5px solid #E8EDF4",
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
          {googleLoading ? "Redirecting…" : "Continue with Google"}
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: "#E8EDF4" }} />
          <span style={{ color: "#B0B7C8", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>
            or sign in with email
          </span>
          <div style={{ flex: 1, height: 1, background: "#E8EDF4" }} />
        </div>

        <form onSubmit={handleSubmit}>

          {/* Email */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1A2340", marginBottom: 10 }}>Email</div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1A2340", marginBottom: 10 }}>Password</div>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ ...inputStyle, paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "#8B90A4", display: "flex", alignItems: "center", padding: 0,
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
              background: "#fff", border: "1.5px solid #E8EDF4",
              fontSize: 16, fontWeight: 600,
              color: loading ? "#B0B7C8" : "#1A2340",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
              fontFamily: FONT, transition: "all 0.15s",
            }}
          >
            {loading ? "Signing in…" : "Log in"}
          </button>

        </form>

        {/* Create account */}
        <p style={{ textAlign: "center", fontSize: 14, color: "#8B90A4", marginTop: 24 }}>
          No account?{" "}
          <Link href="/register" style={{ color: "#1A2340", fontWeight: 600, textDecoration: "underline" }}>
            Create account
          </Link>
        </p>

      </main>

      {/* Decorative wave at bottom */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, pointerEvents: "none", lineHeight: 0 }}>
        <svg viewBox="0 0 480 180" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", display: "block" }}>
          <ellipse cx="340" cy="200" rx="260" ry="130" fill="#D6E8FF" opacity="0.45" />
          <ellipse cx="180" cy="220" rx="220" ry="110" fill="#EBF3FF" opacity="0.5" />
          <ellipse cx="420" cy="240" rx="180" ry="100" fill="#C5DCFC" opacity="0.3" />
        </svg>
      </div>

    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#fff",
  border: "1.5px solid #E8EDF4",
  borderRadius: 14,
  padding: "14px 16px",
  fontSize: 15,
  color: "#1A2340",
  outline: "none",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
  boxSizing: "border-box" as const,
  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
};
