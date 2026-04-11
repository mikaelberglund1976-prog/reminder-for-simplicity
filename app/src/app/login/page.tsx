"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
    <div style={{ minHeight: "100vh", background: "#FAFAF8", display: "flex", flexDirection: "column", fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif" }}>
      <nav style={{ padding: "24px 40px" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
          <span style={{ fontSize: 22 }}>&#x1F514;</span>
          <span style={{ color: "#111827", fontWeight: 700, fontSize: 18, letterSpacing: "-0.3px" }}>AssistIQ</span>
        </Link>
      </nav>
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px 80px" }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h1 style={{ color: "#111827", fontWeight: 800, fontSize: 28, letterSpacing: "-0.5px", margin: 0 }}>Welcome back</h1>
            <p style={{ color: "#9CA3AF", marginTop: 6, fontSize: 15 }}>Log in to your account</p>
          </div>
          <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 16, padding: "28px 28px" }}>
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              style={{ width: "100%", padding: "10px 16px", border: "1px solid #E5E7EB", borderRadius: 10, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 15, fontWeight: 500, color: "#374151", marginBottom: 20 }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
              {googleLoading ? "Signing in..." : "Continue with Google"}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
              <span style={{ color: "#9CA3AF", fontSize: 13 }}>or</span>
              <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
            </div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {error && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", color: "#DC2626", fontSize: 14 }}>
                  {error}
                </div>
              )}
              <div>
                <label style={{ display: "block", color: "#374151", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", color: "#374151", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{ width: "100%", padding: "11px 16px", background: "#111827", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 4 }}
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
            <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#6B7280" }}>
              Don't have an account?{" "}
              <Link href="/register" style={{ color: "#111827", fontWeight: 600, textDecoration: "none" }}>
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
