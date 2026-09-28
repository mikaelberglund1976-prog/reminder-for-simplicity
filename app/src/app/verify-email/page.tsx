"use client";

// 2026-09-27: landing page for the email confirmation link. Two cases:
//  - normal signup (password already chosen) → confirm straight away
//  - account created by a parent (no password yet) → choose a password,
//    which also confirms the email.
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}

function VerifyEmailInner() {
  const token = useSearchParams()?.get("token") ?? "";
  const [state, setState] = useState<"checking" | "password" | "confirming" | "done" | "error">("checking");
  const [error, setError] = useState("");
  const [info, setInfo] = useState<{ email: string; name: string | null; pendingApproval?: boolean } | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  // Guard against the effect running twice (React strict mode / fast
  // re-renders) — the second run would find the token already used.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) { setState("error"); setError("This link is missing its token."); return; }
    (async () => {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, check: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setState("error"); setError(data.error ?? "This link doesn't work."); return; }
      setInfo(data);
      if (data.needsPassword) setState("password");
      else await submit();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function submit(pw?: string) {
    setState((s) => (s === "password" ? s : "confirming"));
    setSaving(true); setError("");
    const res = await fetch("/api/auth/verify-email", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: pw }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      if (!pw) setState("error");
      return;
    }
    setInfo((i) => ({ email: data.email, name: i?.name ?? null, pendingApproval: data.pendingApproval }));
    setState("done");
  }

  function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match."); return; }
    submit(password);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT, display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ maxWidth: 400, width: "100%", margin: "0 auto", textAlign: state === "password" ? "left" : "center" }}>
        {(state === "checking" || state === "confirming") && (
          <p style={{ color: "var(--muted)", fontSize: 15 }}>Confirming your email…</p>
        )}

        {state === "error" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h1 style={titleStyle}>Link not valid</h1>
            <p style={textStyle}>{error}</p>
            <Link href="/login" style={buttonStyle}>Go to login</Link>
          </>
        )}

        {state === "password" && (
          <form onSubmit={handlePassword}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
            <h1 style={titleStyle}>Welcome{info?.name ? `, ${info.name.split(" ")[0]}` : ""}!</h1>
            <p style={textStyle}>Choose a password for <strong>{info?.email}</strong>. You'll use it to log in.</p>
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required style={inputStyle} />
            <input type="password" placeholder="Repeat password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required style={inputStyle} />
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 16px" }}>At least 8 characters, one uppercase letter and one number.</p>
            {error && <div style={{ background: "var(--tint-danger)", border: "1px solid var(--border-danger)", color: "var(--danger)", borderRadius: 12, padding: "12px 16px", fontSize: 14, marginBottom: 16 }}>{error}</div>}
            <button type="submit" disabled={saving} style={{ ...buttonStyle, width: "100%", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving…" : "Save password & continue"}
            </button>
          </form>
        )}

        {state === "done" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h1 style={titleStyle}>Email confirmed</h1>
            <p style={textStyle}>
              {info?.pendingApproval
                ? "Thanks! Your account is still waiting for admin approval — you'll get an email as soon as you can log in."
                : "You're all set. Log in to get started."}
            </p>
            {!info?.pendingApproval && (
              <Link href={`/login?verified=1&email=${encodeURIComponent(info?.email ?? "")}`} style={buttonStyle}>Log in</Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const titleStyle: React.CSSProperties = { fontSize: 24, fontWeight: 700, color: "var(--fg)", margin: "0 0 12px", letterSpacing: "-0.5px" };
const textStyle: React.CSSProperties = { fontSize: 15, color: "var(--muted)", margin: "0 0 24px", lineHeight: 1.6 };
const buttonStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "14px 28px", borderRadius: 50,
  background: "var(--ink)", color: "#fff", fontSize: 15, fontWeight: 600, textDecoration: "none", fontFamily: FONT,
};
const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "14px 16px",
  fontSize: 15, color: "var(--fg)", outline: "none", fontFamily: FONT, boxSizing: "border-box", marginBottom: 12,
};
