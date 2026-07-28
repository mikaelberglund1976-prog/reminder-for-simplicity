"use client";
import Link from "next/link";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

export default function Home() {
  return (
    <div style={{
      minHeight: "100vh", background: "#F5F4F0",
      display: "flex", flexDirection: "column",
      fontFamily: FONT, overflowX: "hidden",
    }}>

      {/* ── Hero ── */}
      <main style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", textAlign: "center",
        padding: "64px 24px 0",
      }}>

        {/* Title */}
        <h1 style={{
          fontSize: "clamp(34px, 8vw, 48px)", fontWeight: 800,
          color: "#1C1C28", lineHeight: 1.15, letterSpacing: "-1px",
          margin: "0 0 16px", maxWidth: 400,
        }}>
          Everything your family needs to{" "}
          <span style={{ color: "#4A5FD5" }}>remember, buy, and want</span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 16, color: "#7C7C8A", lineHeight: 1.6,
          maxWidth: 360, margin: "0 0 20px",
        }}>
          Bills and birthdays, a shared shopping list, and wishlists the kids control — all in one calm place, not five different apps.
        </p>

        {/* Feature pills — proof this is more than a reminder app */}
        <div style={{
          display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center",
          margin: "0 0 40px",
        }}>
          {[
            { icon: "🔔", label: "Reminders" },
            { icon: "🛒", label: "Shopping list" },
            { icon: "🎁", label: "Wishlists" },
          ].map(p => (
            <span key={p.label} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "#fff", border: "1px solid #E4E3DE", borderRadius: 50,
              padding: "7px 14px", fontSize: 13, fontWeight: 600, color: "#1C1C28",
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
            background: "radial-gradient(ellipse at center, #E4E7FB 0%, transparent 70%)",
            zIndex: 0,
          }} />

          {/* Phone shell */}
          <div style={{
            position: "relative", zIndex: 1,
            width: 230, height: 400,
            margin: "0 auto",
            background: "#1C1C28",
            borderRadius: 40,
            padding: 3,
            boxShadow: "0 30px 80px rgba(26,35,64,0.22), 0 8px 24px rgba(26,35,64,0.12)",
          }}>
            {/* Screen */}
            <div style={{
              width: "100%", height: "100%",
              background: "#fff",
              borderRadius: 38,
              overflow: "hidden",
              display: "flex", flexDirection: "column",
            }}>
              {/* Status bar */}
              <div style={{
                background: "#fff", padding: "10px 16px 6px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#1C1C28" }}>14:18</span>
                <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                  <div style={{ width: 12, height: 8, borderRadius: 2, background: "#1C1C28" }} />
                  <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#1C1C28" }} />
                  <div style={{ width: 14, height: 8, border: "1.5px solid #1C1C28", borderRadius: 2, position: "relative" }}>
                    <div style={{ position: "absolute", left: 2, top: 1, bottom: 1, width: "60%", background: "#1C1C28", borderRadius: 1 }} />
                  </div>
                </div>
              </div>

              {/* Notch */}
              <div style={{
                width: 80, height: 18, background: "#1C1C28",
                borderRadius: "0 0 16px 16px", margin: "0 auto 12px",
              }} />

              {/* Notification cards */}
              <div style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: 8 }}>

                {/* Julia Birthday */}
                <div style={{
                  background: "#fff", borderRadius: 14, padding: "10px 12px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: "#FFE8F5", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18,
                  }}>🎂</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#1C1C28" }}>Julias Birthday</div>
                    <div style={{ fontSize: 10, color: "#7C7C8A" }}>Tomorrow</div>
                  </div>
                  <div style={{ fontSize: 9, color: "#4A5FD5", fontWeight: 600 }}>Tomorrow</div>
                </div>

                {/* Shopping list */}
                <div style={{
                  background: "#fff", borderRadius: 14, padding: "10px 12px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: "#D4F4E6", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18,
                  }}>🛒</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#1C1C28" }}>Shopping list</div>
                    <div style={{ fontSize: 10, color: "#7C7C8A" }}>Milk, eggs +3 more</div>
                  </div>
                  <div style={{ fontSize: 9, color: "#2A9D6F", fontWeight: 600 }}>2 bought</div>
                </div>

                {/* Wishlist */}
                <div style={{
                  background: "#fff", borderRadius: 14, padding: "10px 12px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: "#EDEBFB", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18,
                  }}>🎁</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#1C1C28" }}>Emma's wishlist</div>
                    <div style={{ fontSize: 10, color: "#7C7C8A" }}>Added: LEGO set</div>
                  </div>
                  <div style={{ fontSize: 9, color: "#5B4FCF", fontWeight: 600 }}>New</div>
                </div>

              </div>
            </div>
          </div>

          {/* Floating decoration — gift/wishlist */}
          <div style={{
            position: "absolute", top: 40, left: -10, zIndex: 2,
            width: 44, height: 44, borderRadius: 14,
            background: "linear-gradient(135deg, #EDEBFB, #E4E7FB)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(91,79,207,0.2)",
            fontSize: 20,
          }}>🎁</div>

          {/* Floating decoration — shopping cart */}
          <div style={{
            position: "absolute", top: 30, right: -10, zIndex: 2,
            width: 44, height: 44, borderRadius: 14,
            background: "linear-gradient(135deg, #D4F4E6, #E4E7FB)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(42,157,111,0.2)",
            fontSize: 20,
          }}>🛒</div>

          {/* Floating decoration — reminder bell */}
          <div style={{
            position: "absolute", bottom: 80, right: -14, zIndex: 2,
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg, #FFF0E0, #FFE8D4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 14px rgba(229,135,58,0.2)",
            fontSize: 18,
          }}>🔔</div>

        </div>
      </main>

      {/* ── Bottom buttons ── */}
      <div style={{
        padding: "32px 24px 48px",
        display: "flex", gap: 12, maxWidth: "var(--content-max-width)", margin: "0 auto", width: "100%",
        boxSizing: "border-box",
      }}>
        <Link href="/register" style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "17px", borderRadius: 50,
          background: "#E4E3DE", border: "none",
          fontSize: 16, fontWeight: 600, color: "#1C1C28",
          textDecoration: "none",
        }}>
          Get started free
        </Link>
        <Link href="/features" style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "17px", borderRadius: 50,
          background: "#fff", border: "1.5px solid #E4E3DE",
          fontSize: 16, fontWeight: 600, color: "#1C1C28",
          textDecoration: "none",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          See how it works
        </Link>
      </div>

    </div>
  );
}
