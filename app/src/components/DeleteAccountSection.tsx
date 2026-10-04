"use client";

// 2026-09-27: "Delete account" in Profile. Three cases (see lib/accountDeletion.ts):
//  - confirm: you're the family admin or alone → "Are you sure?" → deleted
//  - request: someone else is the family admin → request goes to them
//  - blocked: you're the only adult and there are children left
// Deleted accounts are kept 60 days and can be restored by us on request.
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useI18n } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

type Info = {
  pendingSince: string | null;
  restoreDays: number;
  mode: "confirm" | "request" | "blocked";
  approverNames: string[];
  promoteName: string | null;
  blockedReason: string | null;
};

export default function DeleteAccountSection() {
  const [info, setInfo] = useState<Info | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { m: msg, err } = useI18n();
  const t = msg.account;

  async function load() {
    const res = await fetch("/api/account/delete").catch(() => null);
    if (res?.ok) setInfo(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function go() {
    setBusy(true); setError("");
    const res = await fetch("/api/account/delete", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: true }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) { setError(data?.error ? err(data.error) : msg.common.somethingWentWrong); return; }
    if (data.status === "deleted") { await signOut({ callbackUrl: "/login?error=AccountDeleted" }); return; }
    setOpen(false);
    await load();
  }

  async function cancelRequest() {
    setBusy(true);
    await fetch("/api/account/delete", { method: "DELETE" }).catch(() => null);
    setBusy(false);
    await load();
  }

  const box: React.CSSProperties = { background: "var(--tint-danger)", border: "1px solid var(--border-danger)", borderRadius: 14, padding: 16 };
  const days = info?.restoreDays ?? 60;

  if (info?.pendingSince) {
    return (
      <div style={{ marginTop: 12, ...box, background: "var(--tint-warning)", border: "1px solid var(--tint-warning)" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--warning)", marginBottom: 6 }}>{t.deletionRequested}</div>
        <div style={{ fontSize: 13, color: "var(--warning)", marginBottom: 12, lineHeight: 1.5 }}>
          {t.waitingFor(info.approverNames.join(t.or) || t.theFamilyAdmin)}
        </div>
        <button type="button" onClick={cancelRequest} disabled={busy} style={{
          padding: "10px 16px", background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 10,
          fontSize: 13, fontWeight: 600, color: "var(--fg-2)", cursor: "pointer", fontFamily: FONT,
        }}>{busy ? "…" : t.cancelRequest}</button>
      </div>
    );
  }

  if (!open) {
    return (
      <div style={{ marginTop: 12 }}>
        <button type="button" onClick={() => setOpen(true)} style={{
          width: "100%", padding: "13px 16px", background: "var(--tint-danger)", border: "1.5px solid var(--border-danger)", borderRadius: 14,
          fontSize: 14, fontWeight: 600, color: "var(--danger)", cursor: "pointer", textAlign: "left", fontFamily: FONT,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#D94F4F" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
          {t.deleteAccount}
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12, ...box }}>
      {info?.mode === "blocked" ? (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--danger)", marginBottom: 8 }}>{t.cantDelete}</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14, lineHeight: 1.5 }}>{err(info.blockedReason)}</div>
          <button type="button" onClick={() => setOpen(false)} style={secondaryBtn}>{msg.common.ok}</button>
        </>
      ) : info?.mode === "request" ? (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--danger)", marginBottom: 8 }}>{t.askDelete}</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14, lineHeight: 1.5 }}>
            {t.askDeleteBody(info.approverNames.join(t.or), days)}
          </div>
          {error && <div style={{ fontSize: 13, color: "var(--danger)", marginBottom: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={() => setOpen(false)} style={secondaryBtn}>{msg.common.cancel}</button>
            <button type="button" onClick={go} disabled={busy} style={dangerBtn}>{busy ? msg.common.sending : t.sendRequest}</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--danger)", marginBottom: 8 }}>{t.sureTitle}</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14, lineHeight: 1.5 }}>
            {t.sureBody(days)}
            {info?.promoteName ? t.willBecomeAdmin(info.promoteName) : ""}
          </div>
          {error && <div style={{ fontSize: 13, color: "var(--danger)", marginBottom: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={() => setOpen(false)} style={secondaryBtn}>{msg.common.cancel}</button>
            <button type="button" onClick={go} disabled={busy || !info} style={dangerBtn}>{busy ? msg.common.deleting : t.yesDelete}</button>
          </div>
        </>
      )}
    </div>
  );
}

const secondaryBtn: React.CSSProperties = {
  flex: 1, padding: "11px", background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 10,
  fontSize: 13, fontWeight: 600, color: "var(--muted)", cursor: "pointer", fontFamily: FONT,
};
const dangerBtn: React.CSSProperties = {
  flex: 1, padding: "11px", background: "#D94F4F", border: "none", borderRadius: 10,
  fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: FONT,
};
