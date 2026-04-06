"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";

function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function drawStars(ctx: CanvasRenderingContext2D, w: number, h: number) {
      ctx.clearRect(0, 0, w, h);
      let seed = 42;
      function rand() {
        seed = (seed * 16807 + 0) % 2147483647;
        return (seed - 1) / 2147483646;
      }
      // Small dim stars
      for (let i = 0; i < 220; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const r = rand() * 1.2 + 0.3;
        const opacity = rand() * 0.6 + 0.2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${opacity.toFixed(2)})`;
        ctx.fill();
      }
      // Larger bright stars
      seed = 99;
      for (let i = 0; i < 20; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const r = rand() * 1.0 + 1.2;
        const opacity = rand() * 0.4 + 0.55;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210,225,255,${opacity.toFixed(2)})`;
        ctx.fill();
      }
    }

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawStars(ctx, canvas.width, canvas.height);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at 60% 25%, #1e3f8a 0%, #0e2268 28%, #070f3c 60%, #030820 100%)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <StarField />

      {/* Nav */}
      <nav
        style={{
          position: "relative",
          zIndex: 10,
          padding: "28px 36px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.13)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 17,
            }}
          >
            🔔
          </div>
          <span
            style={{
              color: "#ffffff",
              fontWeight: 700,
              fontSize: 20,
              letterSpacing: "-0.3px",
            }}
          >
            AssistIQ
          </span>
        </div>
      </nav>

      {/* Hero */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 24px 80px",
        }}
      >
        <h1
          style={{
            color: "#ffffff",
            fontWeight: 800,
            fontSize: "clamp(30px, 5vw, 56px)",
            lineHeight: 1.12,
            letterSpacing: "-1px",
            marginBottom: 22,
            maxWidth: 680,
          }}
        >
          Never forget what matters.
        </h1>

        <p
          style={{
            color: "rgba(185,205,255,0.88)",
            fontSize: "clamp(15px, 2vw, 18px)",
            lineHeight: 1.65,
            maxWidth: 560,
            marginBottom: 14,
          }}
        >
          AssistIQ helps you remember the things that are easy to miss but
          important to keep on top of — subscriptions, renewals, birthdays, and
          everyday commitments.
        </p>

        <p
          style={{
            color: "rgba(160,185,255,0.60)",
            fontSize: "clamp(13px, 1.5vw, 16px)",
            marginBottom: 52,
          }}
        >
          Simple reminders. Clear timing. Delivered straight to your inbox.
        </p>

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {/* Create account */}
          <Link
            href="/register"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "linear-gradient(160deg, #4a7ee0 0%, #2e5ec8 100%)",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: 17,
              padding: "17px 40px",
              borderRadius: 50,
              textDecoration: "none",
              boxShadow: "0 4px 26px rgba(46,94,200,0.50)",
              letterSpacing: "-0.2px",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.9 }}>
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
            Create account
          </Link>

          {/* Log in */}
          <Link
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "linear-gradient(160deg, #1e3875 0%, #111e55 100%)",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: 17,
              padding: "17px 40px",
              borderRadius: 50,
              textDecoration: "none",
              border: "1.5px solid rgba(255,255,255,0.14)",
              boxShadow: "0 4px 18px rgba(0,0,0,0.35)",
              letterSpacing: "-0.2px",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.9 }}>
              <path d="M18 8h-1V6c0-2.8-2.2-5-5-5S7 3.2 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.7 1.4-3.1 3.1-3.1 1.7 0 3.1 1.4 3.1 3.1v2z" />
            </svg>
            Log in
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          position: "relative",
          zIndex: 10,
          textAlign: "center",
          paddingBottom: 36,
          color: "rgba(140,165,220,0.45)",
          fontSize: 14,
        }}
      >
        by Berget &amp; Fredde
      </footer>
    </div>
  );
}
