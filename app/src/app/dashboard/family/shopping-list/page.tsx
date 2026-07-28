"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATALOG_ITEMS, CATALOG_SLUG_ORDER } from "@/lib/shoppingCatalog";
import { DEFAULT_CATEGORIES } from "@/lib/shoppingCategories";
import { markSeen } from "@/lib/listBadges";
import HamburgerMenu from "@/components/HamburgerMenu";
import ListAccessPanel, { type ListMemberOption } from "@/components/ListAccessPanel";

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
function IcLink()  { return <svg width={13} height={13} viewBox="0 0 24 24" {...STR}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>; }

type Category = { id: string; slug: string | null; label: string; icon: string; sortOrder: number };

type ListInfo = { id: string; name: string; visibleToAll: boolean; memberIds: string[]; isMine: boolean };

type Item = {
  id: string;
  name: string;
  quantity: string | null;
  note: string | null;
  url: string | null;
  imageUrl: string | null;
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

  const [access, setAccess] = useState<"LOADING" | "NO_HOUSEHOLD" | "LOCKED" | "PRO" | "TRIAL">("LOADING");

  const [lists, setLists] = useState<ListInfo[]>([]);
  const [canEditAccess, setCanEditAccess] = useState(false);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [addingList, setAddingList] = useState(false);
  const [showAccessPanel, setShowAccessPanel] = useState(false);
  const [members, setMembers] = useState<ListMemberOption[]>([]);

  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [note, setNote] = useState("");
  const [url, setUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [recent, setRecent] = useState<{ name: string; icon: string }[]>([]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareFlash, setShareFlash] = useState<string | null>(null);

  const [showManage, setShowManage] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // 2026-07-28: "add an item" moved from an always-visible form to a "+"
  // button that opens this sheet with four ways in — Recent / Categories /
  // Create new / Scan barcode — per direct feedback that the old form took
  // too much space.
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addTab, setAddTab] = useState<"recent" | "categories" | "create" | "scan">("recent");
  const [storeMode, setStoreMode] = useState(false);

  // Barcode scanning — uses the browser's native BarcodeDetector API only
  // (Chrome/Edge on Android and desktop; no support in Safari/Firefox yet).
  // No new npm dependency, so it's fully testable once `npm install` isn't
  // even needed. A zxing-based fallback for unsupported browsers is a
  // documented next step, not built this round (see TODO.md 19c) — couldn't
  // be verified without a real device anyway.
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchLists();
      fetchCategories();
      fetch("/api/family/shopping-list/suggestions")
        .then((r) => r.json())
        .then((d) => setRecent(d.recent ?? []))
        .catch(() => {});
    }
  }, [status]);

  useEffect(() => {
    if (!activeListId) return;
    fetchItems(activeListId);
    fetch(`/api/family/lists/${activeListId}/share`)
      .then((r) => r.json())
      .then((d) => setShareUrl(d.url ?? null))
      .catch(() => {});
  }, [activeListId]);

  // Lightweight polling so household members see each other's changes without
  // reopening the app. Paused when the tab isn't visible to avoid wasted requests.
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (status !== "authenticated" || !activeListId) return;

    function startPolling() {
      if (pollRef.current) return;
      pollRef.current = setInterval(() => {
        if (document.visibilityState === "visible" && activeListId) fetchItems(activeListId);
      }, POLL_MS);
    }
    function stopPolling() {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
    function onVisibility() {
      if (document.visibilityState === "visible" && activeListId) { fetchItems(activeListId); startPolling(); }
    }

    startPolling();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [status, activeListId]);

  async function fetchLists() {
    try {
      const res = await fetch("/api/family/lists?kind=SHOPPING");
      const data = await res.json();
      setAccess(data.access ?? "NO_HOUSEHOLD");
      const fetched: ListInfo[] = data.lists ?? [];
      setLists(fetched);
      setCanEditAccess(!!data.canEditAccess);
      setActiveListId((prev) => (prev && fetched.some((l) => l.id === prev)) ? prev : (fetched[0]?.id ?? null));
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchItems(listId: string) {
    try {
      const res = await fetch(`/api/family/shopping-list?listId=${listId}`);
      const data = await res.json();
      setItems(data.items ?? []);
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

  async function fetchMembers() {
    try {
      const res = await fetch("/api/family/members");
      const data = await res.json();
      setMembers(data.members ?? []);
    } catch (e) {
      console.error(e);
    }
  }

  async function createList(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newListName.trim();
    if (!trimmed) return;
    setAddingList(true);
    try {
      const res = await fetch("/api/family/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "SHOPPING", name: trimmed }),
      });
      if (res.ok) {
        const created = await res.json();
        setNewListName("");
        setShowNewList(false);
        await fetchLists();
        setActiveListId(created.id);
      }
    } finally {
      setAddingList(false);
    }
  }

  async function renameList(newName: string) {
    if (!activeListId) return;
    setLists((prev) => prev.map((l) => (l.id === activeListId ? { ...l, name: newName } : l)));
    await fetch(`/api/family/lists/${activeListId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
  }

  async function toggleVisibleToAll(value: boolean) {
    if (!activeListId) return;
    setLists((prev) => prev.map((l) => (l.id === activeListId ? { ...l, visibleToAll: value } : l)));
    await fetch(`/api/family/lists/${activeListId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibleToAll: value }),
    });
  }

  async function toggleMember(userId: string) {
    if (!activeListId) return;
    const current = lists.find((l) => l.id === activeListId);
    if (!current) return;
    const nextIds = current.memberIds.includes(userId)
      ? current.memberIds.filter((id) => id !== userId)
      : [...current.memberIds, userId];
    setLists((prev) => prev.map((l) => (l.id === activeListId ? { ...l, memberIds: nextIds } : l)));
    await fetch(`/api/family/lists/${activeListId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberIds: nextIds }),
    });
  }

  // ---- Add / toggle / remove / recategorize: all optimistic. The list
  // updates instantly; the network call happens in the background and only
  // rolls back on failure.

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || !activeListId) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticItem: Item = {
      id: tempId,
      name: trimmedName,
      quantity: quantity.trim() || null,
      note: note.trim() || null,
      url: url.trim() || null,
      imageUrl: imageUrl.trim() || null,
      categoryId: null,
      categoryDef: null,
      isPurchased: false,
      addedBy: "",
      adder: null,
      purchaser: null,
    };
    setItems((prev) => [optimisticItem, ...prev]);
    setName(""); setQuantity(""); setNote(""); setUrl(""); setImageUrl(""); setShowDetails(false);
    setError("");
    try {
      const res = await fetch("/api/family/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listId: activeListId, name: trimmedName,
          quantity: optimisticItem.quantity ?? undefined,
          note: optimisticItem.note ?? undefined,
          url: optimisticItem.url ?? undefined,
          imageUrl: optimisticItem.imageUrl ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== tempId));
        setError(data.error ?? "Something went wrong");
      } else {
        setItems((prev) => prev.map((i) => (i.id === tempId ? data : i)));
        fetch("/api/family/shopping-list/suggestions").then((r) => r.json()).then((d) => setRecent(d.recent ?? [])).catch(() => {});
        closeAddSheet();
      }
    } catch {
      setItems((prev) => prev.filter((i) => i.id !== tempId));
      setError("Network error");
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
    if (!activeListId) return;
    const previous = items;
    setItems((prev) => prev.filter((i) => !i.isPurchased));
    setClearing(true);
    try {
      const res = await fetch(`/api/family/shopping-list?listId=${activeListId}`, { method: "DELETE" });
      if (!res.ok) setItems(previous);
    } catch (e) {
      console.error(e);
      setItems(previous);
    } finally {
      setClearing(false);
    }
  }

  async function quickAdd(itemName: string) {
    if (!itemName.trim() || !activeListId) return;
    const tempId = `temp-${Date.now()}`;
    setItems((prev) => [{ id: tempId, name: itemName, quantity: null, note: null, url: null, imageUrl: null, categoryId: null, categoryDef: null, isPurchased: false, addedBy: "", adder: null, purchaser: null }, ...prev]);
    setError("");
    try {
      const res = await fetch("/api/family/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: activeListId, name: itemName }),
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
    }
  }

  function closeAddSheet() {
    stopScan();
    setScanError(null);
    setScanStatus(null);
    setAddSheetOpen(false);
  }

  function quickAddAndClose(itemName: string) {
    quickAdd(itemName);
    closeAddSheet();
  }

  // ---- Barcode scanning (BarcodeDetector, native browser API only) ----

  function stopScan() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  async function startScan() {
    setScanError(null);
    setScanStatus(null);
    if (!("BarcodeDetector" in window)) {
      setScanError("Barcode scanning isn't supported in this browser yet — try Chrome on Android, or add the item manually.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      detectLoop();
    } catch {
      setScanError("Couldn't access the camera — check your browser's camera permission for this site.");
    }
  }

  function detectLoop() {
    // BarcodeDetector isn't in TypeScript's DOM lib yet (Chrome/Edge-only
    // API) — feature-detected above, so this cast is safe at runtime.
    const BarcodeDetectorCtor = (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    const detector = new BarcodeDetectorCtor({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
    const tick = async () => {
      if (!streamRef.current || !videoRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes.length > 0) {
          stopScan();
          await lookupBarcode(codes[0].rawValue);
          return;
        }
      } catch {
        // Detection hiccup on one frame — keep trying rather than aborting.
      }
      if (streamRef.current) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  async function lookupBarcode(code: string) {
    setScanStatus("Looking up product…");
    try {
      // Open Food Facts — free, public, no API key. Coverage is strongest
      // for EU grocery products; a miss just falls back to manual entry.
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
      const data = await res.json().catch(() => null);
      const productName: string | undefined = data?.product?.product_name || data?.product?.product_name_en;
      if (productName) {
        quickAddAndClose(productName);
      } else {
        setScanError(`No product found for barcode ${code} — add it manually instead.`);
      }
    } catch {
      setScanError("Couldn't look up that barcode — check your connection and try again.");
    } finally {
      setScanStatus(null);
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
    else if (activeListId) fetchItems(activeListId);
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
    if (!activeListId) return;
    setShareLoading(true);
    try {
      let urlOut = shareUrl;
      if (!urlOut) {
        const res = await fetch(`/api/family/lists/${activeListId}/share`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) return;
        urlOut = data.url;
        setShareUrl(urlOut);
      }
      if (!urlOut) return;
      if (typeof navigator !== "undefined" && "share" in navigator) {
        try {
          await navigator.share({ title: "Our shopping list", url: urlOut });
          return;
        } catch {
          // User cancelled the native share sheet, or it's not fully supported — fall back to copy.
        }
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(urlOut);
        setShareFlash("Link copied!");
        setTimeout(() => setShareFlash(null), 2000);
      }
    } finally {
      setShareLoading(false);
    }
  }

  async function turnOffShare() {
    if (!activeListId) return;
    setShareLoading(true);
    try {
      await fetch(`/api/family/lists/${activeListId}/share`, { method: "DELETE" });
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

  const activeList = lists.find((l) => l.id === activeListId);
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
      // 2026-07-28: share-link UI intentionally removed per direct instruction
      // ("vi vill inte kunna dela listan så, dölj det"). shareList/turnOffShare
      // and the underlying Household/List share-token infra are left untouched
      // below in case this comes back later — only the UI is hidden.
    >
      {/* List switcher */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, marginBottom: 10 }}>
        {lists.map((l) => (
          <button
            key={l.id}
            onClick={() => setActiveListId(l.id)}
            style={{
              flexShrink: 0, whiteSpace: "nowrap", borderRadius: 999, padding: "7px 14px", fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer",
              border: l.id === activeListId ? "none" : "1px solid #E4E3DE",
              background: l.id === activeListId ? "#1C1C28" : "#fff",
              color: l.id === activeListId ? "#fff" : "#4B5563",
            }}
          >
            {l.name}
          </button>
        ))}
        <button onClick={() => setShowNewList((v) => !v)} style={{ flexShrink: 0, background: "none", border: "1.5px dashed #C7CDF5", borderRadius: 999, padding: "7px 14px", fontSize: 13, fontWeight: 700, color: "#4A5FD5", cursor: "pointer", fontFamily: FONT }}>
          + New list
        </button>
      </div>

      {showNewList && (
        <form onSubmit={createList} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="e.g. IKEA, weekly groceries…"
            style={{ flex: 1, minWidth: 0, fontSize: 13, fontFamily: FONT, border: "1.5px solid #E4E3DE", borderRadius: 10, padding: "9px 12px", outline: "none" }}
          />
          <button type="submit" disabled={addingList || !newListName.trim()} style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", background: "#1C1C28", border: "none", borderRadius: 10, padding: "0 16px", cursor: addingList || !newListName.trim() ? "not-allowed" : "pointer", opacity: addingList || !newListName.trim() ? 0.5 : 1, fontFamily: FONT }}>
            Create
          </button>
        </form>
      )}

      <button
        onClick={() => { setShowAccessPanel((v) => !v); if (!showAccessPanel) fetchMembers(); }}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#4A5FD5", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "0 2px", fontFamily: FONT, marginBottom: 14 }}
      >
        <IcSettings /> {activeList?.visibleToAll ? "Everyone can see this list" : "Only some people can see this list"}
      </button>

      {showAccessPanel && activeList && (
        <ListAccessPanel
          listName={activeList.name}
          visibleToAll={activeList.visibleToAll}
          memberIds={activeList.memberIds}
          members={members}
          canEditAccess={canEditAccess}
          onRename={renameList}
          onToggleVisibleToAll={toggleVisibleToAll}
          onToggleMember={toggleMember}
        />
      )}

      {/* Add item entry points — 2026-07-28: replaced the always-visible form
          (name/qty/note/link/image, all the time) with a "+" button that
          opens a sheet — Recent / Categories / Create new / Scan barcode —
          per direct feedback that the old form took too much space. */}
      <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
        <button
          onClick={() => setStoreMode(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#4A5FD5", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "0 2px", fontFamily: FONT }}
        >
          🏪 Store mode
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

      {/* Floating "+" — same style as Reminders/Chores/Calendar. Opens the
          add sheet below (2026-07-28). */}
      <button
        onClick={() => { setAddTab("recent"); setAddSheetOpen(true); }}
        aria-label="Add item"
        style={{
          position: "fixed", right: 20, bottom: 84, zIndex: 19,
          width: 52, height: 52, borderRadius: "50%",
          background: "#1C1C28", color: "#fff", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 14px rgba(28,28,40,0.35)",
        }}
      >
        <IcPlus />
      </button>

      {addSheetOpen && (
        <div
          onClick={closeAddSheet}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", zIndex: 29, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: "var(--content-max-width)", background: "#fff",
              borderRadius: "20px 20px 0 0", padding: "16px 20px calc(20px + env(safe-area-inset-bottom, 0px))",
              fontFamily: FONT, maxHeight: "80vh", display: "flex", flexDirection: "column",
            }}
          >
            {/* Tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexShrink: 0 }}>
              {([
                ["recent", "Recent"],
                ["categories", "Categories"],
                ["create", "New"],
                ["scan", "Scan"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { if (key !== "scan") stopScan(); setAddTab(key); }}
                  style={{
                    flex: 1, padding: "9px 0", borderRadius: 999, cursor: "pointer", fontFamily: FONT,
                    fontSize: 12.5, fontWeight: 700,
                    border: addTab === key ? "none" : "1.5px solid #E4E3DE",
                    background: addTab === key ? "#1C1C28" : "#fff",
                    color: addTab === key ? "#fff" : "#4B5563",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={{ overflowY: "auto" }}>
              {addTab === "recent" && (
                recent.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#9CA3AF", fontSize: 13 }}>
                    Nothing recent yet — items you add will show up here next time.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingBottom: 8 }}>
                    {recent.map((r) => (
                      <button key={r.name} onClick={() => quickAddAndClose(r.name)} style={chipStyle}>
                        {r.icon} {r.name}
                      </button>
                    ))}
                  </div>
                )
              )}

              {addTab === "categories" && (
                <div style={{ paddingBottom: 8 }}>
                  {CATALOG_SLUG_ORDER.map((slug) => {
                    const def = categories.find((c) => c.slug === slug) ?? DEFAULT_CATEGORIES.find((d) => d.slug === slug);
                    if (!def) return null;
                    return (
                      <div key={slug} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.04em", textTransform: "uppercase", margin: "0 2px 6px", display: "flex", alignItems: "center", gap: 5 }}>
                          <span>{def.icon}</span>{def.label}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {CATALOG_ITEMS[slug].map((itemName) => (
                            <button key={itemName} onClick={() => quickAddAndClose(itemName)} style={chipStyle}>
                              + {itemName}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {addTab === "create" && (
                <form onSubmit={addItem} style={{ paddingBottom: 8 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input
                      autoFocus
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Item name…"
                      style={{ flex: 1, minWidth: 0, padding: "12px 14px", borderRadius: 12, border: "1.5px solid #E4E3DE", fontSize: 15, fontFamily: FONT, outline: "none", boxSizing: "border-box" as const }}
                    />
                    <input
                      value={quantity}
                      onChange={e => setQuantity(e.target.value)}
                      placeholder="Qty"
                      style={{ width: 72, padding: "12px 10px", borderRadius: 12, border: "1.5px solid #E4E3DE", fontSize: 15, fontFamily: FONT, outline: "none", boxSizing: "border-box" as const }}
                    />
                  </div>
                  <button type="button" onClick={() => setShowDetails((v) => !v)} style={{ background: "none", border: "none", color: "#4A5FD5", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: FONT, display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                    <IcChevron open={showDetails} /> Note, link or picture
                  </button>
                  {showDetails && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (e.g. brand, size…)" style={detailInputStyle} />
                      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link (optional)" style={detailInputStyle} />
                      <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL (optional)" style={detailInputStyle} />
                    </div>
                  )}
                  {error && <div style={{ fontSize: 13, color: "#C44444", marginBottom: 8 }}>{error}</div>}
                  <button
                    type="submit"
                    disabled={!name.trim() || !activeListId}
                    style={{
                      width: "100%", padding: "13px", borderRadius: 50,
                      background: "#1C1C28", color: "#fff", border: "none",
                      fontSize: 14, fontWeight: 700, fontFamily: FONT,
                      cursor: !name.trim() ? "not-allowed" : "pointer", opacity: !name.trim() ? 0.5 : 1,
                    }}
                  >
                    Add to list
                  </button>
                </form>
              )}

              {addTab === "scan" && (
                <div style={{ paddingBottom: 8, textAlign: "center" }}>
                  {!scanning ? (
                    <>
                      <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 14, lineHeight: 1.5 }}>
                        Point your camera at a barcode — we'll look it up and add it for you.
                      </div>
                      <button
                        onClick={startScan}
                        style={{ padding: "13px 24px", borderRadius: 50, background: "#1C1C28", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}
                      >
                        📷 Start scanning
                      </button>
                    </>
                  ) : (
                    <>
                      <video ref={videoRef} playsInline muted style={{ width: "100%", borderRadius: 14, background: "#000", marginBottom: 10 }} />
                      <button
                        onClick={stopScan}
                        style={{ padding: "10px 20px", borderRadius: 50, background: "#F0F3FA", border: "none", fontSize: 13, fontWeight: 700, color: "#4B5563", cursor: "pointer", fontFamily: FONT }}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {scanStatus && <div style={{ fontSize: 13, color: "#4A5FD5", marginTop: 12 }}>{scanStatus}</div>}
                  {scanError && <div style={{ fontSize: 13, color: "#C44444", marginTop: 12 }}>{scanError}</div>}
                  <div style={{ fontSize: 11, color: "#B0B7C8", marginTop: 14 }}>
                    Works in Chrome/Edge on Android and most desktops. Recipe-photo import is planned but not built yet — see the roadmap.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Store mode — 2026-07-28: fullscreen, large-text, one-handed view for
          use while actually shopping. */}
      {storeMode && (
        <div style={{ position: "fixed", inset: 0, background: "#F5F4F0", zIndex: 39, fontFamily: FONT, overflowY: "auto" }}>
          <div style={{ position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #E4E3DE", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: "#0F172A" }}>🏪 Store mode</span>
            <button
              onClick={() => setStoreMode(false)}
              style={{ padding: "10px 18px", borderRadius: 50, background: "#1C1C28", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}
            >
              Done
            </button>
          </div>
          <div style={{ padding: "16px 20px 60px" }}>
            {pending.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 16 }}>Nothing left to buy 🎉</div>
            ) : (
              groups.map((g) => (
                <div key={g.key} style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#6B7280", marginBottom: 8 }}>{g.icon} {g.label}</div>
                  <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E4E3DE", overflow: "hidden" }}>
                    {g.items.map((item, i) => (
                      <button
                        key={item.id}
                        onClick={() => togglePurchased(item)}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", gap: 16, padding: "18px 18px",
                          borderTop: i === 0 ? "none" : "1px solid #F0F3F8", background: "none", border: "none",
                          borderTopWidth: i === 0 ? 0 : 1, cursor: "pointer", textAlign: "left", fontFamily: FONT,
                        }}
                      >
                        <span style={{
                          width: 28, height: 28, borderRadius: "50%", border: "2px solid #C7CDF5",
                          flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        }} />
                        <span style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>
                          {item.name}{item.quantity ? ` · ${item.quantity}` : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Screen>
  );
}

function ItemRow({ item, isFirst, busy, categories, onToggle, onRemove, onCategoryChange }: {
  item: Item; isFirst: boolean; busy: boolean; categories: Category[]; onToggle: () => void; onRemove: () => void; onCategoryChange: (categoryId: string | null) => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      borderTop: isFirst ? "none" : "1px solid #F0F3F8",
      padding: "12px 0",
    }}>
      <button
        onClick={onToggle}
        aria-label={item.isPurchased ? "Mark as not bought" : "Mark as bought"}
        style={{
          width: 24, height: 24, borderRadius: "50%", flexShrink: 0, marginTop: 1, cursor: "pointer",
          border: item.isPurchased ? "none" : "2px solid #E4E3DE",
          background: item.isPurchased ? "#2A9D6F" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
        }}
      >
        {item.isPurchased && (
          <svg width={14} height={14} viewBox="0 0 24 24" {...STR} stroke="#fff"><polyline points="20 6 9 17 4 12"/></svg>
        )}
      </button>

      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover", flexShrink: 0, background: "#F0F3F8" }} />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600,
          color: item.isPurchased ? "#9CA3AF" : "#0F172A",
          textDecoration: item.isPurchased ? "line-through" : "none",
        }}>
          {item.name}{item.quantity ? ` · ${item.quantity}` : ""}
        </div>
        {item.note && <div style={{ fontSize: 11.5, color: "#9CA3AF", marginTop: 2 }}>{item.note}</div>}
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

      {item.url && (
        <a href={item.url} target="_blank" rel="noreferrer" aria-label="Open link" style={{ color: "#4A5FD5", padding: 6, flexShrink: 0, display: "flex" }}>
          <IcLink />
        </a>
      )}

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

const detailInputStyle: React.CSSProperties = {
  padding: "9px 12px", borderRadius: 10, border: "1.5px solid #E4E3DE", fontSize: 13, fontFamily: FONT, outline: "none", boxSizing: "border-box",
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
