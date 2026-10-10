"use client";
import Link from "next/link";
import { PRO_PRICE } from "@/lib/plans";
import { useM } from "@/lib/i18n/client";
import { BrandMark, Companion } from "@/components/BrandMark";

// 2026-10-04 (Mikael, phone test item 9): a clear "Log in" (there was only
// "Get started"), copy and pills that match the app as it is now (kids'
// accounts, homework & tests, calendar), and Free/Pro in one line.

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

export default function Home() {
  const m = useM();
  const t = m.landing;
  return (
    <div style={{
      minHeight: "100vh", background: "var(--background)",
      display: "flex", flexDirection: "column",
      fontFamily: FONT, overflowX: "hidden",
    }}>

      {/* ── Top bar with Log in ── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        maxWidth: "var(--content-max-width)", margin: "0 auto", width: "100%",
        padding: "18px 20px 0", boxSizing: "border-box",
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <BrandMark size={30} />
          <span style={{ fontWeight: 700, fontSize: 14.5, color: "var(--fg)" }}>Reminder for Simplicity</span>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          <Link href="/login" style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)", textDecoration: "none", padding: "8px 16px", border: "1.5px solid var(--accent-border)", borderRadius: 50 }}>
            {t.logIn}
          </Link>
        </span>
      </header>

      {/* ── Hero ── */}
      <main style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", textAlign: "center",
        padding: "28px 24px 0",
      }}>

        {/* Companion (2026-10-10, Lotuvi brand test) */}
        <div style={{ marginBottom: 20 }}><Companion size={150} /></div>

        {/* Title */}
        <h1 style={{
          fontSize: "clamp(34px, 8vw, 48px)", fontWeight: 800,
          color: "var(--fg)", lineHeight: 1.15, letterSpacing: "-1px",
          margin: "0 0 16px", maxWidth: 400,
        }}>
          {t.heroA}
          <span style={{ color: "var(--accent)" }}>{t.heroB}</span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 16, color: "var(--muted)", lineHeight: 1.6,
          maxWidth: 380, margin: "0 0 20px",
        }}>
          {t.sub}
        </p>

        {/* Feature pills — proof this is more than a reminder app */}
        <div style={{
          display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center",
          margin: "0 0 40px", maxWidth: 420,
        }}>
          {[
            "🔔", "📅", "🛒", "📚", "🧒", "🎯", "🧹", "🎁",
          ].map((icon, i) => ({ icon, label: t.pills[i] })).map(p => (
            <span key={p.label} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 50,
              padding: "7px 14px", fontSize: 13, fontWeight: 600, color: "var(--fg)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}>
              <span>{p.icon}</span>{p.label}
            </span>
          ))}
        </div>

        {/* ── Phone mockup ── */}
        <div style={{ position: "relative", width: 280, height: 420, margin: "0 auto 0" }}>

          {/* Glow background */}
          <div style={{
            position: "absolute", inset: -40,
            background: "radial-gradient(ellipse at center, var(--tint-accent) 0%, transparent 70%)",
            zIndex: 0,
          }} />

          {/* Phone shell */}
          <div style={{
            position: "relative", zIndex: 1,
            width: 230, height: 400,
            margin: "0 auto",
            background: "var(--ink)",
            borderRadius: 40,
            padding: 3,
            boxShadow: "0 30px 80px rgba(26,35,64,0.22), 0 8px 24px rgba(26,35,64,0.12)",
          }}>
            {/* Screen */}
            <div style={{
              width: "100%", height: "100%",
              background: "var(--surface)",
              borderRadius: 38,
              overflow: "hidden",
              display: "flex", flexDirection: "column",
            }}>
              {/* Status bar */}
              <div style={{
                background: "var(--surface)", padding: "10px 16px 6px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--fg)" }}>14:18</span>
                <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                  <div style={{ width: 12, height: 8, borderRadius: 2, background: "var(--ink)" }} />
                  <div style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--ink)" }} />
                  <div style={{ width: 14, height: 8, border: "1.5px solid var(--fg)", borderRadius: 2, position: "relative" }}>
                    <div style={{ position: "absolute", left: 2, top: 1, bottom: 1, width: "60%", background: "var(--ink)", borderRadius: 1 }} />
                  </div>
                </div>
              </div>

              {/* Notch */}
              <div style={{
                width: 80, height: 18, background: "var(--ink)",
                borderRadius: "0 0 16px 16px", margin: "0 auto 12px",
              }} />

              {/* Notification cards */}
              <div style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: 8 }}>

                {/* Julia Birthday */}
                <div style={{
                  background: "var(--surface)", borderRadius: 14, padding: "10px 12px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: "var(--tint-pink)", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18,
                  }}>🎂</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg)" }}>{t.mock.birthday}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>{t.mock.tomorrow}</div>
                  </div>
                  <div style={{ fontSize: 9, color: "var(--accent)", fontWeight: 600 }}>{t.mock.tomorrow}</div>
                </div>

                {/* Test */}
                <div style={{
                  background: "var(--surface)", borderRadius: 14, padding: "10px 12px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: "var(--tint-danger)", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18,
                  }}>📚</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg)" }}>{t.mock.test}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>{t.mock.testSub}</div>
                  </div>
                  <div style={{ fontSize: 9, color: "var(--danger)", fontWeight: 600 }}>{t.mock.thursday}</div>
                </div>

                {/* Activity */}
                <div style={{
                  background: "var(--surface)", borderRadius: 14, padding: "10px 12px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: "var(--tint-accent)", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18,
                  }}>⚽</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg)" }}>{t.mock.activity}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>{t.mock.activitySub}</div>
                  </div>
                  <div style={{ fontSize: 9, color: "var(--violet)", fontWeight: 600 }}>{t.mock.weekly}</div>
                </div>

              </div>
            </div>
          </div>

          {/* Floating decoration — gift/wishlist */}
          <div style={{
            position: "absolute", top: 40, left: -10, zIndex: 2,
            width: 44, height: 44, borderRadius: 14,
            background: "linear-gradient(135deg, var(--tint-accent), var(--tint-accent))",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(91,79,207,0.2)",
            fontSize: 20,
          }}>🎁</div>

          {/* Floating decoration — shopping cart */}
          <div style={{
            position: "absolute", top: 30, right: -10, zIndex: 2,
            width: 44, height: 44, borderRadius: 14,
            background: "linear-gradient(135deg, var(--tint-success), var(--tint-accent))",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(42,157,111,0.2)",
            fontSize: 20,
          }}>🛒</div>

          {/* Floating decoration — reminder bell */}
          <div style={{
            position: "absolute", bottom: 80, right: -14, zIndex: 2,
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg, var(--tint-warning), var(--tint-warning))",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 14px rgba(229,135,58,0.2)",
            fontSize: 18,
          }}>🔔</div>

        </div>
      </main>

      {/* ── Bottom buttons ── */}
      <div style={{
        padding: "32px 24px 0",
        display: "flex", gap: 12, maxWidth: "var(--content-max-width)", margin: "0 auto", width: "100%",
        boxSizing: "border-box",
      }}>
        <Link href="/register" style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "17px", borderRadius: 50,
          background: "var(--accent-bg)", border: "none",
          fontSize: 16, fontWeight: 700, color: "var(--on-accent)",
          textDecoration: "none", boxShadow: "0 6px 18px var(--accent-shadow)",
        }}>
          {t.getStarted}
        </Link>
        <Link href="/login" style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "17px", borderRadius: 50,
          background: "var(--surface)", border: "1.5px solid var(--border)",
          fontSize: 16, fontWeight: 700, color: "var(--fg)",
          textDecoration: "none",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          {t.logIn}
        </Link>
      </div>
      <div style={{ textAlign: "center", padding: "18px 24px 44px" }}>
        <Link href="/features" style={{ fontSize: 15, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
          {t.seeHow}
        </Link>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "10px auto 0", lineHeight: 1.5, maxWidth: 360 }}>
          {t.freeLine(m.plans.priceText(PRO_PRICE.month, PRO_PRICE.year))}{" "}
          <Link href="/features#plans" style={{ color: "var(--muted)", textDecoration: "underline" }}>{t.compare}</Link>
        </p>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "8px auto 0", lineHeight: 1.5, maxWidth: 360 }}>
          🌐 {t.languages}
        </p>
      </div>

    </div>
  );
}
