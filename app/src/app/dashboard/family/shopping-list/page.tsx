"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATALOG_ITEMS, CATALOG_SLUG_ORDER } from "@/lib/shoppingCatalog";
import { DEFAULT_CATEGORIES } from "@/lib/shoppingCategories";
import { markSeen } from "@/lib/listBadges";
import HamburgerMenu from "@/components/HamburgerMenu";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

// Polling interval for near-real-time sync. There's no websocket/push
// infrastructure in this app yet, so a short poll is the pragmatic v1
// choice — see PRODUCT_SPEC.md 4b.8 (open question 2 in the 2026-07-27 order).
// Add/toggle/remove no longer wait on this poll — they update the list
// immediately (optimistic) and only rely on polling to pick up changes
// made by other household members.
const POLL_MS = 5000;

function IcBack()  { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6"/></svg>; }
function IcPlus()  { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function IcTrash() { return <svg width={16} height={16} viewBox="0 0 24 24" {...STR}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>; }
function IcLock()  { return <svg width={32} height={32} viewBox="0 0 24 24" {...STR} strokeWidth={1.5}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }
function IcShare() { return <svg width={19} height={19} viewBox="0 0 24 24" {...STR}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.5" x2="15.4" y2="6.5"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/></svg>; }
function IcChevron({ open }: { open: boolean }) { return <svg width={14} height={14} viewBox="0 0 24 24" {...STR} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}><polyline points="6 9 12 15 18 9"/></svg>; }
function IcSettings() { return <svg width={14} height={14} viewBox="0 0 24 24" {...STR}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }
function IcUp()    { return <svg width={13} height={13} viewBox="0 0 24 24" {...STR}><polyline points="18 15 12 9 6 15"/></svg>; }
function IcDown()  { return <svg width={13} height={13} viewBox="0 0 24 24" {...STR}><polyline points="6 9 12 15 18 9"/></svg>; }

type Category = { id: string; slug: string | null; label: string; icon: string; sortOrder: number };

type Item = {
  id: string;
  name: string;
  quantity: string | null;
  categoryId: string | null;
  categoryDef: { id: string; label: string; icon: string; slug: string | null } | null;
  isPurchased: boolean;
  addedBy: string;
  adder: { id: string; name: string | null } | null;
  purchaser: { id: string; name: string | null } | null;
};

const UNSORTED_LABEL = "Unsorted";
const UNSORTED_ICON = "❔";

function sortByName(items: Item[]): Item[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "sv", { sensitivity: "base" }));
}

