"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const { m: msg, err } = useI18n();
  const t = msg.auth;

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
        setError(data.error ? err(data.error) : t.tryAgain);
      } else {
        setSent(true);
      }
    } catch {
      setError(t.tryAgain);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "var(--background)",
      fontFamily: FONT, display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>

      <main style={{ flex: 1, maxWidth: "var(--content-max-width)", width: "100%", margin: "0 auto", padding: "60px 28px 0" }}>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "var(--fg)", margin: 0, letterSpacing: "-0.5px" }}>
            {t.resetTitle}
          </h1>
          <p style={{ fontSize: 15, color: "var(--fg-2)", margin: "8px 0 0" }}>
            {t.resetIntro}
          </p>
        </div>

        {error && (
          <div style={{
            background: "var(--tint-danger)", border: "1px solid var(--border-danger)", color: "var(--danger)",
            borderRadius: 12, padding: "12px 16px", fontSize: 14, marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        {sent ? (
          <div style={{
            background: "var(--tint-success)", border: "1px solid var(--tint-success)", color: "var(--success)",
            borderRadius: 12, padding: "16px", fontSize: 14, lineHeight: 1.6,
          }}>
            {t.resetSent1}<strong>{email}</strong>{t.resetSent2}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 24 }}>
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
              {loading ? msg.common.sending : t.sendResetLink}
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", fontSize: 14, color: "var(--fg-2)", marginTop: 24 }}>
          <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
            {t.backToLogin}
          </Link>
        </p>

      </main>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, pointerEvents: "none", lineHeight: 0 }}>
        <svg viewBox="0 0 480 180" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", display: "block" }}>
          <ellipse cx="340" cy="200" rx="260" ry="130" fill="var(--tint-accent)" opacity="0.45" />
          <ellipse cx="180" cy="220" rx="220" ry="110" fill="var(--tint-accent)" opacity="0.5" />
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
