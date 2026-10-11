"use client";

// 2026-10-11: Trips — list + new trip (lib/trips.ts).
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import HamburgerMenu from "@/components/HamburgerMenu";
import Avatar from "@/components/Avatar";
import { useI18n } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcBack() { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6"/></svg>; }
const KINDS = ["BEACH", "SKI", "CITY", "CUP", "OTHER"] as const;

type Person = { id: string; name: string; role: string };
type Trip = { id: string; name: string; destination: string | null; startYmd: string; endYmd: string; kind: string; packTotal: number; packed: number; todosLeft: number; daysTo: number };
type Data = { trips: Trip[]; isAdult: boolean; people: Person[]; me: string };

const card = { background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" };
const inputStyle = { width: "100%", boxSizing: "border-box" as const, padding: "11px 12px", borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--fg)", fontSize: 14, fontFamily: FONT };
const label = { display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted)", margin: "12px 0 6px" };
const sectionTitle = { fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em", margin: "0 2px 10px" };

export default function TripsPage() {
  const { status } = useSession();
  const router = useRouter();
  const { m, dateLocale, err } = useI18n();
  const t = m.trips;
  const [data, setData] = useState<Data | null>(null);
  const [draft, setDraft] = useState<{ name: string; destination: string; startYmd: string; endYmd: string; kind: string; travellers: string[]; vaccine: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  useEffect(() => { if (status === "authenticated") load(); }, [status]);
  async function load() {
    const r = await fetch("/api/trips");
    if (r.ok) setData(await r.json());
  }
  async function create() {
    if (!draft) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/trips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(err(d.error)); return; }
      router.push(`/dashboard/trips/${d.id}`);
    } finally { setBusy(false); }
  }

  const range = (a: string, b: string) => {
    const f = (ymd: string) => new Date(ymd + "T12:00:00Z").toLocaleDateString(dateLocale, { day: "numeric", month: "short", timeZone: "UTC" });
    return `${f(a)} – ${f(b)}`;
  };
  const when = (tr: Trip) => tr.daysTo > 0 || tr.daysTo === 0 ? t.inDays(tr.daysTo) : tr.endYmd >= new Date().toISOString().slice(0, 10) ? t.ongoing : t.done;
  const upcoming = data?.trips.filter((x) => x.endYmd >= new Date().toISOString().slice(0, 10)) ?? [];
  const past = data?.trips.filter((x) => x.endYmd < new Date().toISOString().slice(0, 10)).reverse() ?? [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT }}>
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push("/dashboard")} aria-label={m.common.back} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-2)", display: "flex", padding: 4 }}><IcBack /></button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)", margin: 0, flex: 1 }}>🧳 {t.title}</h1>
          <HamburgerMenu />
        </div>
      </div>
      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "20px 20px 40px" }}>
        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, margin: "0 0 18px" }}>{t.intro}</p>

        {data?.isAdult && !draft && (
          <button type="button" onClick={() => { const s = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10); setDraft({ name: "", destination: "", startYmd: s, endYmd: new Date(Date.parse(s) + 7 * 86400000).toISOString().slice(0, 10), kind: "BEACH", travellers: data.people.map((p) => p.id), vaccine: false }); }}
            style={{ width: "100%", border: "none", borderRadius: 14, padding: "14px", background: "var(--accent-bg)", color: "var(--on-accent)", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: FONT, marginBottom: 22 }}>
            + {t.newTrip}
          </button>
        )}

        {draft && data && (
          <div style={{ ...card, padding: 16, marginBottom: 22 }}>
            <label style={{ ...label, marginTop: 0 }} htmlFor="tr-name">{t.name}</label>
            <input id="tr-name" style={inputStyle} value={draft.name} maxLength={80} placeholder={t.namePlaceholder} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <label style={label} htmlFor="tr-dest">{t.destination}</label>
            <input id="tr-dest" style={inputStyle} value={draft.destination} maxLength={80} placeholder={t.destinationPlaceholder} onChange={(e) => setDraft({ ...draft, destination: e.target.value })} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={label} htmlFor="tr-from">{t.from}</label><input id="tr-from" type="date" style={inputStyle} value={draft.startYmd} onChange={(e) => setDraft({ ...draft, startYmd: e.target.value, endYmd: draft.endYmd < e.target.value ? e.target.value : draft.endYmd })} /></div>
              <div><label style={label} htmlFor="tr-to">{t.to}</label><input id="tr-to" type="date" style={inputStyle} value={draft.endYmd} min={draft.startYmd} onChange={(e) => setDraft({ ...draft, endYmd: e.target.value })} /></div>
            </div>
            <span style={label}>{t.kind}</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {KINDS.map((k) => (
                <button key={k} type="button" onClick={() => setDraft({ ...draft, kind: k })} aria-pressed={draft.kind === k}
                  style={{ padding: "8px 12px", borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT, border: draft.kind === k ? "1.5px solid var(--accent)" : "1.5px solid var(--border)", background: draft.kind === k ? "var(--tint-accent)" : "var(--surface)", color: draft.kind === k ? "var(--accent-strong)" : "var(--fg-2)" }}>
                  {t.kinds[k]}
                </button>
              ))}
            </div>
            <span style={label}>{t.who}</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {data.people.map((p) => {
                const on = draft.travellers.includes(p.id);
                return (
                  <button key={p.id} type="button" aria-pressed={on} onClick={() => setDraft({ ...draft, travellers: on ? draft.travellers.filter((x) => x !== p.id) : [...draft.travellers, p.id] })}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px 5px 5px", borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT, border: on ? "1.5px solid var(--accent)" : "1.5px solid var(--border)", background: on ? "var(--tint-accent)" : "var(--surface)", color: on ? "var(--accent-strong)" : "var(--muted)", opacity: on ? 1 : 0.7 }}>
                    <Avatar userId={p.id} name={p.name} size={24} /> {p.name}
                  </button>
                );
              })}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, fontSize: 14, color: "var(--fg)", cursor: "pointer" }}>
              <input type="checkbox" checked={draft.vaccine} onChange={(e) => setDraft({ ...draft, vaccine: e.target.checked })} style={{ width: 20, height: 20, accentColor: "var(--accent)" }} /> 💉 {t.vaccine}
            </label>
            {error && <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 700, marginTop: 10 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button type="button" onClick={create} disabled={busy || !draft.name.trim()} style={{ flex: 1, border: "none", borderRadius: 12, padding: "12px", background: "var(--accent-bg)", color: "var(--on-accent)", fontSize: 14.5, fontWeight: 800, cursor: "pointer", fontFamily: FONT, opacity: busy || !draft.name.trim() ? 0.5 : 1 }}>{busy ? t.creating : t.create}</button>
              <button type="button" onClick={() => setDraft(null)} style={{ border: "none", borderRadius: 12, padding: "12px 14px", background: "var(--surface-3)", color: "var(--fg-2)", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>{t.cancel}</button>
            </div>
          </div>
        )}

        {data && data.trips.length === 0 && !draft && <div style={{ ...card, padding: 18, fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>{t.none}</div>}

        {[{ title: t.upcoming, list: upcoming }, { title: t.past, list: past }].filter((g) => g.list.length).map((g) => (
          <section key={g.title} style={{ marginBottom: 24 }}>
            <h2 style={sectionTitle}>{g.title}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {g.list.map((tr) => (
                <Link key={tr.id} href={`/dashboard/trips/${tr.id}`} style={{ ...card, padding: "14px 16px", textDecoration: "none", display: "block" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "var(--fg)" }}>{(t.kinds[tr.kind] ?? "🧳").split(" ")[0]} {tr.name}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: tr.daysTo <= 7 && tr.daysTo >= 0 ? "var(--accent)" : "var(--muted)", flexShrink: 0 }}>{when(tr)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{[tr.destination, range(tr.startYmd, tr.endYmd)].filter(Boolean).join(" · ")}</div>
                  {tr.packTotal > 0 && tr.daysTo >= 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ height: 6, borderRadius: 3, background: "var(--surface-3)", overflow: "hidden" }}>
                        <div style={{ width: `${Math.round((tr.packed / tr.packTotal) * 100)}%`, height: "100%", background: "var(--success)" }} />
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 5 }}>{t.packedOf(tr.packed, tr.packTotal)}</div>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