export default function ShoppingListPage() {
  const { status } = useSession();
  const router = useRouter();

  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [access, setAccess] = useState<"LOADING" | "NO_HOUSEHOLD" | "LOCKED" | "PRO" | "TRIAL">("LOADING");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [recent, setRecent] = useState<{ name: string; icon: string }[]>([]);
  const [showBrowse, setShowBrowse] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareFlash, setShareFlash] = useState<string | null>(null);

  const [showManage, setShowManage] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchItems();
      fetchCategories();
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

  async function fetchCategories() {
    try {
      const res = await fetch("/api/family/shopping-list/categories");
      const data = await res.json();
      setCategories(data.categories ?? []);
    } catch (e) {
      console.error(e);
    }
  }

  // ---- Add / toggle / remove / recategorize: all optimistic. The list
  // updates instantly; the network call happens in the background and only
  // rolls back on failure. Fixes the "feels laggy" complaint from before,
  // where every action waited for a POST/PATCH/DELETE *and then* a full
  // re-fetch before anything moved on screen.

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticItem: Item = {
      id: tempId,
      name: trimmedName,
      quantity: quantity.trim() || null,
      categoryId: null,
      categoryDef: null,
      isPurchased: false,
      addedBy: "",
      adder: null,
      purchaser: null,
    };
    setItems((prev) => [optimisticItem, ...prev]);
    setName("");
    setQuantity("");
    setError("");
    setAdding(true);
    try {
      const res = await fetch("/api/family/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, quantity: optimisticItem.quantity ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== tempId));
        setError(data.error ?? "Something went wrong");
      } else {
        setItems((prev) => prev.map((i) => (i.id === tempId ? data : i)));
        fetch("/api/family/shopping-list/suggestions").then((r) => r.json()).then((d) => setRecent(d.recent ?? [])).catch(() => {});
      }
    } catch {
      setItems((prev) => prev.filter((i) => i.id !== tempId));
      setError("Network error");
    } finally {
      setAdding(false);
    }
  }

  async function togglePurchased(item: Item) {
    const wasPurchased = item.isPurchased;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isPurchased: !wasPurchased } : i)));
    try {
      const res = await fetch(`/api/family/shopping-list/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPurchased: !wasPurchased }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      } else {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isPurchased: wasPurchased } : i)));
      }
    } catch (e) {
      console.error(e);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isPurchased: wasPurchased } : i)));
    }
  }

  async function changeCategory(item: Item, categoryId: string | null) {
    const prevCategoryId = item.categoryId;
    const prevCategoryDef = item.categoryDef;
    const nextDef = categories.find((c) => c.id === categoryId) ?? null;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, categoryId, categoryDef: nextDef } : i)));
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/family/shopping-list/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      } else {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, categoryId: prevCategoryId, categoryDef: prevCategoryDef } : i)));
      }
    } catch (e) {
      console.error(e);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, categoryId: prevCategoryId, categoryDef: prevCategoryDef } : i)));
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(id: string) {
    const removed = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      const res = await fetch(`/api/family/shopping-list/${id}`, { method: "DELETE" });
      if (!res.ok && removed) setItems((prev) => [...prev, removed]);
    } catch (e) {
      console.error(e);
      if (removed) setItems((prev) => [...prev, removed]);
    }
  }

  async function clearBought() {
    const previous = items;
    setItems((prev) => prev.filter((i) => !i.isPurchased));
    setClearing(true);
    try {
      const res = await fetch("/api/family/shopping-list", { method: "DELETE" });
      if (!res.ok) setItems(previous);
    } catch (e) {
      console.error(e);
      setItems(previous);
    } finally {
      setClearing(false);
    }
  }

  // Used by the "Recent" chips and the category browse panel — same POST as
  // the manual add form, just skipping the quantity field.
  async function quickAdd(itemName: string) {
    if (!itemName.trim() || adding) return;
    const tempId = `temp-${Date.now()}`;
    setItems((prev) => [{ id: tempId, name: itemName, quantity: null, categoryId: null, categoryDef: null, isPurchased: false, addedBy: "", adder: null, purchaser: null }, ...prev]);
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
        setItems((prev) => prev.filter((i) => i.id !== tempId));
        setError(data.error ?? "Something went wrong");
      } else {
        const data = await res.json();
        setItems((prev) => prev.map((i) => (i.id === tempId ? data : i)));
      }
    } catch {
      setItems((prev) => prev.filter((i) => i.id !== tempId));
      setError("Network error");
    } finally {
      setAdding(false);
    }
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    const label = newCatLabel.trim();
    if (!label) return;
    setAddingCat(true);
    try {
      const res = await fetch("/api/family/shopping-list/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (res.ok) {
        setNewCatLabel("");
        await fetchCategories();
      }
    } finally {
      setAddingCat(false);
    }
  }

  async function renameCategory(id: string) {
    const label = renameValue.trim();
    setRenamingId(null);
    if (!label) return;
    const previous = categories;
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)));
    const res = await fetch(`/api/family/shopping-list/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    if (!res.ok) setCategories(previous);
    else fetchItems();
  }

  async function moveCategory(id: string, direction: "up" | "down") {
    const previous = categories;
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((c) => c.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= sorted.length) return;
    [sorted[idx].sortOrder, sorted[swapIdx].sortOrder] = [sorted[swapIdx].sortOrder, sorted[idx].sortOrder];
    setCategories(sorted);
    const res = await fetch(`/api/family/shopping-list/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ move: direction }),
    });
    if (!res.ok) setCategories(previous);
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

  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const groups: { key: string; label: string; icon: string; items: Item[] }[] = [
    ...sortedCategories.map((c) => ({ key: c.id, label: c.label, icon: c.icon, items: sortByName(pending.filter(i => i.categoryId === c.id)) })),
    { key: "unsorted", label: UNSORTED_LABEL, icon: UNSORTED_ICON, items: sortByName(pending.filter(i => !i.categoryId)) },
  ].filter(g => g.items.length > 0);

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
            disabled={!name.trim()}
            style={{
              width: 48, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              background: "#1C1C28", color: "#fff", border: "none", borderRadius: 12,
              cursor: !name.trim() ? "not-allowed" : "pointer", opacity: !name.trim() ? 0.5 : 1,
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
              {r.icon} {r.name}
            </button>
          ))}
        </div>
      )}

      {/* Browse common items by aisle — quick-add without typing. */}
      <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
        <button
          onClick={() => setShowBrowse((v) => !v)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#4A5FD5", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "0 2px", fontFamily: FONT }}
        >
          Browse common items <IcChevron open={showBrowse} />
        </button>
        <button
          onClick={() => setShowManage((v) => !v)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#4A5FD5", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "0 2px", fontFamily: FONT }}
        >
          <IcSettings /> Manage categories
        </button>
      </div>

      {showManage && (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E4E3DE", padding: "6px 14px", marginBottom: 18 }}>
          {sortedCategories.map((c, i) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 0", borderTop: i === 0 ? "none" : "1px solid #F0F3F8" }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{c.icon}</span>
              {renamingId === c.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => renameCategory(c.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") renameCategory(c.id); if (e.key === "Escape") setRenamingId(null); }}
                  style={{ flex: 1, minWidth: 0, fontSize: 13, fontFamily: FONT, border: "1.5px solid #C7CDF5", borderRadius: 8, padding: "4px 8px", outline: "none" }}
                />
              ) : (
                <button
                  onClick={() => { setRenamingId(c.id); setRenameValue(c.label); }}
                  style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", fontSize: 13, fontWeight: 600, color: "#0F172A", cursor: "pointer", fontFamily: FONT, padding: 0 }}
                >
                  {c.label}
                </button>
              )}
              <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                <button onClick={() => moveCategory(c.id, "up")} disabled={i === 0} aria-label="Move up" style={reorderBtnStyle(i === 0)}><IcUp /></button>
                <button onClick={() => moveCategory(c.id, "down")} disabled={i === sortedCategories.length - 1} aria-label="Move down" style={reorderBtnStyle(i === sortedCategories.length - 1)}><IcDown /></button>
              </div>
            </div>
          ))}
          <form onSubmit={addCategory} style={{ display: "flex", gap: 8, padding: "10px 0 8px", borderTop: "1px solid #F0F3F8" }}>
            <input
              value={newCatLabel}
              onChange={(e) => setNewCatLabel(e.target.value)}
              placeholder="Add a category…"
              style={{ flex: 1, minWidth: 0, fontSize: 13, fontFamily: FONT, border: "1.5px solid #E4E3DE", borderRadius: 8, padding: "7px 10px", outline: "none" }}
            />
            <button
              type="submit"
              disabled={addingCat || !newCatLabel.trim()}
              style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", background: "#1C1C28", border: "none", borderRadius: 8, padding: "0 14px", cursor: addingCat || !newCatLabel.trim() ? "not-allowed" : "pointer", opacity: addingCat || !newCatLabel.trim() ? 0.5 : 1, fontFamily: FONT }}
            >
              Add
            </button>
          </form>
        </div>
      )}

      {showBrowse && (
        <div style={{ marginBottom: 18 }}>
          {CATALOG_SLUG_ORDER.map((slug) => {
            const def = categories.find((c) => c.slug === slug) ?? DEFAULT_CATEGORIES.find((d) => d.slug === slug);
            if (!def) return null;
            return (
              <div key={slug} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.04em", textTransform: "uppercase", margin: "0 2px 6px", display: "flex", alignItems: "center", gap: 5 }}>
                  <span>{def.icon}</span>{def.label}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {CATALOG_ITEMS[slug].map((itemName) => (
                    <button key={itemName} onClick={() => quickAdd(itemName)} disabled={adding} style={chipStyle}>
                      + {itemName}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
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
        <div style={{ background: "#fff", border: "1px solid #E4E3DE", borderRadius: 18, padding: "4px 16px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", marginBottom: 24 }}>
          {groups.map((group, gi) => (
            <div key={group.key}>
              <div style={{
                fontSize: 11, fontWeight: 800, color: "#9CA3AF", letterSpacing: "0.04em", textTransform: "uppercase",
                padding: gi === 0 ? "10px 0 4px" : "14px 0 4px", borderTop: gi === 0 ? "none" : "1px solid #F0F3F8",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span>{group.icon}</span>{group.label}
              </div>
              {group.items.map((item, i) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  isFirst={i === 0}
                  busy={busyId === item.id}
                  categories={categories}
                  onToggle={() => togglePurchased(item)}
                  onRemove={() => removeItem(item.id)}
                  onCategoryChange={(catId) => changeCategory(item, catId)}
                />
              ))}
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
              <ItemRow key={item.id} item={item} isFirst={i === 0} busy={busyId === item.id} categories={categories} onToggle={() => togglePurchased(item)} onRemove={() => removeItem(item.id)} onCategoryChange={(catId) => changeCategory(item, catId)} />
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#B0B7C8", marginTop: 8, textAlign: "center" }}>
            Bought items stay here until you clear them — handy since you often buy the same things again.
          </div>
        </>
      )}
    </Screen>
  );
}

function ItemRow({ item, isFirst, busy, categories, onToggle, onRemove, onCategoryChange }: {
  item: Item; isFirst: boolean; busy: boolean; categories: Category[]; onToggle: () => void; onRemove: () => void; onCategoryChange: (categoryId: string | null) => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      borderTop: isFirst ? "none" : "1px solid #F0F3F8",
      padding: "12px 0",
    }}>
      <button
        onClick={onToggle}
        aria-label={item.isPurchased ? "Mark as not bought" : "Mark as bought"}
        style={{
          width: 24, height: 24, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
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
        {!item.isPurchased && (
          <div style={{ fontSize: 11, color: "#B0B7C8", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
            <select
              value={item.categoryId ?? ""}
              onChange={(e) => onCategoryChange(e.target.value || null)}
              disabled={busy}
              style={{ fontSize: 11, color: "#B0B7C8", border: "none", background: "transparent", fontFamily: FONT, cursor: busy ? "not-allowed" : "pointer", padding: 0 }}
            >
              <option value="">{UNSORTED_ICON} {UNSORTED_LABEL}</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <button
        onClick={onRemove}
        aria-label="Remove item"
        style={{ background: "none", border: "none", cursor: "pointer", color: "#C0C5D0", padding: 6, flexShrink: 0 }}
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

function reorderBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
    background: "#F5F4F0", border: "none", borderRadius: 6, color: disabled ? "#D8D6CE" : "#6B7280",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

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
