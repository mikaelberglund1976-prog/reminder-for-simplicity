"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { markSeen } from "@/lib/listBadges";
import HamburgerMenu from "@/components/HamburgerMenu";
import ListAccessPanel, { type ListMemberOption } from "@/components/ListAccessPanel";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const POLL_MS = 5000; // same rationale as the shopping list — see PRODUCT_SPEC.md 4b.8/4b.9

function IcBack()   { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6"/></svg>; }
function IcPlus()    { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function IcTrash()   { return <svg width={16} height={16} viewBox="0 0 24 24" {...STR}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>; }
function IcLock()    { return <svg width={32} height={32} viewBox="0 0 24 24" {...STR} strokeWidth={1.5}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }
function IcGift()    { return <svg width={44} height={44} viewBox="0 0 24 24" {...STR} strokeWidth={1.5}><rect x="3" y="8" width="18" height="4"/><rect x="4" y="12" width="16" height="9"/><path d="M12 8v13M12 8c-1.5-3-5-3-5-1s2 1 5 1zM12 8c1.5-3 5-3 5-1s-2 1-5 1z"/></svg>; }
function IcSettings() { return <svg width={14} height={14} viewBox="0 0 24 24" {...STR}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }

type ChildSafeItem = {
  id: string; name: string; url: string | null; price: number | null;
  currency: string | null; imageUrl: string | null; note: string | null;
  createdAt: string;
};

type AdultItem = ChildSafeItem & {
  status: "WANTED" | "RESERVED" | "PURCHASED";
  reserver: { id: string; name: string | null } | null;
  purchaser: { id: string; name: string | null } | null;
};

type ListInfo = { id: string; name: string; ownerId: string | null; ownerName: string | null; visibleToAll: boolean; memberIds: string[]; isMine: boolean };

export default function WishlistPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();

  const [access, setAccess] = useState<"LOADING" | "NO_HOUSEHOLD" | "LOCKED" | "PRO" | "TRIAL">("LOADING");
  const [role, setRole] = useState<"OWNER" | "PARENT" | "ADULT" | "CHILD" | "MEMBER" | null>(null);
  const [lists, setLists] = useState<ListInfo[]>([]);
  const [canEditAccess, setCanEditAccess] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login");
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus === "authenticated") fetchLists();
  }, [authStatus]);

  async function fetchLists() {
    try {
      const res = await fetch("/api/family/lists?kind=WISHLIST");
      const data = await res.json();
      setAccess(data.access ?? "NO_HOUSEHOLD");
      setCanEditAccess(!!data.canEditAccess);
      setLists(data.lists ?? []);
      setRole(data.role ?? null);
      markSeen("wishlist");
    } catch (e) {
      console.error(e);
    }
  }

  if (authStatus === "loading" || access === "LOADING") {
    return (
      <div style={{ minHeight: "100vh", background: "#F5F4F0", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "#7C7C8A", fontSize: 15 }}>Loading wishlist…</div>
      </div>
    );
  }

  if (access === "NO_HOUSEHOLD") {
    return (
      <Screen title="Wishlist" onBack={() => router.push("/dashboard")}>
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", margin: "0 0 10px" }}>Set up your household first</h2>
          <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, marginBottom: 28 }}>Wishlists live inside a household. Invite your family to get started.</p>
          <Link href="/profile" style={btnStyle("#1C1C28")}>Go to settings →</Link>
        </div>
      </Screen>
    );
  }

  if (access === "LOCKED") {
    return (
      <Screen title="Wishlist" onBack={() => router.push("/dashboard")}>
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ color: "#CBD5E1", marginBottom: 20, display: "flex", justifyContent: "center" }}><IcLock /></div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", margin: "0 0 10px" }}>Family features required</h2>
          <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, marginBottom: 28 }}>Wishlists are part of family responsibilities — start your free trial or upgrade to Pro to use them.</p>
          <Link href="/dashboard/family" style={btnStyle("#1C1C28")}>Go to Family →</Link>
        </div>
      </Screen>
    );
  }

  if (role === "CHILD") {
    return <ChildWishlist lists={lists} canEditAccess={canEditAccess} onChange={fetchLists} />;
  }

  return <AdultWishlist lists={lists} canEditAccess={canEditAccess} onChange={fetchLists} />;
}

// ---------- Child view: own list(s), ADD/EDIT/DELETE only, never any purchase status ----------

