"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/shoppingCategories";
import { markSeen } from "@/lib/listBadges";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

// Polling interval for near-real-time sync. There's no websocket/push
// infrastructure in this app yet, so a short poll is the pragmatic v1
// choice — see PRODUCT_SPEC.md 4b.8 (open question 2 in the 2026-07-27 order).
const POLL_MS = 5000;

type ShoppingCategory = keyof typeof CATEGORY_LABELS;

function IcBack()  { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6"/></svg>; }
function IcPlus()  { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function IcTrash() { return <svg width={16} height={16} viewBox="0 0 24 24" {...STR}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>; }
function IcLock()  { return <svg width={32} height={32} viewBox="0 0 24 24" {...STR} strokeWidth={1.5}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }

type Item = {
  id: string;
  name: string;
  quantity: string | null;
  category: ShoppingCategory;
  isPurchased: boolean;
  addedBy: string;
  adder: { id: string; name: string | null } | null;
  purchaser: { id: string; name: string | null } | null;
};

export default function ShoppingListPage() {
  const { status } = useSession();
  const router = useRouter();

  const [items, setItems] = useState<Item[]>([]);
  const [access, setAccess] = useState<"LOADING" | "NO_HOUSEHOLD" | "LOCKED" | "PRO" | "TRIAL">("LOADING");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") fetchItems();
  }, [status]);

  // Lightweight polling so household members see each other's changes without
  // reopening the app. Paused when the tab isn't visible to avoid wasted requests.
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (status !== "authenticated") return;

    function startPolling() {
      if (pollRef.current) return;
      pollRef.current = setInterval(() => {
        if (document.visibilityState === "visible") fetchItems();
      }, POLL_MS);
    }
    function stopPolling() {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
    function onVisibility() {
      if (document.visibilityState === "visible") { fetchItems(); startPolling(); }
    }

    startPolling();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [status]);

  async function fetchItems() {
    try {
      const res = await fetch("/api/family/shopping-list");
      const data = await res.json();
      setItems(data.items ?? []);
      setAccess(data.access ?? "NO_HOUSEHOLD");
      markSeen("shopping-list");
    } catch (e) {
      console.error(e);
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/family/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, quantity: quantity || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        setName("");
        setQuantity("");
        await fetchItems();
      }
    } catch {
      setError("Network error");
    } finally {
      setAdding(false);
    }
  }

  async function togglePurchased(item: Item) {
    setBusyId(item.id);
    try {
      await fetch(`/api/family/shopping-list/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPurchased: !item.isPurchased }),
      });
      await fetchItems();
    } catch (e) {
      console.error(e);
    } finally {
      setBusyId(null);
    }
  }

  async function changeCategory(item: Item, category: ShoppingCategory) {
    setBusyId(item.id);
    try {
      await fetch(`/api/family/shopping-list/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      await fetchItems();
    } catch (e) {
      console.error(e);
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/family/shopping-list/${id}`, { method: "DELETE" });
      await fetchItems();
    } catch (e) {
      console.error(e);
    } finally {
      setBusyId(null);
    }
  }

  async function clearBought() {
    setClearing(true);
    try {
      await fetch("/api/family/shopping-list", { method: "DELETE" });
      await fetchItems();
    } catch (e) {
      console.error(e);
    } finally {
      setClearing(false);
    }
  }

  if (status === "loading" || access === "LOADING") {
    return (
      <div style={{ minHeight: "100vh", background: "#F5F4F0", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "#7C7C8A", fontSize: 15 }}>Loading shopping list…</div>
      </div>
    );
  }

  if (access === "NO_HOUSEHOLD") {
    return (
      <Screen title="Shopping list" onBack={() => router.push("/dashboard/family")}>
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", margin: "0 0 10px" }}>Set up your household first</h2>
          <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, marginBottom: 28 }}>
            A shared shopping list needs a household. Invite your family to get started.
          </p>
          <Link href="/profile" style={btnStyle("#1C1C28")}>Go to settings →</Link>
        </div>
      </Screen>
    );
  }

  if (access === "LOCKED") {
    return (
      <Screen title="Shopping list" onBack={() => router.push("/dashboard/family")}>
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ color: "#CBD5E1", marginBottom: 20, display: "flex", justifyContent: "center" }}><IcLock /></div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", margin: "0 0 10px" }}>Family features required</h2>
          <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, marginBottom: 28 }}>
            The shared shopping list is part of family responsibilities — start your free trial or upgrade to Pro to use it.
          </p>
          <Link href="/dashboard/family" style={btnStyle("#1C1C28")}>Go to Family →</Link>
        </div>
      </Screen>
    );
  }

  const pending = items.filter(i => !i.isPurchased);
  const purchased = items.filter(i => i.isPurchased);

  const grouped: { category: ShoppingCategory; items: Item[] }[] = CATEGORY_ORDER
    .map(category => ({ category: category as ShoppingCategory, items: pending.filter(i => i.category === category) }))
    .filter(g => g.items.length > 0);

  return (
    <Screen title="Shopping list" onBack={() => router.push("/dashboard/family")}>

      {/* Add item form */}
      <form onSubmit={addItem} style={{ background: "#fff", borderRadius: 18, border: "1px solid #E4E3DE", padding: 16, marginBottom: 20, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: error ? 10 : 0 }}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Add an item…"
            style={{ flex: 1, minWidth: 0, padding: "12px 14px", borderRadius: 12, border: "1.5px solid #E4E3DE", fontSize: 15, fontFamily: FONT, outline: "none", boxSizing: "border-box" as const }}
          />
          <input
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="Qty"
            style={{ width: 72, padding: "12px 10px", borderRadius: 12, border: "1.5px solid #E4E3DE", fontSize: 15, fontFamily: FONT, outline: "none", boxSizing: "border-box" as const }}
          />
          <button
            type="submit"
            disabled={adding || !name.trim()}
            style={{
              width: 48, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              background: "#1C1C28", color: "#fff", border: "none", borderRadius: 12,
              cursor: adding || !name.trim() ? "not-allowed" : "pointer", opacity: adding || !name.trim() ? 0.5 : 1,
            }}
          >
            <IcPlus />
          </button>
        </div>
        {error && <div style={{ fontSize: 13, color: "#C44444", marginTop: 10 }}>{error}</div>}
        <div style={{ fontSize: 11, color: "#B0B7C8", marginTop: 8 }}>
          Items sort into aisles automatically — change one's category below and we'll remember it next time.
        </div>
      </form>

      {/* To buy, grouped by category */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 10, letterSpacing: "0.02em" }}>
        To buy {pending.length > 0 && `(${pending.length})`}
      </div>

      {pending.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0 32px", color: "#9CA3AF", fontSize: 13 }}>
          Nothing on the list right now.
        </div>
      ) : (
        <div style={{ marginBottom: 24 }}>
          {grouped.map(group => (
            <div key={group.category} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.04em", textTransform: "uppercase", margin: "0 2px 6px" }}>
                {CATEGORY_LABELS[group.category]}
              </div>
              <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #E4E3DE", padding: "4px 16px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                {group.items.map((item, i) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    isFirst={i === 0}
                    busy={busyId === item.id}
                    onToggle={() => togglePurchased(item)}
                    onRemove={() => removeItem(item.id)}
                    onCategoryChange={(cat) => changeCategory(item, cat)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Purchased */}
      {purchased.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.02em" }}>
              Already in the cart ({purchased.length})
            </div>
            <button
              onClick={clearBought}
              disabled={clearing}
              style={{ background: "none", border: "none", color: "#6B7280", fontSize: 12, fontWeight: 700, cursor: clearing ? "not-allowed" : "pointer", padding: 4, fontFamily: FONT }}
            >
              {clearing ? "Clearing…" : "Clear bought items"}
            </button>
          </div>
          <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #E4E3DE", padding: "4px 16px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
            {purchased.map((item, i) => (
              <ItemRow key={item.id} item={item} isFirst={i === 0} busy={busyId === item.id} onToggle={() => togglePurchased(item)} onRemove={() => removeItem(item.id)} onCategoryChange={(cat) => changeCategory(item, cat)} />
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#B0B7C8", marginTop: 8, textAlign: "center" }}>
            Bought items clear automatically after a day.
          </div>
        </>
      )}
    </Screen>
  );
}

function ItemRow({ item, isFirst, busy, onToggle, onRemove, onCategoryChange }: {
  item: Item; isFirst: boolean; busy: boolean; onToggle: () => void; onRemove: () => void; onCategoryChange: (cat: ShoppingCategory) => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      borderTop: isFirst ? "none" : "1px solid #F0F3F8",
      padding: "12px 0",
    }}>
      <button
        onClick={onToggle}
        disabled={busy}
        aria-label={item.isPurchased ? "Mark as not bought" : "Mark as bought"}
        style={{
          width: 24, height: 24, borderRadius: "50%", flexShrink: 0, cursor: busy ? "not-allowed" : "pointer",
          border: item.isPurchased ? "none" : "2px solid #E4E3DE",
          background: item.isPurchased ? "#1E7D52" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
        }}
      >
        {item.isPurchased && (
          <svg width={14} height={14} viewBox="0 0 24 24" {...STR} stroke="#fff"><polyline points="20 6 9 17 4 12"/></svg>
        )}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600,
          color: item.isPurchased ? "#9CA3AF" : "#0F172A",
          textDecoration: item.isPurchased ? "line-through" : "none",
        }}>
          {item.name}{item.quantity ? ` · ${item.quantity}` : ""}
        </div>
        <div style={{ fontSize: 11, color: "#B0B7C8", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
          <span>Added by {item.adder?.name ?? "someone"}</span>
          {!item.isPurchased && (
            <>
              <span>·</span>
              <select
                value={item.category}
                onChange={(e) => onCategoryChange(e.target.value as ShoppingCategory)}
                disabled={busy}
                style={{ fontSize: 11, color: "#B0B7C8", border: "none", background: "transparent", fontFamily: FONT, cursor: busy ? "not-allowed" : "pointer", padding: 0 }}
              >
                {CATEGORY_ORDER.map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c as ShoppingCategory]}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      <button
        onClick={onRemove}
        disabled={busy}
        aria-label="Remove item"
        style={{ background: "none", border: "none", cursor: busy ? "not-allowed" : "pointer", color: "#C0C5D0", padding: 6, flexShrink: 0 }}
      >
        <IcTrash />
      </button>
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    background: bg, color: "#fff", border: "none", borderRadius: 50,
    padding: "14px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer",
    fontFamily: FONT, textDecoration: "none",
  };
}

function Screen({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F5F4F0", fontFamily: FONT }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #E4E3DE", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#4B5563", display: "flex", padding: 4 }}>
            <IcBack />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: 0, flex: 1 }}>{title}</h1>
        </div>
      </div>
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "20px 20px 40px 20px", paddingBottom: 96 }}>
        {children}
      </main>
    </div>
  );
}
