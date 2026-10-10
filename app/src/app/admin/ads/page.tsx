"use client";

// 2026-09-28 — /admin/ads: create and manage sponsor slots, see impressions
// and clicks per ad (what an advertiser pays for). Ads are only ever shown to
// adults on the free plan — see lib/entitlements.showsAds.
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ADMIN_EMAIL } from "@/lib/adminConfig";

type Ad = {
  id: string; title: string; body: string | null; imageUrl: string | null; url: string; ctaLabel: string | null;
  advertiser: string | null; placement: string; active: boolean; startsAt: string | null; endsAt: string | null;
  impressions: number; clicks: number; createdAt: string;
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const EMPTY = { title: "", body: "", url: "", imageUrl: "", ctaLabel: "", advertiser: "", placement: "any", startsAt: "", endsAt: "" };
const PLACEMENTS: Record<string, string> = { any: "Anywhere", home: "Home", shopping: "Shopping list", calendar: "Calendar" };

function status(ad: Ad) {
  const now = Date.now();
  if (!ad.active) return { label: "Paused", color: "var(--muted)" };
  if (ad.startsAt && new Date(ad.startsAt).getTime() > now) return { label: "Scheduled", color: "var(--warning)" };
  if (ad.endsAt && new Date(ad.endsAt).getTime() <= now) return { label: "Ended", color: "var(--muted)" };
  return { label: "Live", color: "var(--success)" };
}

export default function AdminAdsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [ads, setAds] = useState<Ad[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login");
    if (authStatus === "authenticated") {
      if (session?.user?.email !== ADMIN_EMAIL) router.push("/dashboard");
      else load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus]);

  async function load() {
    const res = await fetch("/api/admin/ads");
    if (res.ok) setAds((await res.json()).ads ?? []);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const body = { ...form, startsAt: form.startsAt || null, endsAt: form.endsAt || null };
    const res = await fetch(editing ? `/api/admin/ads/${editing}` : "/api/admin/ads", {
      method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setError(d.error ?? "Could not save"); return; }
    setForm(EMPTY); setEditing(null); load();
  }

  async function toggle(ad: Ad) {
    await fetch(`/api/admin/ads/${ad.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !ad.active }) });
    load();
  }

  async function remove(ad: Ad) {
    if (!confirm(`Delete "${ad.title}"? Its statistics are deleted too.`)) return;
    await fetch(`/api/admin/ads/${ad.id}`, { method: "DELETE" });
    load();
  }

  function edit(ad: Ad) {
    setEditing(ad.id);
    setForm({
      title: ad.title, body: ad.body ?? "", url: ad.url, imageUrl: ad.imageUrl ?? "", ctaLabel: ad.ctaLabel ?? "",
      advertiser: ad.advertiser ?? "", placement: ad.placement,
      startsAt: ad.startsAt ? ad.startsAt.slice(0, 10) : "", endsAt: ad.endsAt ? ad.endsAt.slice(0, 10) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const field = (key: keyof typeof EMPTY, label: string, placeholder = "", type = "text") => (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--fg)", marginBottom: 5 }}>{label}</span>
      <input type={type} value={form[key]} placeholder={placeholder} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        style={{ width: "100%", boxSizing: "border-box", padding: "11px 13px", borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--surface-2)", color: "var(--fg)", fontSize: 14, fontFamily: FONT }} />
    </label>
  );

  const totals = ads.reduce((t, a) => ({ i: t.i + a.impressions, c: t.c + a.clicks }), { i: 0, c: 0 });

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT }}>
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 60px" }}>
        <Link href="/admin" style={{ fontSize: 14, color: "var(--muted)", textDecoration: "none", fontWeight: 600 }}>‹ Admin</Link>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--fg)", margin: "10px 0 4px" }}>Ads</h1>
        <p style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 20px", lineHeight: 1.5 }}>
          Shown only to adults on the free plan — never to children, Pro, trial or ad-free families. No tracking: we only count impressions and clicks per ad.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10, marginBottom: 20 }}>
          {[["Ads", ads.length], ["Impressions", totals.i], ["Clicks", totals.c]].map(([l, v]) => (
            <div key={l as string} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "12px 14px" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--fg)" }}>{(v as number).toLocaleString("sv")}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>

        <form onSubmit={save} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 18, marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--fg)", marginBottom: 14 }}>{editing ? "Edit ad" : "New ad"}</div>
          {field("title", "Title *", "e.g. 20% off school bags")}
          {field("body", "Text", "One short sentence")}
          {field("url", "Link *", "https://…", "url")}
          {field("imageUrl", "Image URL", "https://… (square works best)", "url")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {field("ctaLabel", "Button text", "Read more")}
            {field("advertiser", "Advertiser", "Company name")}
          </div>
          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--fg)", marginBottom: 5 }}>Where</span>
            <select value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })}
              style={{ width: "100%", padding: "11px 13px", borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--surface-2)", color: "var(--fg)", fontSize: 14, fontFamily: FONT }}>
              {Object.entries(PLACEMENTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {field("startsAt", "Start (optional)", "", "date")}
            {field("endsAt", "End (optional)", "", "date")}
          </div>
          {error && <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: 13, borderRadius: 50, border: "none", background: "var(--accent-bg)", color: "var(--on-accent)", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: FONT }}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create ad"}
            </button>
            {editing && (
              <button type="button" onClick={() => { setEditing(null); setForm(EMPTY); }} style={{ padding: "13px 18px", borderRadius: 50, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--fg)", fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>Cancel</button>
            )}
          </div>
        </form>

        {ads.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--subtle)", fontSize: 14 }}>No ads yet.</p>
        ) : ads.map((ad) => {
          const st = status(ad);
          const ctr = ad.impressions ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : "0.0";
          return (
            <div key={ad.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)" }}>{ad.title}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                    {ad.advertiser ?? "—"} · {PLACEMENTS[ad.placement] ?? ad.placement}
                    {(ad.startsAt || ad.endsAt) && ` · ${ad.startsAt ? ad.startsAt.slice(0, 10) : "…"} → ${ad.endsAt ? ad.endsAt.slice(0, 10) : "…"}`}
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: st.color, flexShrink: 0 }}>{st.label}</span>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 13, color: "var(--fg-2)", margin: "10px 0" }}>
                <span><strong>{ad.impressions.toLocaleString("sv")}</strong> impressions</span>
                <span><strong>{ad.clicks.toLocaleString("sv")}</strong> clicks</span>
                <span><strong>{ctr}%</strong> CTR</span>
              </div>
              <div style={{ display: "flex", gap: 14 }}>
                <button onClick={() => edit(ad)} style={linkBtn}>Edit</button>
                <button onClick={() => toggle(ad)} style={linkBtn}>{ad.active ? "Pause" : "Resume"}</button>
                <button onClick={() => remove(ad)} style={{ ...linkBtn, color: "var(--danger)" }}>Delete</button>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}

const linkBtn: React.CSSProperties = { background: "none", border: "none", padding: 0, fontSize: 13, fontWeight: 700, color: "var(--accent)", cursor: "pointer", fontFamily: FONT };
