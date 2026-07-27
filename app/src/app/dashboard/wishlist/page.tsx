"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { markSeen } from "@/lib/listBadges";
import HamburgerMenu from "@/components/HamburgerMenu";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const POLL_MS = 5000; // same rationale as the shopping list — see PRODUCT_SPEC.md 4b.8/4b.9

function IcBack()   { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6"/></svg>; }
function IcPlus()    { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function IcTrash()   { return <svg width={16} height={16} viewBox="0 0 24 24" {...STR}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>; }
function IcLock()    { return <svg width={32} height={32} viewBox="0 0 24 24" {...STR} strokeWidth={1.5}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }
function IcGift()    { return <svg width={44} height={44} viewBox="0 0 24 24" {...STR} strokeWidth={1.5}><rect x="3" y="8" width="18" height="4"/><rect x="4" y="12" width="16" height="9"/><path d="M12 8v13M12 8c-1.5-3-5-3-5-1s2 1 5 1zM12 8c1.5-3 5-3 5-1s-2 1-5 1z"/></svg>; }

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

type ChildGroup = { childId: string; childName: string; items: AdultItem[] };

export default function WishlistPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();

  const [access, setAccess] = useState<"LOADING" | "NO_HOUSEHOLD" | "LOCKED" | "PRO" | "TRIAL">("LOADING");
  const [role, setRole] = useState<"CHILD" | "ADULT" | "NONE" | null>(null);
  const [ownItems, setOwnItems] = useState<ChildSafeItem[]>([]);
  const [childGroups, setChildGroups] = useState<ChildGroup[]>([]);
  const [activeChild, setActiveChild] = useState<string>("");

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login");
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus === "authenticated") fetchWishlist();
  }, [authStatus]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (authStatus !== "authenticated") return;
    function start() {
      if (pollRef.current) return;
      pollRef.current = setInterval(() => { if (document.visibilityState === "visible") fetchWishlist(); }, POLL_MS);
    }
    function stop() { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } }
    function onVisibility() { if (document.visibilityState === "visible") { fetchWishlist(); start(); } }
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => { stop(); document.removeEventListener("visibilitychange", onVisibility); };
  }, [authStatus]);

  async function fetchWishlist() {
    try {
      const res = await fetch("/api/family/wishlist");
      const data = await res.json();
      setAccess(data.access ?? "NO_HOUSEHOLD");
      setRole(data.role ?? null);
      if (data.role === "CHILD") setOwnItems(data.items ?? []);
      if (data.role === "ADULT") {
        const groups: ChildGroup[] = data.children ?? [];
        setChildGroups(groups);
        setActiveChild((prev) => (prev && groups.some(g => g.childId === prev)) ? prev : (groups[0]?.childId ?? ""));
      }
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
    return <ChildWishlist items={ownItems} onChange={fetchWishlist} />;
  }

  if (role === "ADULT") {
    return (
      <AdultWishlist
        groups={childGroups}
        activeChild={activeChild}
        onSelectChild={setActiveChild}
        onChange={fetchWishlist}
      />
    );
  }

  return (
    <Screen title="Wishlist" onBack={() => router.push("/dashboard")}>
      <div style={{ textAlign: "center", padding: "60px 24px", color: "#6B7280", fontSize: 14 }}>
        There's nothing to show here for your role yet.
      </div>
    </Screen>
  );
}

// ---------- Child view: own list, ADD/EDIT/DELETE only, never any purchase status ----------

