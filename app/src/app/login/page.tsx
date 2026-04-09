"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StarBackground } from "@/components/StarBackground";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError("");
    await signIn("google", { callbackUrl: "/dashboard" });
    // Page is redirected automatically by NextAuth
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
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at 60% 25%, #1e3f8a 0%, #0e2268 28%, #070f3c 60%, #030820 100%)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <StarBackground />

      {/* Nav */}
      <nav style={{ position: "relative", zIndex: 10, padding: "24px 36px" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div
            style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "rgba(255,255,255,0.13)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
            }}
          >
            🔔
          </div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 20, letterSpacing: "-0.3px" }}>
            AssistIQ
          </span>
        </Link>
      </nav>

      {/* Form */}
      <main
        style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 24px 60px", position: "relative", zIndex: 10,
        }}
      >
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h1 style={{ color: "#fff", fontWeight: 800, fontSize: 30, letterSpacing: "-0.5px", margin: 0 }}>
              Welcome back
            </h1>
            <p style={{ color: "rgba(180,200,255,0.7)", marginTop: 8, fontSize: 15 }}>
              Log in to your account
            </p>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 16,
              padding: "32px 28px",
              backdropFilter: "blur(12px)",
            }}
          >
            {/* ─── Google button ──────────────────────────────────────────────────────── */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                background: "#fff",
                color: "#1a1a2e",
                fontWeight: 600,
                fontSize: 15,
                padding: "13px 16px",
                borderRadius: 50,
                border: "none",
                cursor: googleLoading ? "not-allowed" : "pointer",
                opacity: googleLoading ? 0.7 : 1,
                boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
                marginBottom: 20,
              }}
            >
              {/* Google G logo */}
              <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              {googleLoading ? "Redirecting…" : "Continue with Google"}
            </button>

            {/* ─── Divider ─────────────────────────────────────────────────────────────────────────────── */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.12)" }} />
              <span style={{ color: "rgba(160,185,255,0.5)", fontSize: 13 }}>or sign in with email</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.12)" }} />
            </div>

            {/* ─── Email + password ────────────────────────────────────────────────────────────────── */}
            <form onSubmit={handleSubmit}>
              {error && (
                <div
                  style={{
                    background: "rgba(217,79,79,0.18)", border: "1px solid rgba(217,79,79,0.4)",
                    color: "#ff8f8f", borderRadius: 10, padding: "12px 16px",
                    fontSize: 14, marginBottom: 20,
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", color: "rgba(200,215,255,0.8)", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  Email
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 10, padding: "12px 14px",
                    color: "#fff", fontSize: 15, outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: 28 }}>
                <label style={{ display: "block", color: "rgba(200,215,255,0.8)", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 10, padding: "12px 14px",
                    color: "#fff", fontSize: 15, outline: "none",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  background: loading
                    ? "rgba(74,127,220,0.5)"
                    : "linear-gradient(160deg, #4a7ee0 0%, #2e5ec8 100%)",
                  color: "#fff", fontWeight: 700, fontSize: 16,
                  padding: "14px", borderRadius: 50, border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 20px rgba(46,94,200,0.45)",
                  letterSpacing: "-0.2px",
                }}
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: 14, color: "rgba(160,185,255,0.6)", marginTop: 24, marginBottom: 0 }}>
              No account?{" "}
              <Link href="/register" style={{ color: "rgba(120,170,255,0.9)", fontWeight: 600, textDecoration: "none" }}>
                Get started free
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
