"use client";

// 2026-10-09: chore stars for one person — this week, all-time, streak and the
// optional pocket money ("veckopeng") per star. Adults can set the amount.
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
type Row = { userId: string; week: number; lastWeek: number; total: number; streak: number };

export default function StarSummary({ userId, refreshKey = 0, showSetting = false }: { userId: string | null | undefined; refreshKey?: number; showSetting?: boolean }) {
  const { m } = useI18n();
  const t = m.chores.stars;
  const [row, setRow] = useState<Row | null>(null);
  const [perStar, setPerStarState] = useState(0);
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!userId) return;
    fetch("/api/family/stars").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) return;
      setRow((d.members ?? []).find((x: Row) => x.userId === userId) ?? null);
      setPerStarState(d.perStar ?? 0);
      setCanEdit(!!d.canEdit);
    }).catch(() => {});
  }, [userId, refreshKey]);

  async function save() {
    const v = Math.max(0, Math.min(1000, Math.round(Number(draft) || 0)));
    const res = await fetch("/api/family/stars", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ perStar: v }) });
    if (res.ok) { setPerStarState(v); setEditing(false); }
  }

  if (!row) return null;
  const tiles = [
    { value: `⭐ ${row.week}`, label: t.thisWeek },
    { value: String(row.total), label: t.total },
    { value: row.streak ? `🔥 ${row.streak}` : "–", label: t.streak },
  ];
  return (
    <div style={{ fontFamily: FONT, marginBottom: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        {tiles.map((x) => (
          <div key={x.label} style={{ background: "var(--tint-warning)", borderRadius: 12, padding: "10px 6px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)", lineHeight: 1.1 }}>{x.value}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginTop: 4 }}>{x.label}</div>
          </div>
        ))}
      </div>
      {perStar > 0 && (
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-2)", marginTop: 8 }}>
          {t.earned(row.week * perStar, perStar)}{row.lastWeek ? ` · ${t.lastWeek(row.lastWeek * perStar)}` : ""}
        </div>
      )}
      {showSetting && canEdit && (
        editing ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="0" aria-label={t.perStarLabel}
              style={{ width: 70, padding: "8px 10px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--fg)", fontSize: 14, fontFamily: FONT }} />
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{t.perStarUnit}</span>
            <button type="button" onClick={save} style={{ marginLeft: "auto", background: "var(--ink)", color: "#fff", border: "none", borderRadius: 50, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>{m.common.save}</button>
          </div>
        ) : (
          <button type="button" onClick={() => { setDraft(perStar ? String(perStar) : ""); setEditing(true); }}
            style={{ background: "none", border: "none", padding: "8px 0 0", fontSize: 12.5, fontWeight: 700, color: "var(--accent)", cursor: "pointer", fontFamily: FONT }}>
            {perStar > 0 ? t.changePerStar(perStar) : t.setPerStar}
          </button>
        )
      )}
    </div>
  );
}
