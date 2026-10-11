"use client";

// 2026-10-11: a trip coming up (within 30 days, or ongoing) on Home — one
// tap to the trip with the countdown and what's left before it.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
type Trip = { id: string; name: string; kind: string; startYmd: string; endYmd: string; daysTo: number; packTotal: number; packed: number; todosLeft: number };

export default function TripSoonCard() {
  const { m } = useI18n();
  const t = m.trips;
  const [trips, setTrips] = useState<Trip[]>([]);
  useEffect(() => {
    fetch("/api/trips").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d?.trips) return;
      const today = new Date().toISOString().slice(0, 10);
      setTrips(d.trips.filter((x: Trip) => x.endYmd >= today && x.daysTo <= 30).slice(0, 2));
    }).catch(() => {});
  }, []);
  if (!trips.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22, fontFamily: FONT }}>
      {trips.map((tr) => (
        <Link key={tr.id} href={`/dashboard/trips/${tr.id}`} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "12px 14px", textDecoration: "none", boxShadow: "var(--shadow)" }}>
          <span aria-hidden style={{ width: 40, height: 40, borderRadius: 12, background: "var(--tint-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{(t.kinds[tr.kind] ?? "🧳").split(" ")[0]}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 15, fontWeight: 800, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.homeCard(tr.name, tr.daysTo >= 0 ? t.inDays(tr.daysTo) : t.ongoing)}</span>
            {tr.daysTo >= 0 && <span style={{ display: "block", fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{tr.todosLeft ? `${t.leftBefore(tr.todosLeft)} · ` : ""}{t.packedOf(tr.packed, tr.packTotal)}</span>}
          </span>
          <span aria-hidden style={{ color: "var(--subtle)", fontSize: 18 }}>›</span>
        </Link>
      ))}
    </div>
  );
}
