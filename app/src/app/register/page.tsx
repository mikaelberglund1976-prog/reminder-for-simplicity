"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

const inputStyle: React.CSSProperties = {
  width: "100%", background: "#fff", border: "1.5px solid #E8EDF4",
  borderRadius: 14, padding: "13px 16px", fontSize: 15, color: "#1A2340",
  outline: "none", fontFamily: FONT, boxSizing: "border-box",
  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError("");
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    if (result?.error) {
      router.push("/login");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F5F6FA", fontFamily: FONT, display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ maxWidth: 400, width: "100%", margin: "0 auto" }}>

        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 28 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#1A2340", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔔</div>
            <span style={{ fontWeight: 700, fontSize: 16, color: "#1A2340" }}>AssistIQ</span>
          </Link>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1A2340", margin: 0, letterSpacing: "-0.5px" }}>
            Create your account
          </h1>
          <p style={{ fontSize: 14, color: "#8B90A4", margin: "6px 0 0" }}>Free. Takes 30 seconds.</p>
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            background: "#fff", border: "1.5px solid #E8EDF4", borderRadius: 50,
            padding: "14px 20px", fontSize: 15, fontWeight: 600, color: "#1A2340",
            cursor: googleLoading ? "not-allowed" : "pointer",
            opacity: googleLoading ? 0.7 : 1, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            fontFamily: FONT, marginBottom: 20, boxSizing: "border-box",
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
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "#E8EDF4" }} />
          <span style={{ fontSize: 13, color: "#B0B7C8", fontWeight: 500 }}>or sign up with email</span>
          <div style={{ flex: 1, height: 1, background: "#E8EDF4" }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: "#FFF0F0", border: "1px solid #F5CCCC", color: "#D94F4F", borderRadius: 12, padding: "12px 16px", fontSize: 14, marginBottom: 20 }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2340", marginBottom: 8 }}>Full name</div>
            <input
              type="text"
              placeholder="Mikael Berglund"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2340", marginBottom: 8 }}>Email</div>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2340", marginBottom: 8 }}>Password</div>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
                style={{ ...inputStyle, paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#8B90A4", padding: 0, display: "flex" }}
              >
                {showPassword ? (
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "17px", borderRadius: 50,
              background: "#1A2340", border: "none",
              fontSize: 16, fontWeight: 600, color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: FONT, opacity: loading ? 0.7 : 1,
              boxShadow: "0 2px 10px rgba(26,35,64,0.2)",
              boxSizing: "border-box",
            }}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 14, color: "#8B90A4", marginTop: 24 }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#5B9CF5", fontWeight: 600, textDecoration: "none" }}>
            Log in
          </Link>
        </p>

        {/* Decorative ellipses */}
        <div style={{ position: "fixed", bottom: -60, left: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(91,156,245,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "fixed", bottom: -40, right: -80, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(91,156,245,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      </div>
    </div>
  );
}
