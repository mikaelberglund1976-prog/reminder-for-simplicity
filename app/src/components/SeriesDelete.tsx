"use client";

// 2026-10-17 (Mikael: "om man sen vill ta bort en mitt i en serie går det
// inte"): delete for a RECURRING item asks "only <that day>" or "the whole
// series". `day` is the occurrence the person came from (the calendar passes
// `?on=YYYY-MM-DD`), otherwise the next one. Days already removed are listed
// underneath with an undo. A one-off item never gets here — it keeps its
// plain "Delete?" confirm.

import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

export function dayLabel(day: string, dateLocale: string): string {
  const d = new Date(day + "T12:00:00");
  return d.toLocaleDateString(dateLocale, { weekday: "short", day: "numeric", month: "short" });
}

export default function SeriesDelete({
  day, skipDates, onSkipDay, onUnskipDay, onDeleteAll, buttonLabel,
}: {
  day: string;
  skipDates: string[];
  onSkipDay: (day: string) => Promise<void>;
  onUnskipDay: (day: string) => Promise<void>;
  onDeleteAll: () => Promise<void>;
  buttonLabel?: string;
}) {
  const { m, dateLocale } = useI18n();
  const t = m.components.seriesDelete;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try { await fn(); } finally { setBusy(null); }
  }

  const option = (danger: boolean): React.CSSProperties => ({
    width: "100%", textAlign: "left", padding: "14px 16px", borderRadius: 14,
    background: danger ? "#D94F4F" : "var(--surface)",
    border: danger ? "none" : "1.5px solid var(--border)",
    color: danger ? "#fff" : "var(--fg)", cursor: busy ? "not-allowed" : "pointer",
    opacity: busy ? 0.6 : 1, fontFamily: FONT,
  });

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            width: "100%", padding: "17px", borderRadius: 50,
            background: "var(--tint-danger)", border: "1.5px solid var(--border-danger)",
            fontSize: 16, fontWeight: 600, color: "var(--danger)", cursor: "pointer", fontFamily: FONT,
          }}
        >
          {buttonLabel ?? t.delete}
        </button>
      ) : (
        <div style={{ background: "var(--tint-danger)", border: "1.5px solid var(--border-danger)", borderRadius: 20, padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)", textAlign: "center", marginBottom: 2 }}>{t.question}</div>
          <button type="button" disabled={!!busy} onClick={() => run("day", () => onSkipDay(day).then(() => setOpen(false)))} style={option(false)}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{busy === "day" ? t.removing : t.onlyThisDay(dayLabel(day, dateLocale))}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{t.onlyThisDayHint}</div>
          </button>
          <button type="button" disabled={!!busy} onClick={() => run("all", onDeleteAll)} style={option(true)}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{busy === "all" ? t.removing : t.wholeSeries}</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{t.wholeSeriesHint}</div>
          </button>
          <button type="button" disabled={!!busy} onClick={() => setOpen(false)} style={{ background: "none", border: "none", padding: 8, fontSize: 14, fontWeight: 600, color: "var(--fg-2)", cursor: "pointer", fontFamily: FONT }}>
            {m.common.cancel}
          </button>
        </div>
      )}

      {skipDates.length > 0 && (
        <div style={{ marginTop: 14, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "12px 16px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>{t.skippedTitle}</div>
          {skipDates.map((d) => (
            <div key={d} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
              <span style={{ fontSize: 14, color: "var(--fg)", textDecoration: "line-through" }}>{dayLabel(d, dateLocale)}</span>
              <button type="button" disabled={!!busy} onClick={() => run("u" + d, () => onUnskipDay(d))}
                style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: FONT }}>
                {busy === "u" + d ? "…" : t.restore}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
