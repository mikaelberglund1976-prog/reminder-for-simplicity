"use client";
import Link from "next/link";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAFAF8",
        display: "flex",
        flexDirection: "column",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          padding: "24px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
          <span style={{ fontSize: 22 }}>&#x1F514;</span>
          <span
            style={{
              color: "#111827",
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: "-0.3px",
            }}
          >
            AssistIQ
          </span>
        </div>

        <Link
          href="/login"
          style={{
            color: "#6B7280",
            fontSize: 15,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Log in
        </Link>
      </nav>

      {/* Hero */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 24px 100px",
        }}
      >
        {/* Eyebrow badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#F3F4F6",
            border: "1px solid #E5E7EB",
            borderRadius: 99,
            padding: "6px 14px",
            fontSize: 13,
            color: "#6B7280",
            fontWeight: 500,
            marginBottom: 32,
            letterSpacing: "0.01em",
          }}
        >
          <span style={{ color: "#9CA3AF", fontSize: 11 }}>&#x2736;</span>
          Smart reminders, delivered to your inbox
        </div>

        <h1
          style={{
            color: "#111827",
            fontWeight: 800,
            fontSize: "clamp(32px, 5.5vw, 58px)",
            lineHeight: 1.1,
            letterSpacing: "-1.5px",
            marginBottom: 20,
            maxWidth: 640,
          }}
        >
          Never forget what matters.
        </h1>

        <p
          style={{
            color: "#6B7280",
            fontSize: "clamp(15px, 2vw, 18px)",
            lineHeight: 1.6,
            maxWidth: 460,
            marginBottom: 48,
          }}
        >
          Subscriptions, renewals, birthdays, everyday commitments — AssistIQ
          keeps you on top of it all with timely email reminders.
        </p>

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Link
            href="/register"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#111827",
              color: "#FFFFFF",
              fontWeight: 600,
              fontSize: 16,
              padding: "15px 32px",
              borderRadius: 12,
              textDecoration: "none",
              letterSpacing: "-0.1px",
            }}
          >
            Get started free
          </Link>

          <Link
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#FFFFFF",
              color: "#374151",
              fontWeight: 600,
              fontSize: 16,
              padding: "15px 32px",
              borderRadius: 12,
              textDecoration: "none",
              border: "1.5px solid #E5E7EB",
              letterSpacing: "-0.1px",
            }}
          >
            Log in
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          textAlign: "center",
          paddingBottom: 36,
          color: "#D1D5DB",
          fontSize: 13,
        }}
      >
        by Berget &amp; Fredde
      </footer>
    </div>
  );
}
