"use client";

import { useState } from "react";
import Link from "next/link";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#F5F4F0",
      fontFamily: FONT, display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>

      <main style={{ flex: 1, maxWidth: "var(--content-max-width)", width: "100%", margin: "0 auto", padding: "60px 28px 0" }}>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "#1C1C28", margin: 0, letterSpacing: "-0.5px" }}>
            Reset your password
          </h1>
          <p style={{ fontSize: 15, color: "#4B5563", margin: "8px 0 0" }}>
            Enter your email and we'll send you a reset link.
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

        {sent ? (
          <div style={{
            background: "#D4F4E6", border: "1px solid #A8E6C6", color: "#1E7D52",
            borderRadius: 12, padding: "16px", fontSize: 14, lineHeight: 1.6,
          }}>
            If an account exists for <strong>{email}</strong>, we've sent a password reset link. Check your inbox.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1C1C28", marginBottom: 10 }}>Email</div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "17px", borderRadius: 50,
                background: loading ? "#7C7C8A" : "#1C1C28", border: "none",
                fontSize: 16, fontWeight: 700,
                color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 2px 10px rgba(26,35,64,0.22)",
                fontFamily: FONT, transition: "all 0.15s",
              }}
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", fontSize: 14, color: "#4B5563", marginTop: 24 }}>
          <Link href="/login" style={{ color: "#2563EB", fontWeight: 600, textDecoration: "none" }}>
            Back to log in
          </Link>
        </p>

      </main>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, pointerEvents: "none", lineHeight: 0 }}>
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
  background: "#fff",
  border: "1.5px solid #E4E3DE",
  borderRadius: 14,
  padding: "14px 16px",
  fontSize: 15,
  color: "#1C1C28",
  outline: "none",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
  boxSizing: "border-box" as const,
  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
};
