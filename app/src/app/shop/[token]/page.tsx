"use client";

import { useEffect, useRef, useState } from "react";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const POLL_MS = 5000;

const UNSORTED_LABEL = "Unsorted";
const UNSORTED_ICON = "❔";

type Item = {
  id: string;
  name: string;
  quantity: string | null;
  note: string | null;
  url: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  categoryDef: { id: string; label: string; icon: string; sortOrder: number } | null;
  isPurchased: boolean;
};

function IcPlus() { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>; }
function IcTrash() { return <svg width={16} height={16} viewBox="0 0 24 24" {...STR}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>; }
function IcLink() { return <svg width={13} height={13} viewBox="0 0 24 24" {...STR}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>; }

function sortByName(items: Item[]): Item[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "sv", { sensitivity: "base" }));
}

// Public, no-login shopping list view for the "share this list" link — see
// /api/family/lists/[id]/share and /api/public/shopping-list/[token].
// Intentionally has no app chrome (no hamburger/bottom nav/session) since
// the visitor may not have — or want — an account at all.
export default function PublicShoppingListPage({ params }: { params: { token: string } }) {
  const [items, setItems] = useState<Item[]>([]);
  const [householdName, setHouseholdName] = useState("the family");
  const [state, setState] = useState<"loading" | "ok" | "not-found">("loading");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");

  async function fetchItems() {
    try {
      const res = await fetch(`/api/public/shopping-list/${params.token}`);
      if (res.status === 404) { setState("not-found"); return; }
      const data = await res.json();
      setItems(data.items ?? []);
      setHouseholdName(data.householdName ?? "the family");
      setState("ok");
    } catch {
      setState("not-found");
    }
  }

  useEffect(() => { fetchItems(); }, []);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    pollRef.current = setInterval(() => {
      if (document.visibilityState === "visible") fetchItems();
    }, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Optimistic like the in-app list — the action shows up instantly, the
  // network call happens in the background, and only rolls back on failure.

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const tempId = `temp-${Date.now()}`;
    setItems((prev) => [{ id: tempId, name: trimmedName, quantity: quantity.trim() || null, note: null, url: null, imageUrl: null, categoryId: null, categoryDef: null, isPurchased: false }, ...prev]);
    setName("");
    setQuantity("");
    try {
      const res = await fetch(`/api/public/shopping-list/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, quantity: quantity || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems((prev) => prev.map((i) => (i.id === tempId ? data : i)));
      } else {
        setItems((prev) => prev.filter((i) => i.id !== tempId));
      }
    } catch {
      setItems((prev) => prev.filter((i) => i.id !== tempId));
    }
  }

  async function toggle(item: Item) {
    const wasPurchased = item.isPurchased;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isPurchased: !wasPurchased } : i)));
    try {
      const res = await fetch(`/api/public/shopping-list/${params.token}/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPurchased: !wasPurchased }),
      });
      if (!res.ok) setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isPurchased: wasPurchased } : i)));
    } catch {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isPurchased: wasPurchased } : i)));
    }
  }

  async function remove(id: string) {
    const removed = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      const res = await fetch(`/api/public/shopping-list/${params.token}/${id}`, { method: "DELETE" });
      if (!res.ok && removed) setItems((prev) => [...prev, removed]);
    } catch {
      if (removed) setItems((prev) => [...prev, removed]);
    }
  }

  if (state === "loading") {
    return <Shell><div style={{ color: "#7C7C8A", fontSize: 15, textAlign: "center", padding: "60px 0" }}>Loading list…</div></Shell>;
  }

  if (state === "not-found") {
    return (
      <Shell>
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔗</div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: "0 0 8px" }}>This link isn&apos;t valid anymore</h1>
          <p style={{ fontSize: 14, color: "#6B7280" }}>The family may have turned off sharing. Ask them to send you a fresh link.</p>
        </div>
      </Shell>
    );
  }

  const pending = items.filter((i) => !i.isPurchased);
  const purchased = items.filter((i) => i.isPurchased);

  const categoryMap: Record<string, { id: string; label: string; icon: string; sortOrder: number }> = {};
  for (const item of pending) {
    if (item.categoryDef && !categoryMap[item.categoryDef.id]) {
      categoryMap[item.categoryDef.id] = item.categoryDef;
    }
  }
  const groups = [
    ...Object.values(categoryMap)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((def) => ({ key: def.id, label: def.label, icon: def.icon, items: sortByName(pending.filter((i) => i.categoryId === def.id)) })),
    { key: "unsorted", label: UNSORTED_LABEL, icon: UNSORTED_ICON, items: sortByName(pending.filter((i) => !i.categoryId)) },
  ].filter((g) => g.items.length > 0);

  return (
    <Shell>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>🛒</div>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: "0 0 4px" }}>{householdName}&apos;s shopping list</h1>
        <p style={{ fontSize: 12.5, color: "#9CA3AF", margin: 0 }}>Shared with you — add, check off, or remove anything.</p>
      </div>

      <form onSubmit={addItem} style={{ background: "#fff", borderRadius: 18, border: "1px solid #E4E3DE", padding: 16, marginBottom: 20, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add an item…"
            style={{ flex: 1, minWidth: 0, padding: "12px 14px", borderRadius: 12, border: "1.5px solid #E4E3DE", fontSize: 15, fontFamily: FONT, outline: "none", boxSizing: "border-box" }}
          />
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Qty"
            style={{ width: 72, padding: "12px 10px", borderRadius: 12, border: "1.5px solid #E4E3DE", fontSize: 15, fontFamily: FONT, outline: "none", boxSizing: "border-box" }}
          />
          <button
            type="submit"
            disabled={!name.trim()}
            style={{ width: 48, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#1C1C28", color: "#fff", border: "none", borderRadius: 12, cursor: !name.trim() ? "not-allowed" : "pointer", opacity: !name.trim() ? 0.5 : 1 }}
          >
            <IcPlus />
          </button>
        </div>
      </form>

      <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", marginBottom: 12 }}>
        To buy {pending.length > 0 && `(${pending.length})`}
      </div>

      {pending.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0 32px", color: "#9CA3AF", fontSize: 13 }}>Nothing on the list right now.</div>
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
                <Row key={item.id} item={item} isFirst={i === 0} onToggle={() => toggle(item)} onRemove={() => remove(item.id)} />
              ))}
            </div>
          ))}
        </div>
      )}

      {purchased.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#2A9D6F", marginBottom: 10 }}>
            <span>✓</span> Already in the cart ({purchased.length})
          </div>
          <div style={{ background: "rgba(42,157,111,0.06)", borderRadius: 18, border: "1px solid rgba(42,157,111,0.25)", padding: "4px 16px" }}>
            {purchased.map((item, i) => (
              <Row key={item.id} item={item} isFirst={i === 0} onToggle={() => toggle(item)} onRemove={() => remove(item.id)} />
            ))}
          </div>
        </>
      )}

      <p style={{ textAlign: "center", fontSize: 11.5, color: "#B0B7C8", marginTop: 32 }}>
        Made with Reminder for Simplicity
      </p>
    </Shell>
  );
}

