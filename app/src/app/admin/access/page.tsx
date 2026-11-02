"use client";

// 2026-11-02 — /admin/access: who gets in.
//   · Inbjudningskoder: create, limit, pause, delete, see who used each one
//     (lib/signupCodes.ts). New accounts need a code unless a family invited them.
//   · Databasskydd: Row Level Security per table (lib/dbSecurity.ts) — the build
//     and the daily cron keep it on; the button here does it right away.
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ADMIN_EMAIL } from "@/lib/adminConfig";

type Use = { userId: string | null; email: string; createdAt: string };
type Code = {
  id: string; code: string; note: string | null; maxUses: number | null; uses: number;
  expiresAt: string | null; active: boolean; createdAt: string; usedBy: Use[];
};
type Rls = { currentUser: string; tables: { table: string; rls: boolean; anonCanRead: boolean | null }[]; withoutRls: string[]; anonRoleExists: boolean };

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const EMPTY = { code: "", note: "", maxUses: "1", expiresDays: "30" };

const fmt = (c: string) => (c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c);

function status(c: Code) {
  if (!c.active) return { label: "Pausad", color: "var(--muted)" };
  if (c.expiresAt && new Date(c.expiresAt).getTime() <= Date.now()) return { label: "Utgången", color: "var(--muted)" };
  if (c.maxUses != null && c.uses >= c.maxUses) return { label: "Förbrukad", color: "var(--muted)" };
  return { label: "Aktiv", color: "var(--success)" };
}