function ChildWishlist({ items, onChange }: { items: ChildSafeItem[]; onChange: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [price, setPrice] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function addWish(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/family/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url: url || undefined, price: price || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); }
      else { setName(""); setUrl(""); setPrice(""); await onChange(); }
    } catch { setError("Network error"); }
    finally { setAdding(false); }
  }

  async function removeWish(id: string) {
    setBusyId(id);
    try { await fetch(`/api/family/wishlist/${id}`, { method: "DELETE" }); await onChange(); }
    catch (e) { console.error(e); }
    finally { setBusyId(null); }
  }

  return (
    <Screen title="My wishlist" onBack={() => router.push("/dashboard")}>
      <form onSubmit={addWish} style={{ background: "#fff", borderRadius: 18, border: "1px solid #E4E3DE", padding: 16, marginBottom: 20, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
        <input
          value={name} onChange={e => setName(e.target.value)} placeholder="Something you'd like…"
          style={inputStyle()}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Link (optional)" style={{ ...inputStyle(), flex: 1 }} />
          <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Price" style={{ ...inputStyle(), width: 90 }} />
        </div>
        {error && <div style={{ fontSize: 13, color: "#C44444", marginTop: 10 }}>{error}</div>}
        <button
          type="submit" disabled={adding || !name.trim()}
          style={{ marginTop: 12, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#1C1C28", color: "#fff", border: "none", borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: adding || !name.trim() ? "not-allowed" : "pointer", opacity: adding || !name.trim() ? 0.5 : 1, fontFamily: FONT }}
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
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, borderTop: i === 0 ? "none" : "1px solid #F0F3F8", padding: "12px 0" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{item.name}</div>
                <div style={{ fontSize: 11, color: "#B0B7C8", marginTop: 2 }}>
                  {item.price != null ? `${item.price} ${item.currency ?? "SEK"}` : ""}
                  {item.url ? (item.price != null ? " · " : "") + "has a link" : ""}
                </div>
              </div>
              <button onClick={() => removeWish(item.id)} disabled={busyId === item.id} aria-label="Remove wish" style={{ background: "none", border: "none", cursor: busyId === item.id ? "not-allowed" : "pointer", color: "#C0C5D0", padding: 6, flexShrink: 0 }}>
                <IcTrash />
              </button>
            </div>
          ))}
        </div>
      )}
    </Screen>
  );
}

// ---------- Adult view: per-child lists, reserve/purchase controls, never shown to the child ----------

const STATUS_LABEL: Record<AdultItem["status"], string> = { WANTED: "Wanted", RESERVED: "Reserved", PURCHASED: "Bought" };
const STATUS_COLOR: Record<AdultItem["status"], { bg: string; color: string }> = {
  WANTED: { bg: "#EDEBFB", color: "#5B4FCF" },
  RESERVED: { bg: "#FFF0E0", color: "#C06010" },
  PURCHASED: { bg: "#D4F4E6", color: "#1E7D52" },
};

function AdultWishlist({ groups, activeChild, onSelectChild, onChange }: {
  groups: ChildGroup[]; activeChild: string; onSelectChild: (id: string) => void; onChange: () => void;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const active = groups.find(g => g.childId === activeChild);

  async function setStatus(id: string, statusVal: AdultItem["status"]) {
    setBusyId(id);
    try {
      await fetch(`/api/family/wishlist/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: statusVal }),
      });
      await onChange();
    } catch (e) { console.error(e); }
    finally { setBusyId(null); }
  }

  if (groups.length === 0) {
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
      {groups.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 18, overflowX: "auto" }}>
          {groups.map(g => (
            <button
              key={g.childId} onClick={() => onSelectChild(g.childId)}
              style={{
                flexShrink: 0, padding: "8px 16px", borderRadius: 50, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer",
                border: g.childId === activeChild ? "none" : "1px solid #E4E3DE",
                background: g.childId === activeChild ? "#1C1C28" : "#fff",
                color: g.childId === activeChild ? "#fff" : "#4B5563",
              }}
            >
              {g.childName}
            </button>
          ))}
        </div>
      )}

      <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 14, lineHeight: 1.5 }}>
        Only adults see this — {active?.childName ?? "your child"} never sees reserved or bought status on their own list.
      </div>

      {!active || active.items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 13 }}>
          Nothing on this wishlist yet.
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #E4E3DE", padding: "4px 16px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
          {active.items.map((item, i) => {
            const badge = STATUS_COLOR[item.status];
            return (
              <div key={item.id} style={{ borderTop: i === 0 ? "none" : "1px solid #F0F3F8", padding: "14px 0" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{item.name}</div>
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
