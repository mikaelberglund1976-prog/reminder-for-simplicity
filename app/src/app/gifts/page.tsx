"use client";

// 2026-10-09: wishlists shared with me as a relative (lib/wishlistGuests.ts).
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useI18n } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
type Item = { id: string; name: string; url: string | null; price: number | null; currency: string | null; imageUrl: string | null; note: string | null; status: "WANTED" | "RESERVED" | "PURCHASED"; mine: boolean };
type Share = { id: string; childName: string; familyName: string | null; paused: boolean; items: Item[] };

export default function GiftsPage() {
  const { status } = useSession();
  const router = useRouter();
  const { m, err } = useI18n();
  const t = m.gifts;
  const [shares, setShares] = useState<Share[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/gifts");
    const d = await res.json().catch(() => ({}));
    setShares(d.shares ?? []);
  }
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/gifts");
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function act(id: string, action: "reserve" | "unreserve" | "bought") {
    setBusy(id); setError(null);
    try {
      const res = await fetch(`/api/gifts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ? err(d.error) : m.common.somethingWentWrong); }
      await load();
    } finally { setBusy(null); }
  }

  const btn = { border: "none", borderRadius: 50, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT } as const;

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT }}>
      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "28px 20px 40px" }}>
        <Link href="/dashboard" style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>← {m.common.back}</Link>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--fg)", margin: "12px 0 6px", letterSpacing: "-0.5px" }}>🎁 {t.title}</h1>
        <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.55, margin: "0 0 20px" }}>{t.intro}</p>
        {error && <div style={{ fontSize: 13, color: "var(--danger)", marginBottom: 12 }}>{error}</div>}
        {shares && shares.length === 0 && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 16, fontSize: 14, color: "var(--fg-2)", lineHeight: 1.5 }}>{t.empty}</div>
        )}
        {shares?.map((s) => (
          <section key={s.id} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)", margin: "0 0 10px" }}>{s.childName}{s.familyName ? <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}> · {s.familyName}</span> : null}</h2>
            {s.paused ? (
              <div style={{ fontSize: 13, color: "var(--muted)" }}>{t.paused}</div>
            ) : s.items.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--muted)" }}>{t.noWishes}</div>
            ) : (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden" }}>
                {s.items.map((it, i) => (
                  <div key={it.id} style={{ display: "flex", gap: 12, padding: "12px 14px", borderTop: i === 0 ? "none" : "1px solid var(--border-soft)", opacity: it.status !== "WANTED" && !it.mine ? 0.5 : 1 }}>
                    {it.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.imageUrl} alt="" style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)" }}>{it.name}</div>
                      <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
                        {it.price != null ? `${it.price} ${it.currency ?? ""}` : ""}
                        {it.url && <>{it.price != null ? " · " : ""}<a href={it.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontWeight: 700 }}>{t.open}</a></>}
                      </div>
                      {it.note && <div style={{ fontSize: 12.5, color: "var(--fg-2)", marginTop: 4 }}>{it.note}</div>}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
                        {it.status === "WANTED" && (
                          <>
                            <button disabled={busy === it.id} onClick={() => act(it.id, "reserve")} style={{ ...btn, background: "var(--ink)", color: "#fff" }}>{t.reserve}</button>
                            <button disabled={busy === it.id} onClick={() => act(it.id, "bought")} style={{ ...btn, background: "var(--surface-3)", color: "var(--fg-2)" }}>{t.bought}</button>
                          </>
                        )}
                        {it.status !== "WANTED" && it.mine && (
                          <>
                            <span style={{ fontSize: 12.5, fontWeight: 800, color: it.status === "PURCHASED" ? "var(--success)" : "var(--warning)" }}>✓ {it.status === "PURCHASED" ? t.boughtByYou : t.reservedByYou}</span>
                            {it.status === "RESERVED" && <button disabled={busy === it.id} onClick={() => act(it.id, "bought")} style={{ ...btn, background: "var(--surface-3)", color: "var(--fg-2)" }}>{t.bought}</button>}
                            <button disabled={busy === it.id} onClick={() => act(it.id, "unreserve")} style={{ ...btn, background: "none", color: "var(--muted)", padding: "8px 4px" }}>{t.unreserve}</button>
                          </>
                        )}
                        {it.status !== "WANTED" && !it.mine && <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--muted)" }}>{t.taken}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </main>
    </div>
  );
}
