"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORY_LABELS, CATEGORY_ORDER, CATEGORY_ICONS } from "@/lib/shoppingCategories";
import { CATALOG_ITEMS, CATALOG_CATEGORY_ORDER } from "@/lib/shoppingCatalog";
import { markSeen } from "@/lib/listBadges";
import HamburgerMenu from "@/components/HamburgerMenu";

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
function IcShare() { return <svg width={19} height={19} viewBox="0 0 24 24" {...STR}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.5" x2="15.4" y2="6.5"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/></svg>; }
function IcChevron({ open }: { open: boolean }) { return <svg width={14} height={14} viewBox="0 0 24 24" {...STR} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}><polyline points="6 9 12 15 18 9"/></svg>; }

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
  const [recent, setRecent] = useState<{ name: string; category: ShoppingCategory }[]>([]);
  const [showBrowse, setShowBrowse] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareFlash, setShareFlash] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchItems();
      fetch("/api/family/shopping-list/suggestions")
        .then((r) => r.json())
        .then((d) => setRecent(d.recent ?? []))
        .catch(() => {});
      fetch("/api/family/shopping-list/share")
        .then((r) => r.json())
        .then((d) => { if (d.url) setShareUrl(d.url); })
        .catch(() => {});
    }
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

  // Used by the "Recent" chips and the category browse panel — same POST as
  // the manual add form, just skipping the quantity field.
  async function quickAdd(itemName: string) {
    if (!itemName.trim() || adding) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/family/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: itemName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong");
      } else {
        await fetchItems();
      }
    } catch {
      setError("Network error");
    } finally {
      setAdding(false);
    }
  }

  async function shareList() {
    setShareLoading(true);
    try {
      let url = shareUrl;
      if (!url) {
        const res = await fetch("/api/family/shopping-list/share", { method: "POST" });
        const data = await res.json();
        if (!res.ok) return;
        url = data.url;
        setShareUrl(url);
      }
      if (!url) return;
      if (typeof navigator !== "undefined" && "share" in navigator) {
        try {
          await navigator.share({ title: "Our shopping list", url });
          return;
        } catch {
          // User cancelled the native share sheet, or it's not fully supported — fall back to copy.
        }
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShareFlash("Link copied!");
        setTimeout(() => setShareFlash(null), 2000);
      }
    } finally {
      setShareLoading(false);
    }
  }

  async function turnOffShare() {
    setShareLoading(true);
    try {
      await fetch("/api/family/shopping-list/share", { method: "DELETE" });
      setShareUrl(null);
    } finally {
      setShareLoading(false);
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
    <Screen
      title="Shopping list"
      onBack={() => router.push("/dashboard/family")}
      headerExtra={
        <button
          onClick={shareList}
          disabled={shareLoading}
          aria-label="Share list"
          style={{ background: "none", border: "none", cursor: shareLoading ? "not-allowed" : "pointer", color: "#4B5563", display: "flex", padding: 4, position: "relative" }}
        >
          <IcShare />
          {shareFlash && (
            <span style={{ position: "absolute", top: 28, right: 0, background: "#1C1C28", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 8, whiteSpace: "nowrap" }}>
              {shareFlash}
            </span>
          )}
        </button>
      }
    >

      {shareUrl && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "#EEF0FC", border: "1px solid #C7CDF5", borderRadius: 14, padding: "10px 14px", marginBottom: 16, fontSize: 12.5, color: "#3A4FC5" }}>
          <span>🔗 Shared with a link — anyone with it can view and edit.</span>
          <button onClick={turnOffShare} disabled={shareLoading} style={{ background: "none", border: "none", color: "#3A4FC5", fontWeight: 700, fontSize: 12, cursor: shareLoading ? "not-allowed" : "pointer", flexShrink: 0, fontFamily: FONT, textDecoration: "underline" }}>
            Turn off
          </button>
        </div>
      )}

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

      {/* Recent items — one-tap re-add, sourced from the household's category memory. */}
      {recent.length > 0 && (
        <div style={{ marginBottom: 14, overflowX: "auto", display: "flex", gap: 8, paddingBottom: 2 }}>
          {recent.slice(0, 10).map((r) => (
            <button
              key={r.name}
              onClick={() => quickAdd(r.name)}
              disabled={adding}
              style={chipStyle}
            >
              {CATEGORY_ICONS[r.category]} {r.name}
            </button>
          ))}
        </div>
      )}

      {/* Browse common items by aisle — quick-add without typing. */}
      <button
        onClick={() => setShowBrowse((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#4A5FD5", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "0 2px 14px", fontFamily: FONT }}
      >
        Browse common items <IcChevron open={showBrowse} />
      </button>

      {showBrowse && (
        <div style={{ marginBottom: 18 }}>
          {CATALOG_CATEGORY_ORDER.map((category) => (
            <div key={category} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.04em", textTransform: "uppercase", margin: "0 2px 6px", display: "flex", alignItems: "center", gap: 5 }}>
                <span>{CATEGORY_ICONS[category]}</span>{CATEGORY_LABELS[category]}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {CATALOG_ITEMS[category].map((itemName) => (
                  <button key={itemName} onClick={() => quickAdd(itemName)} disabled={adding} style={chipStyle}>
                    + {itemName}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* To buy, grouped by category */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", letterSpacing: "0.01em" }}>To buy</span>
        {pending.length > 0 && (
          <span style={{
            background: "#4A5FD5", color: "#fff", fontSize: 12, fontWeight: 800,
            borderRadius: 999, padding: "1px 9px", lineHeight: "18px", minWidth: 18, textAlign: "center",
          }}>
            {pending.length}
          </span>
        )}
      </div>

      {pending.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0 32px", color: "#9CA3AF", fontSize: 13 }}>
          Nothing on the list right now.
        </div>
      ) : (
        <div style={{ marginBottom: 24 }}>
          {grouped.map(group => (
            <div key={group.category} style={{ marginBottom: 16 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 7,
                background: "#4A5FD5", color: "#fff",
                borderRadius: 10, padding: "7px 14px", marginBottom: 0,
                fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase",
              }}>
                <span style={{ fontSize: 14 }}>{CATEGORY_ICONS[group.category]}</span>
                {CATEGORY_LABELS[group.category]}
              </div>
              <div style={{ background: "#fff", borderRadius: "0 0 18px 18px", border: "1px solid #E4E3DE", borderTop: "none", padding: "4px 16px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#2A9D6F" }}>
              <span>✓</span> Already in the cart ({purchased.length})
            </div>
            <button
              onClick={clearBought}
              disabled={clearing}
              style={{
                background: "#fff", border: "1.5px solid #2A9D6F", color: "#2A9D6F",
                fontSize: 12, fontWeight: 700, borderRadius: 999, padding: "5px 12px",
                cursor: clearing ? "not-allowed" : "pointer", opacity: clearing ? 0.6 : 1, fontFamily: FONT,
              }}
            >
              {clearing ? "Clearing…" : "Clear bought items"}
            </button>
          </div>
          <div style={{ background: "rgba(42,157,111,0.06)", borderRadius: 18, border: "1px solid rgba(42,157,111,0.25)", padding: "4px 16px" }}>
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
          background: item.isPurchased ? "#2A9D6F" : "transparent",
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

const chipStyle: React.CSSProperties = {
  flexShrink: 0, whiteSpace: "nowrap", background: "#fff", border: "1.5px solid #E4E3DE",
  borderRadius: 999, padding: "7px 13px", fontSize: 13, fontWeight: 600, color: "#0F172A",
  cursor: "pointer", fontFamily: FONT,
};

function btnStyle(bg: string): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    background: bg, color: "#fff", border: "none", borderRadius: 50,
    padding: "14px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer",
    fontFamily: FONT, textDecoration: "none",
  };
}

function Screen({ title, onBack, headerExtra, children }: { title: string; onBack: () => void; headerExtra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F5F4F0", fontFamily: FONT }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #E4E3DE", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#4B5563", display: "flex", padding: 4 }}>
            <IcBack />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: 0, flex: 1 }}>{title}</h1>
          {headerExtra}
          <HamburgerMenu />
        </div>
      </div>
      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "20px 20px 40px 20px", paddingBottom: 96 }}>
        {children}
      </main>
    </div>
  );
}
