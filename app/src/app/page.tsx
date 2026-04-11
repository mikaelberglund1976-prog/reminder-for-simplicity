"use client";
import Link from "next/link";

export default function Home() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#FFFFFF",
      display: "flex",
      flexDirection: "column",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
    }}>
      {/* Nav */}
      <nav style={{
        padding: "24px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
          <span style={{ fontSize: 22 }}>&#x1F514;</span>
          <span style={{ color: "#111827", fontWeight: 700, fontSize: 18, letterSpacing: "-0.3px" }}>
            AssistIQ
          </span>
        </div>
        <Link href="/login" style={{
          color: "#6B7280",
          fontSize: 15,
          fontWeight: 500,
          textDecoration: "none",
        }}>
          Log in
        </Link>
      </nav>

      {/* Hero */}
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        textAlign: "center",
        padding: "40px 24px 60px",
      }}>
        <h1 style={{
          color: "#1A2340",
          fontWeight: 800,
          fontSize: "clamp(32px, 5.5vw, 52px)",
          lineHeight: 1.15,
          letterSpacing: "-1.5px",
          marginBottom: 18,
          maxWidth: 560,
        }}>
          Never{" "}
          <span style={{ color: "#4A80E8" }}>miss</span>
          {" "}what matters.
        </h1>

        <p style={{
          color: "#6B7280",
          fontSize: "clamp(15px, 2vw, 17px)",
          lineHeight: 1.65,
          maxWidth: 420,
          marginBottom: 36,
        }}>
          AssistIQ helps you stay on top of subscriptions, renewals,
          important dates, and other things that matter.
        </p>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 48 }}>
          <Link href="/register" style={{
            display: "inline-flex",
            alignItems: "center",
            background: "#DDE8F8",
            color: "#1A2340",
            fontWeight: 600,
            fontSize: 16,
            padding: "14px 30px",
            borderRadius: 14,
            textDecoration: "none",
            letterSpacing: "-0.1px",
          }}>
            Create account
          </Link>
          <Link href="/login" style={{
            display: "inline-flex",
            alignItems: "center",
            background: "#FFFFFF",
            color: "#374151",
            fontWeight: 600,
            fontSize: 16,
            padding: "14px 30px",
            borderRadius: 14,
            textDecoration: "none",
            border: "1.5px solid #E5E7EB",
            letterSpacing: "-0.1px",
          }}>
            Log in
          </Link>
        </div>

        {/* Phone hero illustration */}
        <div style={{ position: "relative", width: "100%", maxWidth: 340 }}>
          {/* Floating elements behind phone */}
          <div style={{ position: "absolute", left: 0, top: "30%", width: 48, height: 48, background: "#EBF2FC", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(74,128,232,0.12)" }}>
            <span style={{ fontSize: 22 }}>✉️</span>
          </div>
          <div style={{ position: "absolute", right: 0, top: "20%", width: 44, height: 44, background: "#EBF2FC", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(74,128,232,0.12)" }}>
            <span style={{ fontSize: 20 }}>📅</span>
          </div>
          <div style={{ position: "absolute", right: 10, bottom: "25%", width: 40, height: 40, background: "#EBF2FC", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(74,128,232,0.1)" }}>
            <span style={{ fontSize: 18 }}>⏰</span>
          </div>
          <div style={{ position: "absolute", left: 10, bottom: "20%", width: 36, height: 36, background: "#EBF2FC", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(74,128,232,0.1)" }}>
            <span style={{ fontSize: 16 }}>🔔</span>
          </div>

          {/* Phone frame */}
          <div style={{
            margin: "0 auto",
            width: 220,
            background: "#1A2340",
            borderRadius: 32,
            padding: "14px 10px",
            boxShadow: "0 24px 60px rgba(26,35,64,0.25)",
          }}>
            {/* Phone notch */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
              <div style={{ width: 60, height: 6, background: "#2E3D5C", borderRadius: 99 }} />
            </div>
            {/* Phone screen */}
            <div style={{
              background: "#F4F7FC",
              borderRadius: 22,
              padding: "14px 10px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}>
              {/* Card 1 - Birthday */}
              <div style={{
                background: "#FFFFFF",
                borderRadius: 12,
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FFF0E6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🎂</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: "#1A2340", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Julias Birthday</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>Tomorrow</div>
                </div>
                <div style={{ fontSize: 10, color: "#9CA3AF", flexShrink: 0 }}>1d</div>
              </div>

              {/* Card 2 - Netflix */}
              <div style={{
                background: "#FFFFFF",
                borderRadius: 12,
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#E50914", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#fff", fontWeight: 900, fontSize: 14, fontFamily: "Georgia, serif" }}>N</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: "#1A2340" }}>Netflix</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>Renews Tomorrow</div>
                </div>
                <div style={{ fontSize: 10, color: "#9CA3AF", flexShrink: 0 }}>1d</div>
              </div>

              {/* Card 3 - GoDaddy */}
              <div style={{
                background: "#FFFFFF",
                borderRadius: 12,
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1BAA6B", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>G</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: "#1A2340" }}>GoDaddy</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>Expires in 3 days</div>
                </div>
                <div style={{ fontSize: 10, color: "#9CA3AF", flexShrink: 0 }}>3d</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ textAlign: "center", paddingBottom: 32, color: "#D1D5DB", fontSize: 13 }}>
        by Berget &amp; Fredde
      </footer>
    </div>
  );
}