function Row({ item, isFirst, onToggle, onRemove }: { item: Item; isFirst: boolean; onToggle: () => void; onRemove: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, borderTop: isFirst ? "none" : "1px solid #F0F3F8", padding: "12px 0" }}>
      <button
        onClick={onToggle}
        aria-label={item.isPurchased ? "Mark as not bought" : "Mark as bought"}
        style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, marginTop: 1, cursor: "pointer", border: item.isPurchased ? "none" : "2px solid #E4E3DE", background: item.isPurchased ? "#2A9D6F" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {item.isPurchased && <svg width={14} height={14} viewBox="0 0 24 24" {...STR} stroke="#fff"><polyline points="20 6 9 17 4 12" /></svg>}
      </button>
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover", flexShrink: 0, background: "#F0F3F8" }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: item.isPurchased ? "#9CA3AF" : "#0F172A", textDecoration: item.isPurchased ? "line-through" : "none" }}>
          {item.name}{item.quantity ? ` · ${item.quantity}` : ""}
        </div>
        {item.note && <div style={{ fontSize: 11.5, color: "#9CA3AF", marginTop: 2 }}>{item.note}</div>}
      </div>
      {item.url && (
        <a href={item.url} target="_blank" rel="noreferrer" aria-label="Open link" style={{ color: "#4A5FD5", padding: 6, flexShrink: 0, display: "flex" }}>
          <IcLink />
        </a>
      )}
      <button onClick={onRemove} aria-label="Remove item" style={{ background: "none", border: "none", cursor: "pointer", color: "#C0C5D0", padding: 6, flexShrink: 0 }}>
        <IcTrash />
      </button>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F5F4F0", fontFamily: FONT }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "32px 20px 60px" }}>{children}</div>
    </div>
  );
}