function ChildWishlist({ lists, canEditAccess, onChange }: { lists: ListInfo[]; canEditAccess: boolean; onChange: () => void }) {
  const router = useRouter();
  const [activeListId, setActiveListId] = useState<string | null>(lists[0]?.id ?? null);
  const [items, setItems] = useState<ChildSafeItem[]>([]);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [showAccessPanel, setShowAccessPanel] = useState(false);
  const [members, setMembers] = useState<ListMemberOption[]>([]);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [note, setNote] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeListId && lists[0]) setActiveListId(lists[0].id);
  }, [lists, activeListId]);

  async function fetchItems(listId: string) {
    try {
      const res = await fetch(`/api/family/wishlist?listId=${listId}`);
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => { if (activeListId) fetchItems(activeListId); }, [activeListId]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!activeListId) return;
    pollRef.current = setInterval(() => { if (document.visibilityState === "visible") fetchItems(activeListId); }, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeListId]);

  async function addWish(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !activeListId) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic: ChildSafeItem = { id: tempId, name: name.trim(), url: url || null, price: price ? Number(price) : null, currency: "SEK", imageUrl: imageUrl || null, note: note || null, createdAt: new Date().toISOString() };
    setItems((prev) => [optimistic, ...prev]);
    setName(""); setUrl(""); setPrice(""); setImageUrl(""); setNote(""); setShowDetails(false);
    setError("");
    try {
      const res = await fetch("/api/family/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: activeListId, name: optimistic.name, url: optimistic.url || undefined, price: optimistic.price ?? undefined, imageUrl: optimistic.imageUrl || undefined, note: optimistic.note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== tempId));
        setError(data.error ?? "Something went wrong");
      } else {
        setItems((prev) => prev.map((i) => (i.id === tempId ? data : i)));
      }
    } catch {
      setItems((prev) => prev.filter((i) => i.id !== tempId));
      setError("Network error");
    }
  }

  async function removeWish(id: string) {
    const removed = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      const res = await fetch(`/api/family/wishlist/${id}`, { method: "DELETE" });
      if (!res.ok && removed) setItems((prev) => [...prev, removed]);
    } catch (e) {
      console.error(e);
      if (removed) setItems((prev) => [...prev, removed]);
    }
  }

  async function createList(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newListName.trim();
    if (!trimmed) return;
    const res = await fetch("/api/family/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "WISHLIST", name: trimmed }),
    });
    if (res.ok) {
      const created = await res.json();
      setNewListName("");
      setShowNewList(false);
      await onChange();
      setActiveListId(created.id);
    }
  }

  const activeList = lists.find((l) => l.id === activeListId);

  return (
    <Screen title="My wishlist" onBack={() => router.push("/dashboard")}>
      {lists.length > 1 || true ? (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, marginBottom: 10 }}>
          {lists.map((l) => (
            <button key={l.id} onClick={() => setActiveListId(l.id)} style={{
              flexShrink: 0, whiteSpace: "nowrap", borderRadius: 999, padding: "7px 14px", fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer",
              border: l.id === activeListId ? "none" : "1px solid #E4E3DE",
              background: l.id === activeListId ? "#1C1C28" : "#fff",
              color: l.id === activeListId ? "#fff" : "#4B5563",
            }}>
              {l.name}
            </button>
          ))}
          <button onClick={() => setShowNewList((v) => !v)} style={{ flexShrink: 0, background: "none", border: "1.5px dashed #C7CDF5", borderRadius: 999, padding: "7px 14px", fontSize: 13, fontWeight: 700, color: "#4A5FD5", cursor: "pointer", fontFamily: FONT }}>
            + New list
          </button>
        </div>
      ) : null}

      {showNewList && (
        <form onSubmit={createList} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="e.g. Birthday, Christmas…" style={{ flex: 1, minWidth: 0, fontSize: 13, fontFamily: FONT, border: "1.5px solid #E4E3DE", borderRadius: 10, padding: "9px 12px", outline: "none" }} />
          <button type="submit" disabled={!newListName.trim()} style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", background: "#1C1C28", border: "none", borderRadius: 10, padding: "0 16px", cursor: !newListName.trim() ? "not-allowed" : "pointer", opacity: !newListName.trim() ? 0.5 : 1, fontFamily: FONT }}>
            Create
          </button>
        </form>
      )}

      <button onClick={() => { setShowAccessPanel((v) => !v); if (!showAccessPanel) fetch("/api/family/members").then((r) => r.json()).then((d) => setMembers(d.members ?? [])); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#4A5FD5", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "0 2px", fontFamily: FONT, marginBottom: 14 }}>
        <IcSettings /> {activeList?.visibleToAll ? "Everyone can see this list" : "Only some people can see this list"}
      </button>

      {showAccessPanel && activeList && (
        <ListAccessPanel
          listName={activeList.name}
          visibleToAll={activeList.visibleToAll}
          memberIds={activeList.memberIds}
          members={members}
          canEditAccess={canEditAccess}
          onRename={async (n) => { await fetch(`/api/family/lists/${activeList.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: n }) }); onChange(); }}
          onToggleVisibleToAll={async (v) => { await fetch(`/api/family/lists/${activeList.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visibleToAll: v }) }); onChange(); }}
          onToggleMember={async (uid) => {
            const next = activeList.memberIds.includes(uid) ? activeList.memberIds.filter((id) => id !== uid) : [...activeList.memberIds, uid];
            await fetch(`/api/family/lists/${activeList.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberIds: next }) });
            onChange();
          }}
        />
      )}

      <form onSubmit={addWish} style={{ background: "#fff", borderRadius: 18, border: "1px solid #E4E3DE", padding: 16, marginBottom: 20, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Something you'd like…" style={inputStyle()} />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Price" style={{ ...inputStyle(), width: 90 }} />
          <button type="button" onClick={() => setShowDetails((v) => !v)} style={{ flex: 1, background: "none", border: "1.5px solid #E4E3DE", borderRadius: 12, color: "#4A5FD5", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
            {showDetails ? "Hide link & note" : "+ Link, picture or note"}
          </button>
        </div>
        {showDetails && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link (optional)" style={inputStyle()} />
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL (optional)" style={inputStyle()} />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" style={inputStyle()} />
          </div>
        )}
        {error && <div style={{ fontSize: 13, color: "#C44444", marginTop: 10 }}>{error}</div>}
        <button
          type="submit" disabled={!name.trim() || !activeListId}
          style={{ marginTop: 12, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#1C1C28", color: "#fff", border: "none", borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: !name.trim() ? "not-allowed" : "pointer", opacity: !name.trim() ? 0.5 : 1, fontFamily: FONT }}
        >
          <IcPlus /> Add to my wishlist
        </button>
      </form>

      <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 10, letterSpacing: "0.02em" }}>
        Your wishes {items.length > 0 && `(${items.length})`}
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 13 }}>
          Nothing here yet — add something you'd like above.
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #E4E3DE", padding: "4px 16px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
          {items.map((item, i) => (
            <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, borderTop: i === 0 ? "none" : "1px solid #F0F3F8", padding: "12px 0" }}>
              {item.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover", flexShrink: 0, background: "#F0F3F8" }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{item.name}</div>
                {item.note && <div style={{ fontSize: 11.5, color: "#9CA3AF", marginTop: 2 }}>{item.note}</div>}
                <div style={{ fontSize: 11, color: "#B0B7C8", marginTop: 2 }}>
                  {item.price != null ? `${item.price} ${item.currency ?? "SEK"}` : ""}
                  {item.url ? (item.price != null ? " · " : "") + "has a link" : ""}
                </div>
              </div>
              <button onClick={() => removeWish(item.id)} aria-label="Remove wish" style={{ background: "none", border: "none", cursor: "pointer", color: "#C0C5D0", padding: 6, flexShrink: 0 }}>
                <IcTrash />
              </button>
            </div>
          ))}
        </div>
      )}
    </Screen>
  );
}

// ---------- Adult view: per-child, per-list; reserve/purchase controls, never shown to the child ----------

const STATUS_LABEL: Record<AdultItem["status"], string> = { WANTED: "Wanted", RESERVED: "Reserved", PURCHASED: "Bought" };
const STATUS_COLOR: Record<AdultItem["status"], { bg: string; color: string }> = {
  WANTED: { bg: "#EDEBFB", color: "#5B4FCF" },
  RESERVED: { bg: "#FFF0E0", color: "#C06010" },
  PURCHASED: { bg: "#D4F4E6", color: "#1E7D52" },
};

function AdultWishlist({ lists, canEditAccess, onChange }: { lists: ListInfo[]; canEditAccess: boolean; onChange: () => void }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [items, setItems] = useState<AdultItem[]>([]);
  const [showAccessPanel, setShowAccessPanel] = useState(false);
  const [members, setMembers] = useState<ListMemberOption[]>([]);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [newListError, setNewListError] = useState("");

  const children = Array.from(new Map(lists.filter((l) => l.ownerId).map((l) => [l.ownerId as string, l.ownerName ?? "Child"])).entries());
  const [activeChild, setActiveChild] = useState<string>(children[0]?.[0] ?? "");
  useEffect(() => {
    if (!activeChild && children[0]) setActiveChild(children[0][0]);
  }, [children, activeChild]);

  const childLists = lists.filter((l) => l.ownerId === activeChild);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  useEffect(() => {
    if (childLists.length && !childLists.some((l) => l.id === activeListId)) setActiveListId(childLists[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChild, lists]);

  async function fetchItems(listId: string) {
    try {
      const res = await fetch(`/api/family/wishlist?listId=${listId}`);
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => { if (activeListId) fetchItems(activeListId); }, [activeListId]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!activeListId) return;
    pollRef.current = setInterval(() => { if (document.visibilityState === "visible") fetchItems(activeListId); }, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeListId]);

  // OWNER/PARENT creating a new wishlist for the active child — backend
  // already supported this via `ownerId` on POST /api/family/lists (an
  // adult setting up a list on a child's behalf), but AdultWishlist never
  // exposed it: only ChildWishlist had a "+ New list" button. Fixed
  // 2026-07-28 — this was the actual reason an adult testing the page
  // couldn't create anything at all.
  async function createList(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newListName.trim();
    if (!trimmed || !activeChild) return;
    setCreatingList(true); setNewListError("");
    try {
      const res = await fetch("/api/family/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "WISHLIST", name: trimmed, ownerId: activeChild }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setNewListError(data.error ?? `Error ${res.status}`); return; }
      setNewListName("");
      setShowNewList(false);
      await onChange();
      setActiveListId(data.id);
    } catch (err) {
      setNewListError("Could not reach server: " + String(err));
    } finally {
      setCreatingList(false);
    }
  }

  async function setStatus(id: string, statusVal: AdultItem["status"]) {
    const prevItems = items;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: statusVal } : i)));
    setBusyId(id);
    try {
      const res = await fetch(`/api/family/wishlist/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: statusVal }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
      } else {
        setItems(prevItems);
      }
    } catch (e) {
      console.error(e);
      setItems(prevItems);
    } finally {
      setBusyId(null);
    }
  }

  const activeList = childLists.find((l) => l.id === activeListId);

  if (children.length === 0) {
    return (
      <Screen title="Wishlists" onBack={() => router.push("/dashboard")}>
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "center", color: "#CBD5E1" }}><IcGift /></div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: "0 0 10px" }}>No child profiles yet</h2>
          <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, marginBottom: 28 }}>Add a child profile from Family settings to start a wishlist for them.</p>
          <Link href="/dashboard/family" style={btnStyle("#1C1C28")}>Go to Family →</Link>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title="Wishlists" onBack={() => router.push("/dashboard")}>
      {children.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto" }}>
          {children.map(([childId, childName]) => (
            <button
              key={childId} onClick={() => setActiveChild(childId)}
              style={{
                flexShrink: 0, padding: "8px 16px", borderRadius: 50, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer",
                border: childId === activeChild ? "none" : "1px solid #E4E3DE",
                background: childId === activeChild ? "#1C1C28" : "#fff",
                color: childId === activeChild ? "#fff" : "#4B5563",
              }}
            >
              {childName}
            </button>
          ))}
        </div>
      )}

      {(childLists.length > 1 || canEditAccess) && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto" }}>
          {childLists.map((l) => (
            <button key={l.id} onClick={() => setActiveListId(l.id)} style={{
              flexShrink: 0, whiteSpace: "nowrap", borderRadius: 999, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer",
              border: l.id === activeListId ? "1.5px solid #4A5FD5" : "1px solid #E4E3DE",
              background: l.id === activeListId ? "#EEF0FC" : "#fff",
              color: l.id === activeListId ? "#3A4FC5" : "#6B7280",
            }}>
              {l.name}
            </button>
          ))}
          {canEditAccess && (
            <button onClick={() => setShowNewList((v) => !v)} style={{ flexShrink: 0, background: "none", border: "1.5px dashed #C7CDF5", borderRadius: 999, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, color: "#4A5FD5", cursor: "pointer", fontFamily: FONT }}>
              + New list
            </button>
          )}
        </div>
      )}

      {showNewList && (
        <form onSubmit={createList} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="e.g. Birthday, Christmas…" style={{ flex: 1, minWidth: 0, fontSize: 13, fontFamily: FONT, border: "1.5px solid #E4E3DE", borderRadius: 10, padding: "9px 12px", outline: "none" }} />
          <button type="submit" disabled={!newListName.trim() || creatingList} style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", background: "#1C1C28", border: "none", borderRadius: 10, padding: "0 16px", cursor: !newListName.trim() ? "not-allowed" : "pointer", opacity: !newListName.trim() ? 0.5 : 1, fontFamily: FONT }}>
            {creatingList ? "…" : "Create"}
          </button>
        </form>
      )}
      {newListError && (
        <div style={{ fontSize: 13, color: "#C44444", marginBottom: 14 }}>{newListError}</div>
      )}

      <button onClick={() => { setShowAccessPanel((v) => !v); if (!showAccessPanel) fetch("/api/family/members").then((r) => r.json()).then((d) => setMembers(d.members ?? [])); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#4A5FD5", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "0 2px", fontFamily: FONT, marginBottom: 14 }}>
        <IcSettings /> {activeList?.visibleToAll ? "Everyone can see this list" : "Only some people can see this list"}
      </button>

      {showAccessPanel && activeList && (
        <ListAccessPanel
          listName={activeList.name}
          visibleToAll={activeList.visibleToAll}
          memberIds={activeList.memberIds}
          members={members}
          canEditAccess={canEditAccess}
          onRename={async (n) => { await fetch(`/api/family/lists/${activeList.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: n }) }); onChange(); }}
          onToggleVisibleToAll={async (v) => { await fetch(`/api/family/lists/${activeList.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visibleToAll: v }) }); onChange(); }}
          onToggleMember={async (uid) => {
            const next = activeList.memberIds.includes(uid) ? activeList.memberIds.filter((id) => id !== uid) : [...activeList.memberIds, uid];
            await fetch(`/api/family/lists/${activeList.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberIds: next }) });
            onChange();
          }}
        />
      )}

      <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 14, lineHeight: 1.5 }}>
        Only adults see this — they never see reserved or bought status on their own list.
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 13 }}>
          Nothing on this wishlist yet.
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #E4E3DE", padding: "4px 16px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
          {items.map((item, i) => {
            const badge = STATUS_COLOR[item.status];
            return (
              <div key={item.id} style={{ borderTop: i === 0 ? "none" : "1px solid #F0F3F8", padding: "14px 0" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover", flexShrink: 0, background: "#F0F3F8" }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{item.name}</div>
                    {item.note && <div style={{ fontSize: 11.5, color: "#9CA3AF", marginTop: 2 }}>{item.note}</div>}
                    <div style={{ fontSize: 11, color: "#B0B7C8", marginTop: 2 }}>
                      {item.price != null ? `${item.price} ${item.currency ?? "SEK"}` : ""}
                      {item.url ? (
                        <> {item.price != null && "· "}<a href={item.url} target="_blank" rel="noreferrer" style={{ color: "#4A5FD5" }}>view link</a></>
                      ) : ""}
                    </div>
                    {item.status !== "WANTED" && (
                      <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                        {item.status === "RESERVED" && `Reserved by ${item.reserver?.name ?? "someone"}`}
                        {item.status === "PURCHASED" && `Bought by ${item.purchaser?.name ?? "someone"}`}
                      </div>
                    )}
                  </div>
                  <span style={{ background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 50, flexShrink: 0 }}>
                    {STATUS_LABEL[item.status]}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {item.status !== "RESERVED" && (
                    <StatusBtn label="Reserve" busy={busyId === item.id} onClick={() => setStatus(item.id, "RESERVED")} />
                  )}
                  {item.status !== "PURCHASED" && (
                    <StatusBtn label="Mark bought" busy={busyId === item.id} onClick={() => setStatus(item.id, "PURCHASED")} />
                  )}
                  {item.status !== "WANTED" && (
                    <StatusBtn label="Reset" busy={busyId === item.id} onClick={() => setStatus(item.id, "WANTED")} subtle />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Screen>
  );
}

function StatusBtn({ label, busy, onClick, subtle }: { label: string; busy: boolean; onClick: () => void; subtle?: boolean }) {
  return (
    <button
      onClick={onClick} disabled={busy}
      style={{
        fontSize: 12, fontWeight: 700, fontFamily: FONT, padding: "6px 12px", borderRadius: 50, cursor: busy ? "not-allowed" : "pointer",
        border: subtle ? "1px solid #E4E3DE" : "none",
        background: subtle ? "#fff" : "#1C1C28",
        color: subtle ? "#6B7280" : "#fff",
        opacity: busy ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
}

function inputStyle(): React.CSSProperties {
  return { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1.5px solid #E4E3DE", fontSize: 15, fontFamily: FONT, outline: "none", boxSizing: "border-box" as const };
}

function btnStyle(bg: string): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", justifyContent: "center", background: bg, color: "#fff", border: "none", borderRadius: 50, padding: "14px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT, textDecoration: "none" };
}

function Screen({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F5F4F0", fontFamily: FONT }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #E4E3DE", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#4B5563", display: "flex", padding: 4 }}>
            <IcBack />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: 0, flex: 1 }}>{title}</h1>
          <HamburgerMenu />
        </div>
      </div>
      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "20px 20px 40px", paddingBottom: 96 }}>
        {children}
      </main>
    </div>
  );
}
