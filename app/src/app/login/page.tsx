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
