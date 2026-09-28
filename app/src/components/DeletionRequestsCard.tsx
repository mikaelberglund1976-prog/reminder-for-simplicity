"use client";

// 2026-09-27: shown to the family admin when a member has asked to delete
// their account. Renders nothing when there's nothing to review.
import { useEffect, useState } from "react";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

type Req = { userId: string; name: string | null; email: string; requestedAt: string };

export default function DeletionRequestsCard() {
  const [reqs, setReqs] = useState<Req[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/household/deletion-requests").catch(() => null);
    if (res?.ok) setReqs((await res.json()).requests ?? []);
  }
  useEffect(() => { load(); }, []);

  async function act(userId: string, action: "approve" | "decline") {
    setBusy(userId);
    await fetch(`/api/household/deletion-requests/${userId}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
    }).catch(() => null);
    setBusy(null);
    await load();
  }

  if (reqs.length === 0) return null;

  return (
    <div style={{ background: "var(--tint-warning)", border: "1px solid var(--tint-warning)", borderRadius: 16, padding: 16, marginBottom: 16, fontFamily: FONT }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--warning)", marginBottom: 4 }}>Account deletion requests</div>
      <div style={{ fontSize: 12, color: "var(--warning)", marginBottom: 12, lineHeight: 1.5 }}>
        Approving removes the person from the family right away. Their data is kept 60 days (restorable on request), then permanently deleted.
      </div>
      {reqs.map((r) => (
        <div key={r.userId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "1px solid var(--tint-warning)" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>{r.name ?? r.email}</div>
            <div style={{ fontSize: 11, color: "var(--warning)" }}>Asked {new Date(r.requestedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
          </div>
          <button type="button" onClick={() => act(r.userId, "decline")} disabled={busy === r.userId} style={{
            padding: "8px 12px", background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 12, fontWeight: 700, color: "var(--fg-2)", cursor: "pointer", fontFamily: FONT,
          }}>Decline</button>
          <button type="button" onClick={() => { if (confirm(`Delete ${r.name ?? r.email}'s account?`)) act(r.userId, "approve"); }} disabled={busy === r.userId} style={{
            padding: "8px 12px", background: "#D94F4F", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: FONT,
          }}>{busy === r.userId ? "…" : "Approve"}</button>
        </div>
      ))}
    </div>
  );
}
