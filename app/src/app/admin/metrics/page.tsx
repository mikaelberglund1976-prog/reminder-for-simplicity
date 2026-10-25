"use client";

// 2026-10-25 (masterbrief §38–39, Etapp 0 G7) — /admin/metrics: the brief's
// product metrics on one page. Counts only — no person or family is shown.
// Definitions: /api/admin/metrics and OPERATIONS.md §1d.
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ADMIN_EMAIL } from "@/lib/adminConfig";

type Pct = number | null;
type Metrics = {
  since: string | null;
  households: number;
  activeHouseholds7d: number;
  coordinated7d: number;
  retentionD7: { cohort: number; kept: number; pct: Pct };
  retentionD30: { cohort: number; kept: number; pct: Pct };
  connectedSourceRate: { n: number; pct: Pct };
  secondAdultRate: { n: number; pct: Pct };
  childActivation: { n: number; of: number; pct: Pct };
  automaticShare30d: { imported: number; manual: number; pct: Pct };
  correctionRate30d: { corrected: number; moved: number; edited: number; hidden: number; added: number; pct: Pct };
  syncSuccess30d: { ok: number; total: number; pct: Pct };
  notificationAction30d: { sent: number; opened: number; pct: Pct };
  events30d: { event: string; n: number }[];
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const pct = (p: Pct) => (p === null ? "–" : `${p.toString().replace(".", ",")} %`);

function Tile({ label, value, sub, star }: { label: string; value: string; sub: string; star?: boolean }) {
  return (
    <div style={{ background: "var(--surface)", border: star ? "1.5px solid var(--accent)" : "1px solid var(--border)", borderRadius: 16, padding: "14px 16px", minWidth: 0 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--muted)" }}>{star ? "★ " : ""}{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "var(--fg)", margin: "4px 0 2px", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>{sub}</div>
    </div>
  );
}

export default function AdminMetricsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [m, setM] = useState<Metrics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session?.user?.email !== ADMIN_EMAIL) router.push("/dashboard");
    if (status === "authenticated" && session?.user?.email === ADMIN_EMAIL) {
      fetch("/api/admin/metrics").then(async (r) => {
        if (!r.ok) { setError("Kunde inte räkna fram nyckeltalen."); return; }
        setM(await r.json());
      }).catch(() => setError("Nätverksfel."));
    }
  }, [status, session, router]);

  return (
    <main style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT, padding: "20px 16px 60px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <Link href="/admin" style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>← Admin</Link>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--fg)", margin: "10px 0 4px" }}>Nyckeltal</h1>
        <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "0 0 18px", lineHeight: 1.5 }}>
          Masterbriefens mått (§38–39). Bara antal – ingen person eller familj visas.
          {m?.since ? ` Händelser räknas från ${new Date(m.since).toLocaleDateString("sv-SE")}.` : " Händelser räknas från första inloggningen efter 25 okt 2026."}
        </p>
        {error && <div style={{ color: "var(--danger)", fontSize: 14 }}>{error}</div>}
        {!m && !error && <div style={{ color: "var(--muted)", fontSize: 14 }}>Räknar…</div>}
        {m && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
              <Tile star label="Samordnade hushåll (7 d)" value={String(m.coordinated7d)} sub={`North Star: ≥2 personer i hushållet använde appen. Av ${m.activeHouseholds7d} aktiva hushåll.`} />
              <Tile label="Aktiva hushåll (7 d)" value={String(m.activeHouseholds7d)} sub={`av ${m.households} hushåll totalt`} />
              <Tile label="Kvarhållning D7" value={pct(m.retentionD7.pct)} sub={`${m.retentionD7.kept} av ${m.retentionD7.cohort} hushåll (först sedda för 7–14 d sedan)`} />
              <Tile label="Kvarhållning D30" value={pct(m.retentionD30.pct)} sub={`${m.retentionD30.kept} av ${m.retentionD30.cohort} hushåll (först sedda för 30–60 d sedan)`} />
              <Tile label="Kopplad källa" value={pct(m.connectedSourceRate.pct)} sub={`${m.connectedSourceRate.n} hushåll har minst en skol- eller klubblänk`} />
              <Tile label="Andra vuxen" value={pct(m.secondAdultRate.pct)} sub={`${m.secondAdultRate.n} hushåll har ≥2 vuxna`} />
              <Tile label="Barn aktiva (30 d)" value={pct(m.childActivation.pct)} sub={`${m.childActivation.n} av ${m.childActivation.of} hushåll med barn`} />
              <Tile label="Automatiskt inhämtat (30 d)" value={pct(m.automaticShare30d.pct)} sub={`${m.automaticShare30d.imported} från länkar, ${m.automaticShare30d.manual} för hand`} />
              <Tile label="Rättade importer (30 d)" value={pct(m.correctionRate30d.pct)} sub={`${m.correctionRate30d.corrected} rättade (flyttade ${m.correctionRate30d.moved}, ändrade ${m.correctionRate30d.edited}, borttagna ${m.correctionRate30d.hidden}) av ${m.correctionRate30d.added} nya`} />
              <Tile label="Öppnade notiser (30 d)" value={pct(m.notificationAction30d.pct)} sub={`${m.notificationAction30d.opened} öppnade av ${m.notificationAction30d.sent} skickade`} />
              <Tile label="Lyckade synkar (30 d)" value={pct(m.syncSuccess30d.pct)} sub={`${m.syncSuccess30d.ok} av ${m.syncSuccess30d.total}`} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--fg)", margin: "24px 0 8px" }}>Händelser senaste 30 dagarna</h2>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
              {m.events30d.length === 0 && <div style={{ padding: 14, fontSize: 13.5, color: "var(--muted)" }}>Inga händelser än.</div>}
              {m.events30d.map((e, i) => (
                <div key={e.event} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderTop: i ? "1px solid var(--border-soft)" : "none", fontSize: 13.5 }}>
                  <code style={{ color: "var(--fg)" }}>{e.event}</code>
                  <span style={{ color: "var(--fg-2)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{e.n}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 14, lineHeight: 1.5 }}>
              &quot;Öppnade notiser&quot; räknas från 25 okt 2026 (masterbrief §38 &quot;notification action rate&quot;).
            </p>
          </>
        )}
      </div>
    </main>
  );
}
