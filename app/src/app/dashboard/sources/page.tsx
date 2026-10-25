"use client";

// 2026-10-25 (masterbrief Etapp 2, §10–12, §30 "Kalender & integrationer"):
// every calendar link of the family on one page — which child, which source,
// when it last synced, whether something's wrong, how much it brought in.
// "Sync now" uses each kind's own route; connecting/removing stays on the
// School and Activities pages (linked from here).
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
type Src = { id: string; kind: "school" | "activity"; childId: string; who: string; label: string; lastSyncAt: string | null; lastStatus: string | null; problem: { failed: boolean } | null; items: number; manage: string };

export default function SourcesPage() {
  const router = useRouter();
  const { m, dateLocale, err } = useI18n();
  const t = m.sources;
  const [list, setList] = useState<Src[] | null>(null);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  async function load() {
    const r = await fetch("/api/family/sources").catch(() => null);
    if (!r || !r.ok) { setDenied(true); setList([]); return; }
    setList((await r.json()).sources ?? []);
  }
  useEffect(() => { load(); }, []);

  async function syncNow(s: Src) {
    setBusy(s.id); setNote(null);
    const url = s.kind === "school" ? `/api/family/school-feeds/${s.id}` : `/api/family/activity-feeds/${s.id}`;
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync" }) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    setBusy(null);
    const res = d.result ?? d;
    if (r?.ok && res?.ok !== false) setNote({ id: s.id, text: t.synced, ok: true });
    else setNote({ id: s.id, text: err(res?.status ?? d.error ?? m.common.somethingWentWrong), ok: false });
    load();
  }

  const when = (iso: string | null) => {
    if (!iso) return t.notYet;
    const d = new Date(iso);
    return d.toLocaleDateString(dateLocale, { weekday: "short", day: "numeric", month: "short" }) + " " + d.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT }}>
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 16px", height: 56, display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => router.back()} aria-label={m.common.back} style={{ border: "none", background: "none", fontSize: 22, color: "var(--fg-2)", cursor: "pointer", minWidth: 44, minHeight: 44 }}>‹</button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)", margin: 0 }}>{t.title}</h1>
        </div>
      </div>
      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "16px 16px 100px" }}>
        <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.55, margin: "0 0 16px" }}>{t.intro}</p>
        {list === null && <div style={{ color: "var(--muted)", fontSize: 14 }}>{m.common.loading}</div>}
        {denied && <div style={{ color: "var(--muted)", fontSize: 14 }}>{t.adultsOnly}</div>}
        {list && !denied && list.length === 0 && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 16, fontSize: 14, color: "var(--fg-2)", lineHeight: 1.5 }}>{t.none}</div>
        )}
        {list && list.length > 0 && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden" }}>
            {list.map((s, i) => (
              <div key={s.id} style={{ padding: "12px 14px", borderTop: i ? "1px solid var(--border-soft)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span aria-hidden style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: s.kind === "school" ? "var(--tint-school)" : "var(--tint-warning)", fontSize: 16, flexShrink: 0 }}>{s.kind === "school" ? "📚" : "🎯"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label} · {s.who}</div>
                    <div style={{ fontSize: 12, color: s.problem ? "var(--danger)" : "var(--muted)", marginTop: 2 }}>
                      {s.problem ? (s.problem.failed ? t.failed : t.stale) + " · " : "✓ "}{t.lastSync(when(s.lastSyncAt))} · {t.items(s.items)}
                    </div>
                  </div>
                </div>
                {s.problem?.failed && s.lastStatus && <div style={{ fontSize: 12, color: "var(--danger)", margin: "6px 0 0 44px", lineHeight: 1.4 }}>{err(s.lastStatus)}</div>}
                {note?.id === s.id && <div role="status" style={{ fontSize: 12, color: note.ok ? "var(--success)" : "var(--danger)", margin: "6px 0 0 44px" }}>{note.text}</div>}
                <div style={{ display: "flex", gap: 8, margin: "10px 0 0 44px" }}>
                  <button onClick={() => syncNow(s)} disabled={busy === s.id} style={{ minHeight: 36, padding: "6px 14px", borderRadius: 50, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--fg-2)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT, opacity: busy === s.id ? 0.6 : 1 }}>
                    {busy === s.id ? t.syncing : t.syncNow}
                  </button>
                  <Link href={s.manage} style={{ minHeight: 36, display: "inline-flex", alignItems: "center", padding: "6px 14px", borderRadius: 50, color: "var(--accent)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>{t.manage}</Link>
                </div>
              </div>
            ))}
          </div>
        )}
        {!denied && (
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <Link href="/dashboard/school" style={{ flex: 1, minWidth: 150, textAlign: "center", padding: "12px", borderRadius: 14, border: "1.5px dashed var(--border)", color: "var(--accent-strong)", fontWeight: 700, fontSize: 13.5, textDecoration: "none" }}>{t.addSchool}</Link>
            <Link href="/dashboard/training" style={{ flex: 1, minWidth: 150, textAlign: "center", padding: "12px", borderRadius: 14, border: "1.5px dashed var(--border)", color: "var(--accent-strong)", fontWeight: 700, fontSize: 13.5, textDecoration: "none" }}>{t.addActivity}</Link>
          </div>
        )}
      </main>
    </div>
  );
}
