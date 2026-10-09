"use client";

// 2026-10-09: on Home, for anyone a family has shared a wishlist with.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

export default function GiftSharesCard() {
  const { m } = useI18n();
  const [n, setN] = useState(0);
  useEffect(() => {
    fetch("/api/gifts").then((r) => (r.ok ? r.json() : null)).then((d) => setN(d?.shares?.length ?? 0)).catch(() => {});
  }, []);
  if (!n) return null;
  return (
    <Link href="/gifts" style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "14px 16px", marginBottom: 22, textDecoration: "none", boxShadow: "var(--shadow)" }}>
      <span style={{ fontSize: 26 }}>🎁</span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>{m.gifts.homeCard(n)}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{m.gifts.homeCardCta} →</span>
    </Link>
  );
}
