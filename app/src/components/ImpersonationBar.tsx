"use client";

// 2026-10-03: shown on every page while the admin is viewing the app as
// someone in the family (lib/impersonation.ts). Switch straight to another
// family member, or go back to yourself.
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
type M = { userId: string; role: string; user: { name: string | null; email: string } };

export async function viewAs(update: (d: unknown) => Promise<unknown>, userId: string): Promise<boolean> {
  const s = (await update({ impersonate: userId })) as { impersonator?: unknown; user?: { id?: string } } | null;
  if (s?.impersonator && s.user?.id === userId) { window.location.assign("/dashboard"); return true; }
  return false;
}

export default function ImpersonationBar() {
  const { data: session, update } = useSession();
  const [members, setMembers] = useState<M[]>([]);
  const [busy, setBusy] = useState(false);
  const imp = session?.impersonator;

  useEffect(() => {
    if (!imp) return;
    fetch("/api/household").then((r) => (r.ok ? r.json() : null)).then((d) => setMembers(d?.household?.members ?? [])).catch(() => {});
  }, [imp]);

  if (!imp) return null;
  const me = session?.user;
  const label = (m: M) => m.user.name?.split(" ")[0] ?? m.user.email.split("@")[0];
  const others = members.filter((m) => m.userId !== me?.id && m.user.email.toLowerCase() !== imp.email.toLowerCase());

  async function back() {
    setBusy(true);
    await update({ stopImpersonating: true });
    window.location.assign("/dashboard/family/members");
  }
  async function switchTo(id: string) {
    if (!id) return;
    setBusy(true);
    if (!(await viewAs(update, id))) setBusy(false);
  }

  return (
    <div role="status" style={{
      position: "fixed", top: "calc(env(safe-area-inset-top, 0px) + 6px)", left: "50%", transform: "translateX(-50%)", zIndex: 2000,
      display: "flex", alignItems: "center", gap: 8, padding: "6px 6px 6px 12px", borderRadius: 50,
      background: "#B42318", color: "#fff", boxShadow: "0 6px 20px rgba(0,0,0,0.25)", fontFamily: FONT, fontSize: 12.5, fontWeight: 700,
      maxWidth: "calc(100vw - 16px)", opacity: busy ? 0.7 : 1,
    }}>
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>👁 Viewing as {me?.name?.split(" ")[0] ?? me?.email}</span>
      {others.length > 0 && (
        <select value="" onChange={(e) => switchTo(e.target.value)} disabled={busy} aria-label="Switch person"
          style={{ background: "rgba(255,255,255,0.18)", color: "#fff", border: "none", borderRadius: 50, padding: "5px 8px", fontSize: 12, fontWeight: 700, fontFamily: FONT, maxWidth: 110 }}>
          <option value="">Switch…</option>
          {others.map((m) => <option key={m.userId} value={m.userId} style={{ color: "#000" }}>{label(m)}{m.role === "CHILD" ? " (child)" : ""}</option>)}
        </select>
      )}
      <button onClick={back} disabled={busy} style={{ background: "#fff", color: "#B42318", border: "none", borderRadius: 50, padding: "6px 11px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: FONT, whiteSpace: "nowrap" }}>
        Back to me
      </button>
    </div>
  );
}
