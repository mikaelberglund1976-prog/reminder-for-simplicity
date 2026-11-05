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
type Flight = { id: string; checked: boolean; flightNo?: string; from?: string; to?: string; depYmd: string; depTime: string; arrTime?: string | null; arrNextDay?: boolean; connection?: boolean; airportMin: number; travelMin: number; leave: string | null; leaveDayBefore: boolean; layover: number | null; layoverAt: string | null };
type FlightDraft = { id: string | null; flightNo: string; from: string; to: string; depYmd: string; depTime: string; arrTime: string; arrNextDay: boolean; connection: boolean; airportMin: number; travelMin: number };
type Pack = { id: string; label: string; personId: string | null; checked: boolean };
type Idea = { id: string; label: string; url: string | null; personId: string; votes: string[] };
type Trip = { id: string; name: string; destination: string | null; startYmd: string; endYmd: string; kind: string; vaccine: boolean; homeToAirportMin: number; airportBufferMin: number };
// 2026-11-05: the route — stays, moves and the warnings from lib/tripPlan.ts.
type Stay = { id: string; name: string; checkIn: string; checkOut: string; checkInTime?: string | null; checkOutTime?: string | null; address?: string; localAddress?: string; bookingRef?: string; phone?: string; url?: string | null; note?: string; nights: number };
type StayDraft = { id: string | null; name: string; checkIn: string; checkOut: string; checkInTime: string; checkOutTime: string; address: string; localAddress: string; bookingRef: string; phone: string; url: string; note: string };
type Move = { id: string; mode: string; ref?: string; from?: string; to?: string; depYmd: string; depTime?: string | null; arrTime?: string | null; arrNextDay?: boolean; bookingRef?: string; note?: string; title: string };
type MoveDraft = { id: string | null; mode: string; ref: string; from: string; to: string; depYmd: string; depTime: string; arrTime: string; arrNextDay: boolean; bookingRef: string; note: string };
type Warning = { key: string; kind: "GAP" | "OVERLAP" | "OUTSIDE" | "TRANSFER" | "LATE"; at: string; nights?: string[]; place?: string; time?: string; legTitle: string | null; stayNames: string[]; fix?: { type: "STAY"; checkIn: string; checkOut: string } | { type: "MOVE"; mode: string; from?: string; depYmd: string; depTime?: string } };
type Data = { trip: Trip; me: string; isAdult: boolean; people: Person[]; travellers: Person[]; daysTo: number; daysLeft: number; steps: Step[]; stepsLeft: number; passports: Record<string, string | null>; flights: Flight[]; pack: Pack[]; ideas: Idea[]; stays: Stay[]; moves: Move[]; warnings: Warning[]; dismissed: number; frame: { start: string; end: string } };
const MODES = ["TRAIN", "BUS", "BOAT", "CAR", "TRANSFER", "OTHER"];
const plusDay = (ymd: string, n = 1) => new Date(Date.parse(ymd + "T12:00:00Z") + n * 86400000).toISOString().slice(0, 10);
const mapLinks = (q: string) => ({ apple: `https://maps.apple.com/?q=${encodeURIComponent(q)}`, google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` });
type Tab = "before" | "flights" | "pack" | "ideas";

const card = { background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" };
const input = { width: "100%", minWidth: 0, boxSizing: "border-box" as const, padding: "10px 12px", borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--fg)", fontSize: 14, fontFamily: FONT };
const small = { display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--muted)", margin: "10px 0 5px" };
const btn = { border: "none", borderRadius: 12, padding: "10px 14px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: FONT } as const;
const LEVEL = { ok: "var(--success)", todo: "var(--fg)", warn: "#B7791F", bad: "var(--danger)" };
const DOT = { ok: "✅", todo: "⬜️", warn: "⚠️", bad: "⛔️" };

function hostOf(url: string) {
  try { return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, ""); } catch { return url; }
}

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
  const [flight, setFlight] = useState<FlightDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 2026-10-11 (Mikael): a link on "Want to do" — new idea, or tap one to change it.
  const [ideaUrlText, setIdeaUrlText] = useState("");
  const [editIdea, setEditIdea] = useState<{ id: string; label: string; url: string } | null>(null);
  const [stay, setStay] = useState<StayDraft | null>(null);
  const [move, setMove] = useState<MoveDraft | null>(null);
  const [taxi, setTaxi] = useState<Stay | null>(null);
  const [routeFilter, setRouteFilter] = useState<string[]>([]);
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());
  useEffect(() => { try { const v = JSON.parse(localStorage.getItem(`rfs-trip-filter-${id}`) ?? "[]"); if (Array.isArray(v)) setRouteFilter(v.filter((x) => typeof x === "string")); } catch { /* ignore */ } }, [id]);

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
    let label = text.trim();
    let url = kind === "IDEA" ? ideaUrlText.trim() : "";
    // A link pasted into the text field: split it out (and use the site name if nothing else was written).
    const m2 = kind === "IDEA" && !url ? /(https?:\/\/\S+|www\.\S+)/i.exec(label) : null;
    if (m2) { url = m2[1]; label = label.replace(m2[1], "").trim() || hostOf(url); }
    if (!label && url) label = hostOf(url);
    if (!label) return;
    setError(null);
    const r = await items({ kind, label, url: url || undefined, personId: kind === "PACK" && who !== "ALL" && who !== "SHARED" ? who : null });
    if (!r.ok) { setError(err((await r.json().catch(() => ({}))).error)); return; }
    setText(""); setIdeaUrlText("");
    load();
  }
  async function saveIdea() {
    if (!editIdea) return;
    setError(null);
    const r = await items({ itemId: editIdea.id, label: editIdea.label, url: editIdea.url.trim() }, "PATCH");
    if (!r.ok) { setError(err((await r.json().catch(() => ({}))).error)); return; }
    setEditIdea(null);
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
    const { id: flightId, ...body } = flight;
    const r = flightId ? await items({ itemId: flightId, flight: body }, "PATCH") : await items({ kind: "FLIGHT", ...body });
    if (!r.ok) { setError(err((await r.json().catch(() => ({}))).error)); return; }
    setFlight(null);
    load();
  }
  async function saveStay() {
    if (!stay) return;
    setError(null);
    const { id: stayId, ...body } = stay;
    const r = stayId ? await items({ itemId: stayId, stay: body }, "PATCH") : await items({ kind: "STAY", ...body });
    if (!r.ok) { setError(err((await r.json().catch(() => ({}))).error)); return; }
    setStay(null);
    load();
  }
  async function saveMove() {
    if (!move) return;
    setError(null);
    const { id: moveId, ...body } = move;
    const r = moveId ? await items({ itemId: moveId, move: body }, "PATCH") : await items({ kind: "MOVE", ...body });
    if (!r.ok) { setError(err((await r.json().catch(() => ({}))).error)); return; }
    setMove(null);
    load();
  }
  async function dismiss(key: string) {
    setData((d) => d && { ...d, warnings: d.warnings.filter((w) => w.key !== key), dismissed: d.dismissed + 1 });
    await items({ kind: "DISMISS", key });
    load();
  }
  async function undismissAll() {
    await items({ undismissAll: true }, "PATCH");
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
  // 2026-10-11: tap a flight to change it. A new flight starts where the last
  // one landed; the same day as the last landing = a connecting flight.
  function openFlight(f: Flight | null) {
    setError(null); setStay(null); setMove(null);
    if (f) { setFlight({ id: f.id, flightNo: f.flightNo ?? "", from: f.from ?? "", to: f.to ?? "", depYmd: f.depYmd, depTime: f.depTime, arrTime: f.arrTime ?? "", arrNextDay: !!f.arrNextDay, connection: !!f.connection, airportMin: f.airportMin, travelMin: f.travelMin }); return; }
    const last = data!.flights[data!.flights.length - 1];
    const lastArr = last ? (last.arrNextDay ? new Date(Date.parse(last.depYmd + "T12:00:00Z") + 86400000).toISOString().slice(0, 10) : last.depYmd) : null;
    setFlight({ id: null, flightNo: "", from: last?.to ?? "", to: "", depYmd: lastArr ?? data!.trip.startYmd, depTime: "", arrTime: "", arrNextDay: false, connection: !!last, airportMin: data!.trip.airportBufferMin, travelMin: data!.trip.homeToAirportMin });
  }
  function setDepDate(ymd: string) {
    if (!flight) return;
    const others = data!.flights.filter((x) => x.id !== flight.id && (x.depYmd + x.depTime) < (ymd + (flight.depTime || "23:59")));
    const prev = others[others.length - 1];
    const prevArr = prev ? (prev.arrNextDay ? new Date(Date.parse(prev.depYmd + "T12:00:00Z") + 86400000).toISOString().slice(0, 10) : prev.depYmd) : null;
    setFlight({ ...flight, depYmd: ymd, connection: !flight.id ? prevArr === ymd : flight.connection });
  }
  function closeForms() { setError(null); setFlight(null); setStay(null); setMove(null); }
  function openStay(x: Stay | null, prefill?: { checkIn: string; checkOut: string }) {
    closeForms();
    if (x) { setStay({ id: x.id, name: x.name, checkIn: x.checkIn, checkOut: x.checkOut, checkInTime: x.checkInTime ?? "", checkOutTime: x.checkOutTime ?? "", address: x.address ?? "", localAddress: x.localAddress ?? "", bookingRef: x.bookingRef ?? "", phone: x.phone ?? "", url: x.url ?? "", note: x.note ?? "" }); return; }
    const last = data!.stays[data!.stays.length - 1];
    const ci = prefill?.checkIn ?? last?.checkOut ?? data!.frame.start;
    setStay({ id: null, name: "", checkIn: ci, checkOut: prefill?.checkOut ?? plusDay(ci), checkInTime: "", checkOutTime: "", address: "", localAddress: "", bookingRef: "", phone: "", url: "", note: "" });
  }
  function openMove(x: Move | null, prefill?: { mode: string; from?: string; depYmd: string; depTime?: string }) {
    closeForms();
    if (x) { setMove({ id: x.id, mode: x.mode, ref: x.ref ?? "", from: x.from ?? "", to: x.to ?? "", depYmd: x.depYmd, depTime: x.depTime ?? "", arrTime: x.arrTime ?? "", arrNextDay: !!x.arrNextDay, bookingRef: x.bookingRef ?? "", note: x.note ?? "" }); return; }
    setMove({ id: null, mode: prefill?.mode ?? "TRAIN", ref: "", from: prefill?.from ?? "", to: "", depYmd: prefill?.depYmd ?? data!.frame.start, depTime: prefill?.depTime ?? "", arrTime: "", arrNextDay: false, bookingRef: "", note: "" });
  }
  const shortDay = (ymd: string) => day(ymd, { day: "numeric", month: "short" });
  const nightsText = (ns: string[]) => `${shortDay(ns[0])} → ${shortDay(plusDay(ns[ns.length - 1]))}`;
  function warnText(w: Warning) {
    if (w.kind === "GAP") return t.warnGap(w.nights!.length, nightsText(w.nights!));
    if (w.kind === "OVERLAP") return t.warnOverlap(w.stayNames[0], w.stayNames[1], nightsText(w.nights!));
    if (w.kind === "OUTSIDE") return t.warnOutside(w.stayNames[0]);
    if (w.kind === "TRANSFER") return t.warnTransfer(w.place ?? null, w.legTitle ?? "");
    return t.warnLate(w.time ?? "", w.stayNames[0]);
  }
  const warnCard = (w: Warning) => (
    <div key={w.key} style={{ borderRadius: 14, padding: "11px 14px", marginBottom: 10, background: "var(--tint-warn, rgba(183,121,31,0.10))", border: "1.5px dashed #B7791F" }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--fg)", lineHeight: 1.4 }}><span aria-hidden>⚠️ </span>{warnText(w)}</div>
      {data!.isAdult && (
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          {w.fix?.type === "STAY" && <button type="button" onClick={() => { pickTab("flights"); openStay(null, w.fix as { checkIn: string; checkOut: string }); }} style={{ ...btn, padding: "7px 12px", fontSize: 13, background: "var(--accent-bg)", color: "var(--on-accent)" }}>+ {t.fixStay}</button>}
          {w.fix?.type === "MOVE" && <button type="button" onClick={() => { pickTab("flights"); openMove(null, w.fix as { mode: string; from?: string; depYmd: string; depTime?: string }); }} style={{ ...btn, padding: "7px 12px", fontSize: 13, background: "var(--accent-bg)", color: "var(--on-accent)" }}>+ {t.fixMove}</button>}
          {(w.kind === "OVERLAP" || w.kind === "OUTSIDE" || w.kind === "LATE") && <span style={{ fontSize: 12, color: "var(--muted)", alignSelf: "center" }}>{t.warnHint}</span>}
          <button type="button" onClick={() => dismiss(w.key)} style={{ ...btn, padding: "7px 12px", fontSize: 13, background: "var(--surface-3)", color: "var(--fg-2)" }}>{t.ignore}</button>
        </div>
      )}
    </div>
  );
  const formButtons = (onSave: () => void, ok: boolean, onDelete: (() => void) | null, deleteLabel: string) => (
    <>
      {error && <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 700, marginTop: 10 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
        <button type="button" onClick={onSave} disabled={!ok} style={{ ...btn, flex: 1, background: "var(--accent-bg)", color: "var(--on-accent)", opacity: ok ? 1 : 0.5 }}>{t.save}</button>
        <button type="button" onClick={closeForms} style={{ ...btn, background: "var(--surface-3)", color: "var(--fg-2)" }}>{t.cancel}</button>
      </div>
      {onDelete && <button type="button" onClick={onDelete} style={{ ...btn, background: "none", color: "var(--danger)", padding: "12px 0 0" }}>{deleteLabel}</button>}
    </>
  );
  const stayForm = stay && (
    <div style={{ ...card, padding: 16, marginBottom: 10, border: "1.5px solid var(--accent-border)" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--fg)", marginBottom: 8 }}>🏨 {stay.id ? t.editStay : t.addStay}</div>
      <label style={{ ...small, marginTop: 0 }}>{t.stayName}</label><input style={input} value={stay.name} placeholder={t.stayNamePh} maxLength={80} onChange={(e) => setStay({ ...stay, name: e.target.value })} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8 }}>
        <div><label style={small}>{t.checkIn}</label><input type="date" style={input} value={stay.checkIn} onChange={(e) => { const ci = e.target.value; setStay({ ...stay, checkIn: ci, checkOut: stay.checkOut > ci ? stay.checkOut : plusDay(ci) }); }} /></div>
        <div><label style={small}>{t.checkOut}</label><input type="date" style={input} value={stay.checkOut} min={stay.checkIn ? plusDay(stay.checkIn) : undefined} onChange={(e) => setStay({ ...stay, checkOut: e.target.value })} /></div>
        <div><label style={small}>{t.timeOpt}</label><input type="time" style={input} value={stay.checkInTime} aria-label={`${t.checkIn} ${t.timeOpt}`} onChange={(e) => setStay({ ...stay, checkInTime: e.target.value })} /></div>
        <div><label style={small}>{t.timeOpt}</label><input type="time" style={input} value={stay.checkOutTime} aria-label={`${t.checkOut} ${t.timeOpt}`} onChange={(e) => setStay({ ...stay, checkOutTime: e.target.value })} /></div>
      </div>
      {stay.checkIn && stay.checkOut > stay.checkIn && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6, fontWeight: 700 }}>{t.nights(Math.round((Date.parse(stay.checkOut) - Date.parse(stay.checkIn)) / 86400000))}</div>}
      <label style={small}>{t.address}</label><input style={input} value={stay.address} maxLength={200} onChange={(e) => setStay({ ...stay, address: e.target.value })} />
      <label style={small}>{t.localAddress}</label><input style={input} value={stay.localAddress} placeholder={t.localAddressPh} maxLength={200} onChange={(e) => setStay({ ...stay, localAddress: e.target.value })} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8 }}>
        <div><label style={small}>{t.bookingRef}</label><input style={input} value={stay.bookingRef} maxLength={40} onChange={(e) => setStay({ ...stay, bookingRef: e.target.value })} /></div>
        <div><label style={small}>{t.phone}</label><input type="tel" style={input} value={stay.phone} maxLength={30} onChange={(e) => setStay({ ...stay, phone: e.target.value })} /></div>
      </div>
      <label style={small}>{t.stayLink}</label><input style={input} value={stay.url} inputMode="url" placeholder={t.linkPlaceholder} maxLength={1000} onChange={(e) => setStay({ ...stay, url: e.target.value })} />
      <label style={small}>{t.note}</label><input style={input} value={stay.note} maxLength={300} onChange={(e) => setStay({ ...stay, note: e.target.value })} />
      {formButtons(saveStay, !!stay.name.trim() && !!stay.checkIn && stay.checkOut > stay.checkIn, stay.id ? () => { const sid = stay.id!; closeForms(); remove(sid); } : null, t.deleteStay)}
    </div>
  );
  const moveForm = move && (
    <div style={{ ...card, padding: 16, marginBottom: 10, border: "1.5px solid var(--accent-border)" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--fg)", marginBottom: 8 }}>{move.id ? t.editMove : t.addMove}</div>
      <div className="rfs-hscroll" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        {MODES.map((x) => (
          <button key={x} type="button" aria-pressed={move.mode === x} onClick={() => setMove({ ...move, mode: x })}
            style={{ flexShrink: 0, padding: "7px 12px", borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT, border: move.mode === x ? "1.5px solid var(--accent)" : "1.5px solid var(--border)", background: move.mode === x ? "var(--tint-accent)" : "var(--surface)", color: move.mode === x ? "var(--accent-strong)" : "var(--fg-2)" }}>{t.modes[x]}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8 }}>
        <div><label style={small}>{t.flightFrom}</label><input style={input} value={move.from} placeholder={t.moveFromPh} maxLength={60} onChange={(e) => setMove({ ...move, from: e.target.value })} /></div>
        <div><label style={small}>{t.flightTo}</label><input style={input} value={move.to} placeholder={t.moveToPh} maxLength={60} onChange={(e) => setMove({ ...move, to: e.target.value })} /></div>
      </div>
      <label style={small}>{t.depDate}</label><input type="date" style={input} value={move.depYmd} onChange={(e) => setMove({ ...move, depYmd: e.target.value })} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8 }}>
        <div><label style={small}>{t.depTime}</label><input type="time" style={input} value={move.depTime} onChange={(e) => setMove({ ...move, depTime: e.target.value })} /></div>
        <div><label style={small}>{t.arrTime}</label><input type="time" style={input} value={move.arrTime} onChange={(e) => setMove({ ...move, arrTime: e.target.value })} /></div>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13, color: "var(--fg-2)", cursor: "pointer" }}>
        <input type="checkbox" checked={move.arrNextDay} onChange={(e) => setMove({ ...move, arrNextDay: e.target.checked })} style={{ width: 18, height: 18, accentColor: "var(--accent)" }} /> {t.arrNextDay}
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8 }}>
        <div><label style={small}>{t.moveRef}</label><input style={input} value={move.ref} placeholder={t.moveRefPh} maxLength={20} onChange={(e) => setMove({ ...move, ref: e.target.value })} /></div>
        <div><label style={small}>{t.bookingRef}</label><input style={input} value={move.bookingRef} maxLength={40} onChange={(e) => setMove({ ...move, bookingRef: e.target.value })} /></div>
      </div>
      <label style={small}>{t.note}</label><input style={input} value={move.note} maxLength={300} onChange={(e) => setMove({ ...move, note: e.target.value })} />
      {formButtons(saveMove, !!move.depYmd, move.id ? () => { const mid = move.id!; closeForms(); remove(mid); } : null, t.deleteMove)}
    </div>
  );
  const flightForm = flight && (
    <div style={{ ...card, padding: 16, marginBottom: 10, border: "1.5px solid var(--accent-border)" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--fg)", marginBottom: 8 }}>{flight.id ? t.editFlight : t.addFlight}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        <div><label style={{ ...small, marginTop: 0 }}>{t.flightNo}</label><input style={input} value={flight.flightNo} placeholder="SK123" maxLength={12} onChange={(e) => setFlight({ ...flight, flightNo: e.target.value })} /></div>
        <div><label style={{ ...small, marginTop: 0 }}>{t.flightFrom}</label><input style={input} value={flight.from} placeholder="ARN" maxLength={30} onChange={(e) => setFlight({ ...flight, from: e.target.value })} /></div>
        <div><label style={{ ...small, marginTop: 0 }}>{t.flightTo}</label><input style={input} value={flight.to} placeholder="SPU" maxLength={30} onChange={(e) => setFlight({ ...flight, to: e.target.value })} /></div>
      </div>
      <label style={small}>{t.depDate}</label><input type="date" style={input} value={flight.depYmd} onChange={(e) => setDepDate(e.target.value)} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8 }}>
        <div><label style={small}>{t.depTime}</label><input type="time" style={input} value={flight.depTime} onChange={(e) => setFlight({ ...flight, depTime: e.target.value })} /></div>
        <div><label style={small}>{t.arrTime}</label><input type="time" style={input} value={flight.arrTime} onChange={(e) => setFlight({ ...flight, arrTime: e.target.value })} /></div>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13, color: "var(--fg-2)", cursor: "pointer" }}>
        <input type="checkbox" checked={flight.arrNextDay} onChange={(e) => setFlight({ ...flight, arrNextDay: e.target.checked })} style={{ width: 18, height: 18, accentColor: "var(--accent)" }} /> {t.arrNextDay}
      </label>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 8, fontSize: 13, color: "var(--fg-2)", cursor: "pointer", lineHeight: 1.4 }}>
        <input type="checkbox" checked={flight.connection} onChange={(e) => setFlight({ ...flight, connection: e.target.checked })} style={{ width: 18, height: 18, accentColor: "var(--accent)", flexShrink: 0 }} /> {t.connection}
      </label>
      {!flight.connection && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div><label style={small}>{t.airportMin}</label><input type="number" inputMode="numeric" min={0} max={600} step={15} style={input} value={flight.airportMin} onChange={(e) => setFlight({ ...flight, airportMin: Number(e.target.value) || 0 })} /></div>
          <div><label style={small}>{t.travelMin}</label><input type="number" inputMode="numeric" min={0} max={600} step={5} style={input} value={flight.travelMin} onChange={(e) => setFlight({ ...flight, travelMin: Number(e.target.value) || 0 })} /></div>
        </div>
      )}
      {error && <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 700, marginTop: 10 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
        <button type="button" onClick={saveFlight} disabled={!flight.depYmd || !flight.depTime} style={{ ...btn, flex: 1, background: "var(--accent-bg)", color: "var(--on-accent)", opacity: flight.depYmd && flight.depTime ? 1 : 0.5 }}>{t.save}</button>
        <button type="button" onClick={() => setFlight(null)} style={{ ...btn, background: "var(--surface-3)", color: "var(--fg-2)" }}>{t.cancel}</button>
      </div>
      {flight.id && <button type="button" onClick={() => { const fid = flight.id!; setFlight(null); remove(fid); }} style={{ ...btn, background: "none", color: "var(--danger)", padding: "12px 0 0" }}>{t.deleteFlight}</button>}
    </div>
  );
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
            {data.warnings.length > 0 && (
              <section style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 4px 6px" }}>
                  <span>{t.planTitle}</span>
                  <button type="button" onClick={() => pickTab("flights")} style={{ border: "none", background: "none", color: "var(--accent)", fontSize: 12, fontWeight: 800, cursor: "pointer", padding: 0, textTransform: "none", letterSpacing: 0 }}>{t.seeRoute}</button>
                </div>
                {data.warnings.map((w) => warnCard(w))}
              </section>
            )}
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

        {tab === "flights" && (() => {
          // 2026-11-05: one timeline — flights, trains/buses/transfers, stays and the warnings, by time.
          // 2026-11-05 (Mikael 17:57): filter chips on top and compact rows by day — tap a row for details.
          type Cat = "FLIGHT" | "GROUND" | "TRANSFER" | "STAY" | "WARN";
          type Entry = { key: string; at: string; node: JSX.Element; cat?: Cat; icon?: string; time?: string; title?: string; sub?: string; editing?: boolean };
          const entries: Entry[] = [];
          for (const f of data.flights) entries.push({ key: f.id, at: `${f.depYmd}T${f.depTime}`, cat: "FLIGHT", icon: "✈️", time: `${f.depTime}${f.arrTime ? `–${f.arrTime}${f.arrNextDay ? " +1" : ""}` : ""}`, title: `${f.flightNo?.toUpperCase() ?? ""} ${f.from && f.to ? `${f.from.toUpperCase()} → ${f.to.toUpperCase()}` : ""}`.trim(), sub: f.connection ? t.layover(f.layoverAt, f.layover) : f.leave ? t.leaveHome(f.leave, f.leaveDayBefore) : undefined, editing: flight?.id === f.id, node: flight?.id === f.id ? <div key={f.id}>{flightForm}</div> : (
            <div key={f.id}>
              {f.connection && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "-2px 0 8px 18px", fontSize: 13, fontWeight: 700, color: f.layover !== null && f.layover < 60 ? "var(--danger)" : "var(--muted)" }}>
                  <span aria-hidden>⏱</span> {t.layover(f.layoverAt, f.layover)}{f.layover !== null && f.layover < 60 ? ` – ${t.shortLayover}` : ""}
                </div>
              )}
              <div role={data.isAdult ? "button" : undefined} tabIndex={data.isAdult ? 0 : undefined} onClick={() => data.isAdult && openFlight(f)} onKeyDown={(e) => { if (data.isAdult && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openFlight(f); } }}
                style={{ ...card, padding: "14px 16px", marginBottom: 10, cursor: data.isAdult ? "pointer" : "default" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "var(--fg)" }}>✈️ {f.flightNo?.toUpperCase()} {f.from && f.to ? `${f.from.toUpperCase()} → ${f.to.toUpperCase()}` : ""}</span>
                  {data.isAdult && <span aria-hidden style={{ color: "var(--subtle)", fontSize: 13, fontWeight: 700 }}>✎</span>}
                </div>
                <div style={{ fontSize: 14, color: "var(--fg-2)", marginTop: 4, fontWeight: 600 }}>{day(f.depYmd)} · {f.depTime}{f.arrTime ? ` – ${f.arrTime}${f.arrNextDay ? " (+1)" : ""}` : ""}</div>
                {f.leave && (
                  <>
                    <div style={{ marginTop: 10, background: "var(--tint-accent)", color: "var(--accent-strong)", borderRadius: 12, padding: "9px 12px", fontSize: 14, fontWeight: 800 }}>🚗 {t.leaveHome(f.leave, f.leaveDayBefore)}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>{t.timing(f.airportMin, f.travelMin)}</div>
                  </>
                )}
                {data.isAdult && !f.connection && (
                  <label onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13.5, color: "var(--fg)", cursor: "pointer" }}>
                    <input type="checkbox" checked={f.checked} onChange={() => toggle(f.id, !f.checked)} style={{ width: 18, height: 18, accentColor: "var(--accent)" }} /> {t.checkedIn}
                  </label>
                )}
              </div>
            </div>
          ) });
          for (const mv of data.moves) entries.push({ key: mv.id, at: `${mv.depYmd}T${mv.depTime || "12:00"}`, cat: mv.mode === "TRANSFER" ? "TRANSFER" : "GROUND", icon: mv.title.split(" ")[0], time: mv.depTime ? `${mv.depTime}${mv.arrTime ? `–${mv.arrTime}${mv.arrNextDay ? " +1" : ""}` : ""}` : undefined, title: mv.title.split(" ").slice(1).join(" ") || t.modes[mv.mode], editing: move?.id === mv.id, node: move?.id === mv.id ? <div key={mv.id}>{moveForm}</div> : (
            <div key={mv.id} role={data.isAdult ? "button" : undefined} tabIndex={data.isAdult ? 0 : undefined} onClick={() => data.isAdult && openMove(mv)} onKeyDown={(e) => { if (data.isAdult && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openMove(mv); } }}
              style={{ ...card, padding: "14px 16px", marginBottom: 10, cursor: data.isAdult ? "pointer" : "default" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: "var(--fg)" }}>{mv.title}</span>
                {data.isAdult && <span aria-hidden style={{ color: "var(--subtle)", fontSize: 13, fontWeight: 700 }}>✎</span>}
              </div>
              <div style={{ fontSize: 14, color: "var(--fg-2)", marginTop: 4, fontWeight: 600 }}>{t.modes[mv.mode]} · {day(mv.depYmd)}{mv.depTime ? ` · ${mv.depTime}` : ""}{mv.arrTime ? ` – ${mv.arrTime}${mv.arrNextDay ? " (+1)" : ""}` : ""}</div>
              {(mv.bookingRef || mv.note) && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>{[mv.bookingRef ? t.ref(mv.bookingRef) : null, mv.note].filter(Boolean).join(" · ")}</div>}
            </div>
          ) });
          for (const st of data.stays) {
            const q = st.address || st.name;
            const ml = mapLinks(q);
            entries.push({ key: st.id, at: `${st.checkIn}T23:00`, cat: "STAY", icon: "🏨", title: st.name, sub: `${t.nights(st.nights)} → ${day(st.checkOut)}`, editing: stay?.id === st.id, node: stay?.id === st.id ? <div key={st.id}>{stayForm}</div> : (
              <div key={st.id} role={data.isAdult ? "button" : undefined} tabIndex={data.isAdult ? 0 : undefined} onClick={() => data.isAdult && openStay(st)} onKeyDown={(e) => { if (data.isAdult && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openStay(st); } }}
                style={{ ...card, padding: "14px 16px", marginBottom: 10, cursor: data.isAdult ? "pointer" : "default", borderLeft: "4px solid var(--accent)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "var(--fg)" }}>🏨 {st.name}</span>
                  {data.isAdult && <span aria-hidden style={{ color: "var(--subtle)", fontSize: 13, fontWeight: 700 }}>✎</span>}
                </div>
                <div style={{ fontSize: 14, color: "var(--fg-2)", marginTop: 4, fontWeight: 600 }}>{t.nights(st.nights)} · {day(st.checkIn)}{st.checkInTime ? ` ${st.checkInTime}` : ""} → {day(st.checkOut)}{st.checkOutTime ? ` ${st.checkOutTime}` : ""}</div>
                {st.address && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>📍 {st.address}</div>}
                {(st.bookingRef || st.note) && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>{[st.bookingRef ? t.ref(st.bookingRef) : null, st.note].filter(Boolean).join(" · ")}</div>}
                <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                  {st.localAddress && <button type="button" onClick={() => setTaxi(st)} style={{ ...btn, padding: "6px 11px", fontSize: 12.5, background: "var(--accent-bg)", color: "var(--on-accent)" }}>🚕 {t.showTaxi}</button>}
                  <a href={ml.apple} target="_blank" rel="noopener noreferrer nofollow" style={{ ...btn, padding: "6px 11px", fontSize: 12.5, background: "var(--surface-3)", color: "var(--fg-2)", textDecoration: "none" }}>🗺 {t.map}</a>
                  <a href={ml.google} target="_blank" rel="noopener noreferrer nofollow" style={{ ...btn, padding: "6px 11px", fontSize: 12.5, background: "var(--surface-3)", color: "var(--fg-2)", textDecoration: "none" }}>Google Maps</a>
                  {st.phone && <a href={`tel:${st.phone.replace(/[^+0-9]/g, "")}`} style={{ ...btn, padding: "6px 11px", fontSize: 12.5, background: "var(--surface-3)", color: "var(--fg-2)", textDecoration: "none" }}>📞 {t.call}</a>}
                  {st.url && <a href={st.url} target="_blank" rel="noopener noreferrer nofollow" style={{ ...btn, padding: "6px 11px", fontSize: 12.5, background: "var(--surface-3)", color: "var(--fg-2)", textDecoration: "none" }}>🔗 {hostOf(st.url)}</a>}
                </div>
              </div>
            ) });
          }
          for (const w of data.warnings) entries.push({ key: w.key, at: w.at, cat: "WARN", node: warnCard(w) });
          entries.sort((a, b) => a.at.localeCompare(b.at));
          const CATS: Cat[] = ["FLIGHT", "GROUND", "TRANSFER", "STAY", "WARN"];
          const present = CATS.filter((c) => entries.some((e) => e.cat === c));
          const active = routeFilter.filter((c) => present.includes(c as Cat));
          // "All" = nothing picked. Warnings show under All and under "To sort".
          const shown = entries.filter((e) => (active.length ? active.includes(e.cat!) : true));
          const byDay: { ymd: string; list: Entry[] }[] = [];
          for (const e of shown) { const ymd = e.at.slice(0, 10); const last = byDay[byDay.length - 1]; if (last?.ymd === ymd) last.list.push(e); else byDay.push({ ymd, list: [e] }); }
          const chip = (key: string, label: string, on: boolean, onClick: () => void) => (
            <button key={key} type="button" aria-pressed={on} onClick={onClick}
              style={{ flexShrink: 0, padding: "7px 13px", borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT, border: on ? "1.5px solid var(--accent)" : "1.5px solid var(--border)", background: on ? "var(--tint-accent)" : "var(--surface)", color: on ? "var(--accent-strong)" : "var(--fg-2)" }}>{label}</button>
          );
          const pickFilter = (c: Cat | "ALL") => {
            const next = c === "ALL" ? [] : active.includes(c) ? active.filter((x) => x !== c) : [...active, c];
            setRouteFilter(next);
            try { localStorage.setItem(`rfs-trip-filter-${id}`, JSON.stringify(next)); } catch { /* ignore */ }
          };
          const toggleOpen = (k: string) => setOpenRows((o) => { const n = new Set(o); if (n.has(k)) n.delete(k); else n.add(k); return n; });
          const nightCount = Math.max(0, Math.round((Date.parse(data.frame.end) - Date.parse(data.frame.start)) / 86400000));
          return (
            <>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 2px 12px", lineHeight: 1.5 }}>{t.routeIntro} {t.flightsIntro}{data.isAdult && entries.length > 0 ? ` ${t.tapToEdit}` : ""}</p>
              {data.stays.length > 0 && data.warnings.length === 0 && <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--success)", margin: "0 2px 12px" }}>{t.allCovered(nightCount)}</div>}
              {present.length > 1 && (
                <div className="rfs-hscroll" style={{ display: "flex", gap: 6, overflowX: "auto", margin: "0 -20px 12px", padding: "0 20px 2px" }}>
                  {chip("ALL", t.filterAll, active.length === 0, () => pickFilter("ALL"))}
                  {present.map((c) => chip(c, c === "WARN" ? `${t.filters[c]} (${data.warnings.length})` : t.filters[c], active.includes(c), () => pickFilter(c)))}
                </div>
              )}
              {byDay.map((g) => (
                <section key={g.ymd} style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "4px 4px 6px" }}>{day(g.ymd, { weekday: "short", day: "numeric", month: "short" })}</div>
                  {g.list.map((e) => (e.cat === "WARN" || e.editing || openRows.has(e.key)) ? (
                    <div key={e.key}>
                      {e.node}
                      {!e.editing && e.cat !== "WARN" && <button type="button" onClick={() => toggleOpen(e.key)} style={{ ...btn, background: "none", color: "var(--muted)", fontSize: 12, padding: "0 4px 10px", marginTop: -4 }}>▲ {t.less}</button>}
                    </div>
                  ) : (
                    <button key={e.key} type="button" onClick={() => toggleOpen(e.key)} aria-expanded={false}
                      style={{ ...card, width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", marginBottom: 8, cursor: "pointer", fontFamily: FONT, borderLeft: e.cat === "STAY" ? "4px solid var(--accent)" : "1px solid var(--border)" }}>
                      <span aria-hidden style={{ fontSize: 18, width: 24, textAlign: "center", flexShrink: 0 }}>{e.icon}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</span>
                        {e.sub && <span style={{ display: "block", fontSize: 12.5, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.sub}</span>}
                      </span>
                      {e.time && <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-2)", flexShrink: 0 }}>{e.time}</span>}
                      <span aria-hidden style={{ color: "var(--subtle)", fontSize: 12 }}>▼</span>
                    </button>
                  ))}
                </section>
              ))}
              {flight && !flight.id && flightForm}
              {stay && !stay.id && stayForm}
              {move && !move.id && moveForm}
              {data.isAdult && !flight && !stay && !move && (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8 }}>
                    <button type="button" onClick={() => openFlight(null)} style={{ ...btn, background: "var(--accent-bg)", color: "var(--on-accent)", padding: 13 }}>+ ✈️ {t.addFlight}</button>
                    <button type="button" onClick={() => openStay(null)} style={{ ...btn, background: "var(--accent-bg)", color: "var(--on-accent)", padding: 13 }}>+ 🏨 {t.addStay}</button>
                  </div>
                  <button type="button" onClick={() => openMove(null)} style={{ ...btn, background: "var(--surface-3)", color: "var(--fg-2)", padding: 13 }}>+ {t.addMove}</button>
                </div>
              )}
              {data.isAdult && data.dismissed > 0 && <button type="button" onClick={undismissAll} style={{ ...btn, background: "none", color: "var(--muted)", fontSize: 12.5, padding: "12px 2px 0" }}>{t.dismissed(data.dismissed)}</button>}
            </>
          );
        })()}

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
                  const editable = canEdit(idea.personId);
                  if (editIdea?.id === idea.id) return (
                    <div key={idea.id} style={{ padding: "12px 0", borderTop: i ? "1px solid var(--border-soft)" : "none" }}>
                      <input style={input} value={editIdea.label} maxLength={120} aria-label={t.addIdea} onChange={(e) => setEditIdea({ ...editIdea, label: e.target.value })} />
                      <input style={{ ...input, marginTop: 8 }} value={editIdea.url} placeholder={t.linkPlaceholder} inputMode="url" aria-label={t.linkPlaceholder} onChange={(e) => setEditIdea({ ...editIdea, url: e.target.value })} />
                      {error && <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 700, marginTop: 8 }}>{error}</div>}
                      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                        <button type="button" onClick={saveIdea} disabled={!editIdea.label.trim()} style={{ ...btn, flex: 1, background: "var(--accent-bg)", color: "var(--on-accent)" }}>{t.save}</button>
                        <button type="button" onClick={() => { setEditIdea(null); setError(null); }} style={{ ...btn, background: "var(--surface-3)", color: "var(--fg-2)" }}>{t.cancel}</button>
                      </div>
                      <button type="button" onClick={() => { setEditIdea(null); remove(idea.id); }} style={{ ...btn, background: "none", color: "var(--danger)", padding: "10px 0 0" }}>{m.assist.qaRemove}</button>
                    </div>
                  );
                  return (
                    <div key={idea.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderTop: i ? "1px solid var(--border-soft)" : "none" }}>
                      <div role={editable ? "button" : undefined} tabIndex={editable ? 0 : undefined} onClick={() => editable && setEditIdea({ id: idea.id, label: idea.label, url: idea.url ?? "" })}
                        onKeyDown={(e) => { if (editable && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setEditIdea({ id: idea.id, label: idea.label, url: idea.url ?? "" }); } }}
                        style={{ flex: 1, minWidth: 0, cursor: editable ? "pointer" : "default" }}>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--fg)" }}>{idea.label}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{nameOf(idea.personId)} · {t.votes(idea.votes.length)}</div>
                        {idea.url && (
                          <a href={idea.url} target="_blank" rel="noopener noreferrer nofollow" onClick={(e) => e.stopPropagation()}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 12.5, fontWeight: 700, color: "var(--accent)", textDecoration: "none", background: "var(--tint-accent)", borderRadius: 50, padding: "3px 10px", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            🔗 {hostOf(idea.url)} ↗
                          </a>
                        )}
                      </div>
                      <button type="button" onClick={() => vote(idea)} aria-pressed={mine} style={{ ...btn, padding: "7px 12px", fontSize: 13, background: mine ? "var(--accent-bg)" : "var(--surface-3)", color: mine ? "var(--on-accent)" : "var(--fg-2)" }}>👍 {idea.votes.length}</button>
                    </div>
                  );
                })}
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); add("IDEA"); }} style={{ ...card, padding: 12, marginTop: 10 }}>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t.addIdea} aria-label={t.addIdea} maxLength={300} style={input} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input value={ideaUrlText} onChange={(e) => setIdeaUrlText(e.target.value)} placeholder={t.linkPlaceholder} aria-label={t.linkPlaceholder} inputMode="url" maxLength={1000} style={{ ...input, flex: 1 }} />
                <button type="submit" disabled={!text.trim() && !ideaUrlText.trim()} style={{ ...btn, background: "var(--accent-bg)", color: "var(--on-accent)", opacity: text.trim() || ideaUrlText.trim() ? 1 : 0.5 }}>{t.add}</button>
              </div>
              {error && !editIdea && <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 700, marginTop: 8 }}>{error}</div>}
            </form>
            {ideas.length > 0 && <p style={{ fontSize: 12, color: "var(--muted)", margin: "8px 4px 0" }}>{t.tapIdeaToEdit}</p>}
          </>
        )}

        {taxi && (
          <div role="dialog" aria-modal="true" aria-label={t.showTaxi} onClick={() => setTaxi(null)}
            style={{ position: "fixed", inset: 0, zIndex: 50, background: "#fff", color: "#111", display: "flex", flexDirection: "column", justifyContent: "center", padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.35, wordBreak: "break-word" }}>{taxi.localAddress}</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 20 }}>{taxi.name}</div>
            {taxi.address && <div style={{ fontSize: 16, marginTop: 8, color: "#444" }}>{taxi.address}</div>}
            {taxi.phone && <div style={{ fontSize: 20, marginTop: 14, fontWeight: 700 }}>📞 {taxi.phone}</div>}
            <button type="button" onClick={() => setTaxi(null)} style={{ ...btn, marginTop: 32, alignSelf: "center", background: "#111", color: "#fff", padding: "12px 28px" }}>{t.close}</button>
          </div>
        )}

        {data.isAdult && (
          <button type="button" onClick={del} style={{ ...btn, background: "none", color: "var(--danger)", marginTop: 32, padding: "10px 0" }}>{t.delete}</button>
        )}
      </main>
    </div>
  );
}
