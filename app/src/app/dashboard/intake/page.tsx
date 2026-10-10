"use client";

// 2026-10-10: AI intake — photo/PDF of a newsletter → suggestions → review → save.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useI18n } from "@/lib/i18n/client";
import { compressImage } from "@/lib/imageCompress";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
type Kind = "TEST" | "HOMEWORK" | "SCHOOL_OTHER" | "ACTIVITY" | "REMINDER";
type Suggestion = { title: string; date: string; startTime: string | null; endTime: string | null; kind: Kind; subject: string | null; note: string | null; whoText: string | null; childId: string | null };
type Row = Suggestion & { keep: boolean };
type Status = { configured: boolean; isAdult: boolean; available: boolean; used: number; limit: number };

export default function IntakePage() {
  const { status } = useSession();
  const router = useRouter();
  const { m, err, dateLocale } = useI18n();
  const t = m.intake;
  const [st, setSt] = useState<Status | null>(null);
  const [phase, setPhase] = useState<"pick" | "reading" | "review" | "done">("pick");
  const [rows, setRows] = useState<Row[]>([]);
  const [children, setChildren] = useState<{ id: string; name: string | null }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedN, setSavedN] = useState(0);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadStatus() {
    const r = await fetch("/api/intake");
    if (r.ok) setSt(await r.json());
  }
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/dashboard/intake");
    if (status === "authenticated") loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setError(null);
    let dataUrl: string;
    try {
      if (f.type === "application/pdf") {
        if (f.size > 3_400_000) { setError(t.tooBig); return; }
        dataUrl = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(f); });
      } else {
        dataUrl = await compressImage(f, { mode: "fit", maxW: 1800, maxH: 1800, quality: 0.85 });
      }
    } catch (e) { setError(e instanceof Error ? e.message : m.common.somethingWentWrong); return; }
    setPhase("reading");
    try {
      const r = await fetch("/api/intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ file: dataUrl }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error ? err(d.error) : m.common.somethingWentWrong); setPhase("pick"); return; }
      setChildren(d.children ?? []);
      setRows((d.suggestions ?? []).map((s: Suggestion) => ({ ...s, keep: true })));
      setPhase("review");
      loadStatus();
    } catch { setError(m.common.networkError); setPhase("pick"); }
  }

  function upd(i: number, patch: Partial<Row>) { setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r))); }

  async function save() {
    const items = rows.filter((r) => r.keep);
    if (!items.length) return;
    setSaving(true); setError(null);
    try {
      const r = await fetch("/api/intake/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error ? err(d.error) : m.common.somethingWentWrong); return; }
      setSavedN(d.saved ?? items.length);
      setPhase("done");
    } finally { setSaving(false); }
  }

  const card = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: 16, boxShadow: "var(--shadow)" } as const;
  const btnPrimary = { width: "100%", background: "var(--ink)", color: "#fff", border: "none", borderRadius: 50, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: FONT } as const;
  const btnSoft = { ...btnPrimary, background: "var(--surface-3)", color: "var(--fg-2)" } as const;
  const inp = { width: "100%", boxSizing: "border-box" as const, padding: "9px 10px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--fg)", fontSize: 14, fontFamily: FONT };
  const kept = rows.filter((r) => r.keep).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT }}>
      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "28px 20px 48px" }}>
        <Link href="/dashboard" style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>← {m.common.back}</Link>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--fg)", margin: "12px 0 6px", letterSpacing: "-0.5px" }}>{t.title}</h1>

        {st && !st.isAdult && (
          <div style={{ ...card, marginTop: 12, fontSize: 14, color: "var(--fg-2)" }}>{t.adultsOnly}</div>
        )}

        {st && st.isAdult && !st.available && (
          <div style={{ ...card, marginTop: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--fg)", marginBottom: 6 }}>{t.upgradeTitle}</div>
            <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.5, margin: "0 0 14px" }}>{t.upgradeBody}</p>
            <Link href="/upgrade" style={{ ...btnPrimary, display: "block", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>{t.seePlans}</Link>
          </div>
        )}

        {st && st.available && !st.configured && (
          <div style={{ ...card, marginTop: 12, fontSize: 14, color: "var(--fg-2)", lineHeight: 1.5 }}>{t.notConfigured}</div>
        )}

        {st?.available && st.configured && phase === "pick" && (
          <>
            <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.55, margin: "0 0 18px" }}>{t.intro}</p>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
            <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button type="button" onClick={() => cameraRef.current?.click()} style={btnPrimary}>{t.takePhoto}</button>
              <button type="button" onClick={() => fileRef.current?.click()} style={btnSoft}>{t.pickFile}</button>
            </div>
            <p style={{ fontSize: 12, color: "var(--subtle)", lineHeight: 1.5, marginTop: 16 }}>{t.privacy}</p>
            <p style={{ fontSize: 12, color: "var(--subtle)", marginTop: 4 }}>{t.usage(st.used, st.limit)}</p>
          </>
        )}

        {phase === "reading" && (
          <div style={{ ...card, marginTop: 16, textAlign: "center", padding: "32px 16px" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔎</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--fg)" }}>{t.reading}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{t.readingHint}</div>
          </div>
        )}

        {phase === "review" && (
          <>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--fg)", margin: "8px 0 4px" }}>{rows.length ? t.found(rows.length) : t.nothingFound}</div>
            {rows.length > 0 && <div style={{ fontSize: 12.5, color: "var(--warning)", fontWeight: 700, marginBottom: 12 }}>{t.checkDates}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {rows.map((r, i) => (
                <div key={i} style={{ ...card, padding: 14, opacity: r.keep ? 1 : 0.5 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <input type="checkbox" checked={r.keep} onChange={(e) => upd(i, { keep: e.target.checked })} aria-label={r.title} style={{ width: 20, height: 20, marginTop: 8, flexShrink: 0, accentColor: "var(--accent)" }} />
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                      <input value={r.title} onChange={(e) => upd(i, { title: e.target.value })} style={{ ...inp, fontWeight: 700 }} />
                      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 8 }}>
                        <input type="date" value={r.date} onChange={(e) => upd(i, { date: e.target.value })} style={inp} />
                        <input type="time" value={r.startTime ?? ""} onChange={(e) => upd(i, { startTime: e.target.value || null })} style={inp} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <select value={r.kind} onChange={(e) => upd(i, { kind: e.target.value as Kind })} style={inp}>
                          {(["TEST", "HOMEWORK", "SCHOOL_OTHER", "ACTIVITY", "REMINDER"] as Kind[]).map((k) => <option key={k} value={k}>{t.kinds[k]}</option>)}
                        </select>
                        <select value={r.childId ?? ""} onChange={(e) => upd(i, { childId: e.target.value || null })} style={inp} aria-label={t.forWhom}>
                          <option value="">{t.everyone}</option>
                          {children.map((c) => <option key={c.id} value={c.id}>{c.name?.split(" ")[0] ?? "?"}</option>)}
                        </select>
                      </div>
                      {(r.note || r.whoText) && (
                        <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>
                          {r.note}{r.note && r.whoText ? " · " : ""}{r.whoText ? t.asWritten(r.whoText) : ""}
                        </div>
                      )}
                      <div style={{ fontSize: 11.5, color: "var(--subtle)" }}>{new Date(r.date + "T12:00:00").toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" })}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
              {rows.length > 0 && <button type="button" onClick={save} disabled={saving || kept === 0} style={{ ...btnPrimary, opacity: saving || kept === 0 ? 0.6 : 1 }}>{saving ? t.saving : t.save(kept)}</button>}
              <button type="button" onClick={() => { setRows([]); setPhase("pick"); }} style={btnSoft}>{t.scanAnother}</button>
            </div>
          </>
        )}

        {phase === "done" && (
          <div style={{ ...card, marginTop: 16, textAlign: "center", padding: "28px 16px" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--fg)", marginBottom: 16 }}>{t.saved(savedN)}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link href="/dashboard/calendar" style={{ ...btnPrimary, display: "block", textDecoration: "none", boxSizing: "border-box" }}>{t.toCalendar}</Link>
              <button type="button" onClick={() => { setRows([]); setPhase("pick"); }} style={btnSoft}>{t.scanAnother}</button>
            </div>
          </div>
        )}

        {error && <div style={{ fontSize: 13.5, color: "var(--danger)", marginTop: 14 }}>{error}</div>}
      </main>
    </div>
  );
}
