"use client";

// 2026-10-11: one trip — Before the trip · Flights & times · Packing · Want to do.
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import HamburgerMenu from "@/components/HamburgerMenu";
import Avatar from "@/components/Avatar";
import { useI18n } from "@/lib/i18n/client";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcBack() { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6"/></svg>; }

type Person = { id: string; name: string; role: string };
type Step = { key: string; ymd: string; text: string; level: "ok" | "todo" | "warn" | "bad"; done: boolean; itemId?: string; personId?: string };
type Flight = { id: string; checked: boolean; flightNo?: string; from?: string; to?: string; depYmd: string; depTime: string; arrTime?: string | null; leave: string; leaveDayBefore: boolean };
type Pack = { id: string; label: string; personId: string | null; checked: boolean };
type Idea = { id: string; label: string; personId: string; votes: string[] };
type Trip = { id: string; name: string; destination: string | null; startYmd: string; endYmd: string; kind: string; vaccine: boolean; homeToAirportMin: number; airportBufferMin: number };
type Data = { trip: Trip; me: string; isAdult: boolean; people: Person[]; travellers: Person[]; daysTo: number; daysLeft: number; steps: Step[]; stepsLeft: number; passports: Record<string, string | null>; flights: Flight[]; pack: Pack[]; ideas: Idea[] };
type Tab = "before" | "flights" | "pack" | "ideas";

const card = { background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" };
const input = { width: "100%", boxSizing: "border-box" as const, padding: "10px 12px", borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--fg)", fontSize: 14, fontFamily: FONT };
const small = { display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--muted)", margin: "10px 0 5px" };
const btn = { border: "none", borderRadius: 12, padding: "10px 14px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: FONT } as const;
const LEVEL = { ok: "var(--success)", todo: "var(--fg)", warn: "#B7791F", bad: "var(--danger)" };
const DOT = { ok: "✅", todo: "⬜️", warn: "⚠️", bad: "⛔️" };

export default function TripPage() {
  const { status } = useSession();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { m, dateLocale, err } = useI18n();
  const t = m.trips;
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>("before");
  const [who, setWho] = useState<string>("ALL");
  const [text, setText] = useState("");
  const [flight, setFlight] = useState<{ flightNo: string; from: string; to: string; depYmd: string; depTime: string; arrTime: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/trips/${id}`);
    if (r.status === 404) { router.replace("/dashboard/trips"); return; }
    if (r.ok) setData(await r.json());
  }, [id, router]);
  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  useEffect(() => { if (status === "authenticated") load(); }, [status, load]);
  useEffect(() => { try { const s = localStorage.getItem("rfs-trip-tab"); if (s === "before" || s === "flights" || s === "pack" || s === "ideas") setTab(s); } catch { /* ignore */ } }, []);
  useEffect(() => { if (data && !data.isAdult) setWho(data.me); }, [data?.isAdult, data?.me]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = (body: object, method = "POST") => fetch(`/api/trips/${id}/items`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const day = (ymd: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) => new Date(ymd + "T12:00:00Z").toLocaleDateString(dateLocale, { ...opts, timeZone: "UTC" });
  function pickTab(x: Tab) { setTab(x); setText(""); setError(null); try { localStorage.setItem("rfs-trip-tab", x); } catch { /* ignore */ } }

  async function add(kind: "PACK" | "IDEA" | "TODO") {
    const label = text.trim();
    if (!label) return;
    setText("");
    await items({ kind, label, personId: kind === "PACK" && who !== "ALL" && who !== "SHARED" ? who : null });
    load();
  }
  async function toggle(itemId: string, checked: boolean) {
    setData((d) => d && { ...d, pack: d.pack.map((p) => (p.id === itemId ? { ...p, checked } : p)), steps: d.steps.map((s) => (s.itemId === itemId && !s.key.startsWith("leave") ? { ...s, done: checked } : s)), flights: d.flights.map((f) => (f.id === itemId ? { ...f, checked } : f)) });
    await items({ itemId, checked }, "PATCH");
    load();
  }
  async function remove(itemId: string) {
    await fetch(`/api/trips/${id}/items?itemId=${encodeURIComponent(itemId)}`, { method: "DELETE" });
    load();
  }
  async function vote(idea: Idea) {
    const on = !idea.votes.includes(data!.me);
    setData((d) => d && { ...d, ideas: d.ideas.map((x) => (x.id === idea.id ? { ...x, votes: on ? [...x.votes, d.me] : x.votes.filter((v) => v !== d.me) } : x)) });
    await items({ itemId: idea.id, vote: on }, "PATCH");
  }
  async function setPassport(userId: string, expires: string) {
    await fetch("/api/passports", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, expires: expires || null }) });
    load();
  }
  async function saveFlight() {
    if (!flight) return;
    setError(null);
    const r = await items({ kind: "FLIGHT", ...flight });
    if (!r.ok) { setError(err((await r.json().catch(() => ({}))).error)); return; }
    setFlight(null);
    load();
  }
  async function patchTrip(body: object) {
    await fetch(`/api/trips/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    load();
  }
  async function del() {
    if (!window.confirm(t.deleteConfirm)) return;
    await fetch(`/api/trips/${id}`, { method: "DELETE" });
    router.push("/dashboard/trips");
  }

  if (!data) return <div style={{ minHeight: "100vh", background: "var(--background)" }} />;
  const { trip } = data;
  const nameOf = (pid: string | null) => (pid ? data.people.find((p) => p.id === pid)?.name ?? "?" : t.shared);
  const countdown = data.daysTo >= 0 ? t.inDays(data.daysTo) : data.daysLeft >= 0 ? t.ongoing : t.done;
  const packShown = data.pack.filter((p) => who === "ALL" || (who === "SHARED" ? !p.personId : p.personId === who));
  const packedAll = data.pack.filter((p) => p.checked).length;
  const groups = new Map<string, Pack[]>();
  for (const p of packShown) { const k = p.personId ?? ""; groups.set(k, [...(groups.get(k) ?? []), p]); }
  const ideas = [...data.ideas].sort((a, b) => b.votes.length - a.votes.length);
  const canEdit = (createdOrPerson: string | null) => data.isAdult || createdOrPerson === data.me;
  const addRow = (kind: "PACK" | "IDEA" | "TODO", placeholder: string) => (
    <form onSubmit={(e) => { e.preventDefault(); add(kind); }} style={{ display: "flex", gap: 8, marginTop: 10 }}>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label={placeholder} maxLength={120} style={{ ...input, flex: 1, minWidth: 0 }} />
      <button type="submit" disabled={!text.trim()} style={{ ...btn, background: "var(--surface-3)", color: "var(--fg-2)", opacity: text.trim() ? 1 : 0.5 }}>{t.add}</button>
    </form>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT }}>
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push("/dashboard/trips")} aria-label={m.common.back} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-2)", display: "flex", padding: 4 }}><IcBack /></button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)", margin: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{trip.name}</h1>
          <HamburgerMenu />
        </div>
      </div>

      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "16px 20px 48px" }}>
        {/* Countdown */}
        <div style={{ background: "var(--hero-grad)", borderRadius: 20, padding: "18px 20px", color: "#fff", marginBottom: 16 }}>
          <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 700 }}>{[trip.destination, `${day(trip.startYmd, { day: "numeric", month: "short" })} – ${day(trip.endYmd, { day: "numeric", month: "short" })}`].filter(Boolean).join(" · ")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px", marginTop: 4 }}>{countdown}</div>
          {data.daysTo >= 0 && <div style={{ fontSize: 13.5, opacity: 0.9, marginTop: 4 }}>{data.stepsLeft ? t.leftBefore(data.stepsLeft) : t.stepPacked} · {t.packedOf(packedAll, data.pack.length)}</div>}
          <div style={{ display: "flex", marginTop: 12 }}>
            {data.travellers.map((p, i) => <span key={p.id} style={{ marginLeft: i ? -8 : 0, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.8)", display: "flex" }}><Avatar userId={p.id} name={p.name} size={28} /></span>)}
          </div>
        </div>

        {/* Tabs */}
        <div role="tablist" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, background: "var(--surface-3)", borderRadius: 14, padding: 4, marginBottom: 16 }}>
          {(["before", "flights", "pack", "ideas"] as Tab[]).map((x) => (
            <button key={x} role="tab" aria-selected={tab === x} onClick={() => pickTab(x)}
              style={{ border: "none", borderRadius: 10, padding: "9px 2px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: FONT, background: tab === x ? "var(--surface)" : "transparent", color: tab === x ? "var(--fg)" : "var(--muted)", boxShadow: tab === x ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
              {t.tabs[x]}
            </button>
          ))}
        </div>

        {tab === "before" && (
          <>
            <div style={{ ...card, padding: "4px 14px" }}>
              {data.steps.map((s, i) => {
                const tickable = !!s.itemId && !s.key.startsWith("leave");
                return (
                  <div key={s.key} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "11px 0", borderTop: i ? "1px solid var(--border-soft)" : "none" }}>
                    {tickable ? (
                      <input type="checkbox" checked={s.done} onChange={() => toggle(s.itemId!, !s.done)} disabled={!data.isAdult} aria-label={s.text} style={{ width: 20, height: 20, marginTop: 1, accentColor: "var(--accent)", flexShrink: 0 }} />
                    ) : (
                      <span aria-hidden style={{ width: 20, textAlign: "center", flexShrink: 0, fontSize: 14 }}>{s.key.startsWith("leave") ? "🚗" : DOT[s.level]}</span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: s.done ? "var(--muted)" : LEVEL[s.level], textDecoration: s.done && tickable ? "line-through" : "none", lineHeight: 1.4 }}>{s.text}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{day(s.ymd)}</div>
                      {s.personId && (data.isAdult || s.personId === data.me) && (
                        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontSize: 12, color: "var(--muted)" }}>
                          {t.passportExpiry}
                          <input type="date" defaultValue={data.passports[s.personId] ?? ""} onBlur={(e) => { if (e.target.value !== (data.passports[s.personId!] ?? "")) setPassport(s.personId!, e.target.value); }} style={{ ...input, width: "auto", padding: "5px 8px", fontSize: 13 }} />
                        </label>
                      )}
                    </div>
                    {data.isAdult && s.itemId && !s.key.startsWith("leave") && !s.key.startsWith("checkin") && s.key !== "vaccine" && (
                      <button type="button" onClick={() => remove(s.itemId!)} aria-label={m.assist.qaRemove} style={{ border: "none", background: "none", color: "var(--subtle)", fontSize: 18, cursor: "pointer", padding: 2 }}>×</button>
                    )}
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "8px 4px 0" }}>🔒 {t.passportHint}</p>
            {data.isAdult && addRow("TODO", t.addTodo)}
            {data.isAdult && (
              <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, fontSize: 14, color: "var(--fg)", cursor: "pointer" }}>
                <input type="checkbox" checked={trip.vaccine} onChange={(e) => patchTrip({ vaccine: e.target.checked })} style={{ width: 20, height: 20, accentColor: "var(--accent)" }} /> 💉 {t.vaccine}
              </label>
            )}
          </>
        )}

        {tab === "flights" && (
          <>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 2px 12px", lineHeight: 1.5 }}>{t.flightsIntro}</p>
            {data.flights.map((f) => (
              <div key={f.id} style={{ ...card, padding: "14px 16px", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "var(--fg)" }}>✈️ {f.flightNo?.toUpperCase()} {f.from && f.to ? `${f.from.toUpperCase()} → ${f.to.toUpperCase()}` : ""}</span>
                  {data.isAdult && <button type="button" onClick={() => remove(f.id)} aria-label={m.assist.qaRemove} style={{ border: "none", background: "none", color: "var(--subtle)", fontSize: 18, cursor: "pointer" }}>×</button>}
                </div>
                <div style={{ fontSize: 14, color: "var(--fg-2)", marginTop: 4, fontWeight: 600 }}>{day(f.depYmd)} · {f.depTime}{f.arrTime ? ` – ${f.arrTime}` : ""}</div>
                <div style={{ marginTop: 10, background: "var(--tint-accent)", color: "var(--accent-strong)", borderRadius: 12, padding: "9px 12px", fontSize: 14, fontWeight: 800 }}>🚗 {t.leaveHome(f.leave, f.leaveDayBefore)}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>{t.timing(trip.airportBufferMin, trip.homeToAirportMin)}</div>
                {data.isAdult && (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13.5, color: "var(--fg)", cursor: "pointer" }}>
                    <input type="checkbox" checked={f.checked} onChange={() => toggle(f.id, !f.checked)} style={{ width: 18, height: 18, accentColor: "var(--accent)" }} /> {t.checkedIn}
                  </label>
                )}
              </div>
            ))}
            {data.isAdult && !flight && (
              <button type="button" onClick={() => setFlight({ flightNo: "", from: "", to: "", depYmd: data.flights.length ? trip.endYmd : trip.startYmd, depTime: "", arrTime: "" })} style={{ ...btn, width: "100%", background: "var(--accent-bg)", color: "var(--on-accent)", padding: 13 }}>+ {t.addFlight}</button>
            )}
            {flight && (
              <div style={{ ...card, padding: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <div><label style={{ ...small, marginTop: 0 }}>{t.flightNo}</label><input style={input} value={flight.flightNo} placeholder="SK123" maxLength={12} onChange={(e) => setFlight({ ...flight, flightNo: e.target.value })} /></div>
                  <div><label style={{ ...small, marginTop: 0 }}>{t.flightFrom}</label><input style={input} value={flight.from} placeholder="ARN" maxLength={30} onChange={(e) => setFlight({ ...flight, from: e.target.value })} /></div>
                  <div><label style={{ ...small, marginTop: 0 }}>{t.flightTo}</label><input style={input} value={flight.to} placeholder="SPU" maxLength={30} onChange={(e) => setFlight({ ...flight, to: e.target.value })} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 8 }}>
                  <div><label style={small}>{t.depDate}</label><input type="date" style={input} value={flight.depYmd} onChange={(e) => setFlight({ ...flight, depYmd: e.target.value })} /></div>
                  <div><label style={small}>{t.depTime}</label><input type="time" style={input} value={flight.depTime} onChange={(e) => setFlight({ ...flight, depTime: e.target.value })} /></div>
                  <div><label style={small}>{t.arrTime}</label><input type="time" style={input} value={flight.arrTime} onChange={(e) => setFlight({ ...flight, arrTime: e.target.value })} /></div>
                </div>
                {error && <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 700, marginTop: 10 }}>{error}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <button type="button" onClick={saveFlight} disabled={!flight.depYmd || !flight.depTime} style={{ ...btn, flex: 1, background: "var(--accent-bg)", color: "var(--on-accent)", opacity: flight.depYmd && flight.depTime ? 1 : 0.5 }}>{t.save}</button>
                  <button type="button" onClick={() => setFlight(null)} style={{ ...btn, background: "var(--surface-3)", color: "var(--fg-2)" }}>{t.cancel}</button>
                </div>
              </div>
            )}
            {data.isAdult && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
                <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>{t.airportMin}
                  <input type="number" min={0} max={600} step={15} defaultValue={trip.airportBufferMin} onBlur={(e) => patchTrip({ airportBufferMin: Number(e.target.value) })} style={{ ...input, marginTop: 5 }} />
                </label>
                <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>{t.travelMin}
                  <input type="number" min={0} max={600} step={5} defaultValue={trip.homeToAirportMin} onBlur={(e) => patchTrip({ homeToAirportMin: Number(e.target.value) })} style={{ ...input, marginTop: 5 }} />
                </label>
              </div>
            )}
          </>
        )}

        {tab === "pack" && (
          <>
            <div className="rfs-hscroll" style={{ display: "flex", gap: 6, overflowX: "auto", margin: "0 -20px 12px", padding: "0 20px 2px" }}>
              {[{ id: "ALL", name: t.everyone }, ...data.travellers.map((p) => ({ id: p.id, name: p.id === data.me ? `${p.name} (${t.mine.toLowerCase()})` : p.name })), { id: "SHARED", name: t.shared }].map((p) => (
                <button key={p.id} type="button" onClick={() => setWho(p.id)} aria-pressed={who === p.id}
                  style={{ flexShrink: 0, padding: "7px 13px", borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT, border: who === p.id ? "1.5px solid var(--accent)" : "1.5px solid var(--border)", background: who === p.id ? "var(--tint-accent)" : "var(--surface)", color: who === p.id ? "var(--accent-strong)" : "var(--fg-2)" }}>
                  {p.name}
                </button>
              ))}
            </div>
            {Array.from(groups.entries()).map(([pid, list]) => (
              <section key={pid || "shared"} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 4px 6px" }}>
                  <span>{nameOf(pid || null)}</span><span>{list.filter((x) => x.checked).length}/{list.length}</span>
                </div>
                <div style={{ ...card, padding: "2px 14px" }}>
                  {list.map((p, i) => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: i ? "1px solid var(--border-soft)" : "none" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: canEdit(p.personId) ? "pointer" : "default", fontSize: 14.5, color: "var(--fg)" }}>
                        <input type="checkbox" checked={p.checked} disabled={!canEdit(p.personId)} onChange={() => toggle(p.id, !p.checked)} style={{ width: 20, height: 20, accentColor: "var(--accent)", flexShrink: 0 }} />
                        <span style={{ textDecoration: p.checked ? "line-through" : "none", opacity: p.checked ? 0.5 : 1 }}>{p.label}</span>
                      </label>
                      {canEdit(p.personId) && <button type="button" onClick={() => remove(p.id)} aria-label={m.assist.qaRemove} style={{ border: "none", background: "none", color: "var(--subtle)", fontSize: 18, cursor: "pointer", padding: 2 }}>×</button>}
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {(data.isAdult || who === data.me) && addRow("PACK", `${t.addPack}${who !== "ALL" ? ` (${who === "SHARED" ? t.shared : nameOf(who)})` : ""}`)}
          </>
        )}

        {tab === "ideas" && (
          <>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 2px 12px", lineHeight: 1.5 }}>{t.ideasIntro}</p>
            {ideas.length > 0 && (
              <div style={{ ...card, padding: "2px 14px" }}>
                {ideas.map((idea, i) => {
                  const mine = idea.votes.includes(data.me);
                  return (
                    <div key={idea.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderTop: i ? "1px solid var(--border-soft)" : "none" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--fg)" }}>{idea.label}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{nameOf(idea.personId)} · {t.votes(idea.votes.length)}</div>
                      </div>
                      <button type="button" onClick={() => vote(idea)} aria-pressed={mine} style={{ ...btn, padding: "7px 12px", fontSize: 13, background: mine ? "var(--accent-bg)" : "var(--surface-3)", color: mine ? "var(--on-accent)" : "var(--fg-2)" }}>👍 {idea.votes.length}</button>
                      {canEdit(idea.personId) && <button type="button" onClick={() => remove(idea.id)} aria-label={m.assist.qaRemove} style={{ border: "none", background: "none", color: "var(--subtle)", fontSize: 18, cursor: "pointer", padding: 2 }}>×</button>}
                    </div>
                  );
                })}
              </div>
            )}
            {addRow("IDEA", t.addIdea)}
          </>
        )}

        {data.isAdult && (
          <button type="button" onClick={del} style={{ ...btn, background: "none", color: "var(--danger)", marginTop: 32, padding: "10px 0" }}>{t.delete}</button>
        )}
      </main>
    </div>
  );
}
