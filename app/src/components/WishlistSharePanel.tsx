"use client";

// 2026-10-09: share one child's wishlist with relatives (adults only).
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
type Guest = { id: string; email: string; accepted: boolean };

export default function WishlistSharePanel({ childId, childName }: { childId: string; childName: string }) {
  const { m, err } = useI18n();
  const t = m.gifts;
  const [open, setOpen] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null);

  async function load() {
    const res = await fetch(`/api/family/wishlist-guests?childId=${encodeURIComponent(childId)}`);
    if (res.ok) setGuests((await res.json()).guests ?? []);
  }
  useEffect(() => { if (open) load(); setNote(null); }, [open, childId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const em = email.trim();
    if (!em) return;
    setBusy(true); setNote(null);
    try {
      const res = await fetch("/api/family/wishlist-guests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ childId, email: em }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setNote({ text: d.error ? err(d.error) : m.common.somethingWentWrong, ok: false }); return; }
      setNote({ text: d.emailSent ? t.invited(em) : t.invitedNoEmail(em), ok: true });
      setEmail("");
      await load();
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    await fetch("/api/family/wishlist-guests", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--accent)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "0 2px", fontFamily: FONT, marginBottom: 14 }}>
        🎁 {t.shareButton}
      </button>
    );
  }
  return (
    <div style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", borderRadius: 14, padding: 14, marginBottom: 14, fontFamily: FONT }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--fg)" }}>{t.shareTitle(childName)}</div>
        <button type="button" onClick={() => setOpen(false)} aria-label={m.common.close} style={{ background: "none", border: "none", fontSize: 18, color: "var(--muted)", cursor: "pointer" }}>×</button>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, margin: "6px 0 10px" }}>{t.shareHint}</p>
      {guests.map((g) => (
        <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid var(--border-soft)", fontSize: 13 }}>
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--fg)", fontWeight: 600 }}>{g.email}</span>
          <span style={{ fontSize: 11.5, color: g.accepted ? "var(--success)" : "var(--subtle)", fontWeight: 700 }}>{g.accepted ? t.active : t.pending}</span>
          <button type="button" onClick={() => remove(g.id)} style={{ background: "none", border: "none", color: "var(--danger)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>{t.remove}</button>
        </div>
      ))}
      <form onSubmit={invite} style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder={t.emailPlaceholder} autoComplete="off"
          style={{ flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--fg)", fontSize: 14, fontFamily: FONT }} />
        <button type="submit" disabled={busy || !email.trim()} style={{ background: "var(--ink)", color: "#fff", border: "none", borderRadius: 50, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT, opacity: busy || !email.trim() ? 0.6 : 1 }}>
          {busy ? t.inviting : t.invite}
        </button>
      </form>
      {note && <div style={{ fontSize: 12.5, marginTop: 8, color: note.ok ? "var(--success)" : "var(--danger)" }}>{note.text}</div>}
    </div>
  );
}