export default function AdminAccessPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [codes, setCodes] = useState<Code[]>([]);
  const [required, setRequired] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [rls, setRls] = useState<Rls | null>(null);
  const [rlsMsg, setRlsMsg] = useState("");
  const [rlsBusy, setRlsBusy] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login");
    if (authStatus === "authenticated") {
      if (session?.user?.email !== ADMIN_EMAIL) router.push("/dashboard");
      else { load(); loadRls(); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus]);

  async function load() {
    const res = await fetch("/api/admin/signup-codes");
    if (res.ok) { const d = await res.json(); setCodes(d.codes ?? []); setRequired(d.required !== false); }
  }
  async function loadRls() {
    const res = await fetch("/api/admin/security");
    if (res.ok) setRls(await res.json());
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const days = Number(form.expiresDays);
    const body = {
      code: form.code.trim() || undefined,
      note: form.note,
      maxUses: form.maxUses.trim() ? Number(form.maxUses) : null,
      expiresAt: form.expiresDays.trim() && days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null,
    };
    const res = await fetch("/api/admin/signup-codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setError(d.error ?? "Kunde inte skapa koden"); return; }
    setForm(EMPTY);
    load();
  }

  async function patch(c: Code, data: Record<string, unknown>) {
    await fetch(`/api/admin/signup-codes/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    load();
  }
  async function remove(c: Code) {
    if (!confirm(`Ta bort koden ${fmt(c.code)}? Konton som redan skapats påverkas inte.`)) return;
    await fetch(`/api/admin/signup-codes/${c.id}`, { method: "DELETE" });
    load();
  }
  async function copy(c: Code) {
    const link = `${window.location.origin}/register?code=${fmt(c.code)}`;
    try { await navigator.clipboard.writeText(link); setCopied(c.id); setTimeout(() => setCopied(null), 2000); }
    catch { prompt("Kopiera länken:", link); }
  }
  async function enableRls() {
    setRlsBusy(true); setRlsMsg("");
    const res = await fetch("/api/admin/security", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setRlsBusy(false);
    if (!res.ok) { setRlsMsg(d.error ?? "Något gick fel"); return; }
    setRlsMsg(d.enabled?.length ? `RLS påslaget på ${d.enabled.length} tabeller.` : "Inget att göra – alla tabeller hade redan RLS.");
    if (d.status) setRls(d.status);
  }

  const input: React.CSSProperties = { width: "100%", padding: "11px 13px", borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--surface-2)", color: "var(--fg)", fontSize: 14, fontFamily: FONT, boxSizing: "border-box" };
  const label = (text: string, el: React.ReactNode) => (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--fg)", marginBottom: 5 }}>{text}</span>
      {el}
    </label>
  );
  const active = codes.filter((c) => status(c).label === "Aktiv").length;
  const totalUses = codes.reduce((n, c) => n + c.uses, 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT }}>
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 60px" }}>
        <Link href="/admin" style={{ fontSize: 14, color: "var(--muted)", textDecoration: "none", fontWeight: 600 }}>‹ Admin</Link>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--fg)", margin: "10px 0 4px" }}>Åtkomst</h1>
        <p style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 20px", lineHeight: 1.5 }}>
          {required
            ? "Nya konton kräver en inbjudningskod. Undantag: den som en familj har bjudit in via e-post, och admin. Befintliga konton påverkas inte."
            : "OBS: kodkravet är avstängt (REQUIRE_INVITE_CODE=false i Vercel) – vem som helst kan skapa konto."}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10, marginBottom: 20 }}>
          {[["Koder", codes.length], ["Aktiva", active], ["Använda", totalUses]].map(([l, v]) => (
            <div key={l as string} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "12px 14px" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--fg)" }}>{v as number}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>

        <form onSubmit={create} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 18, marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--fg)", marginBottom: 14 }}>Ny inbjudningskod</div>
          {label("Kod (lämna tomt för att slumpa)", <input style={{ ...input, textTransform: "uppercase" }} value={form.code} placeholder="t.ex. FAMILJEN2026" onChange={(e) => setForm({ ...form, code: e.target.value })} />)}
          {label("Anteckning – vem är den till?", <input style={input} value={form.note} placeholder="t.ex. Anna (kollega)" onChange={(e) => setForm({ ...form, note: e.target.value })} />)}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {label("Max antal konton (tomt = obegränsat)", <input style={input} inputMode="numeric" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />)}
            {label("Giltig i dagar (tomt = alltid)", <input style={input} inputMode="numeric" value={form.expiresDays} onChange={(e) => setForm({ ...form, expiresDays: e.target.value })} />)}
          </div>
          {error && <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <button type="submit" disabled={saving} style={{ width: "100%", padding: 13, borderRadius: 50, border: "none", background: "var(--accent-bg)", color: "var(--on-accent)", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: FONT }}>
            {saving ? "Skapar…" : "Skapa kod"}
          </button>
        </form>

        {codes.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--subtle)", fontSize: 14 }}>Inga koder än.</p>
        ) : codes.map((c) => {
          const st = status(c);
          return (
            <div key={c.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "var(--fg)", letterSpacing: "1px", fontFamily: "ui-monospace, Menlo, monospace" }}>{fmt(c.code)}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                    {c.note ?? "Ingen anteckning"} · {c.uses}{c.maxUses != null ? ` av ${c.maxUses}` : ""} använda
                    {c.expiresAt ? ` · gäller t.o.m. ${c.expiresAt.slice(0, 10)}` : " · ingen slutdag"}
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: st.color, flexShrink: 0 }}>{st.label}</span>
              </div>
              {c.usedBy.length > 0 && (
                <div style={{ fontSize: 12, color: "var(--fg-2)", margin: "10px 0 0", lineHeight: 1.6 }}>
                  {c.usedBy.map((u, i) => <div key={i}>{u.email} · {u.createdAt.slice(0, 10)}</div>)}
                </div>
              )}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10 }}>
                <button onClick={() => copy(c)} style={linkBtn}>{copied === c.id ? "Kopierad ✓" : "Kopiera länk"}</button>
                <button onClick={() => patch(c, { active: !c.active })} style={linkBtn}>{c.active ? "Pausa" : "Aktivera"}</button>
                {c.maxUses != null && <button onClick={() => patch(c, { maxUses: c.maxUses! + 1 })} style={linkBtn}>+1 användning</button>}
                <button onClick={() => remove(c)} style={{ ...linkBtn, color: "var(--danger)" }}>Ta bort</button>
              </div>
            </div>
          );
        })}

        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)", margin: "32px 0 6px" }}>Databasskydd (RLS)</h2>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
          Row Level Security stänger Supabases Data API för all familjedata. Appen påverkas inte. Slås på automatiskt vid varje deploy och varje natt.
        </p>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: 16 }}>
          {!rls ? (
            <div style={{ fontSize: 13, color: "var(--muted)" }}>Hämtar…</div>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: rls.withoutRls.length ? "var(--danger)" : "var(--success)" }}>
                {rls.withoutRls.length ? `${rls.withoutRls.length} av ${rls.tables.length} tabeller saknar RLS` : `Alla ${rls.tables.length} tabeller har RLS`}
              </div>
              {rls.withoutRls.length > 0 && <div style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 6 }}>{rls.withoutRls.join(", ")}</div>}
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Databasroll: {rls.currentUser}</div>
            </>
          )}
          {rlsMsg && <div style={{ fontSize: 13, color: "var(--fg)", marginTop: 8 }}>{rlsMsg}</div>}
          <button onClick={enableRls} disabled={rlsBusy} style={{ ...linkBtn, marginTop: 10 }}>{rlsBusy ? "Arbetar…" : "Slå på RLS nu"}</button>
        </div>
      </main>
    </div>
  );
}

const linkBtn: React.CSSProperties = { background: "none", border: "none", padding: 0, fontSize: 13, fontWeight: 700, color: "var(--accent)", cursor: "pointer", fontFamily: FONT };
