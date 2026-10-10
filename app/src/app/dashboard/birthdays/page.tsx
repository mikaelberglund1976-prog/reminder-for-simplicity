"use client";

// 2026-10-10: Birthdays (PRODUCT_SPEC 4b.33) — free for everyone.
// Family: one row per member ("Add Elsa's birthday"). Below: relatives,
// friends and pets (Mikael: "födelsedagar kan ju vara kompisar, husdjur").
// Everything here is a BIRTHDAY reminder underneath, so it shows up in the
// calendar, the ICS feed, on Home and in the reminder emails/pushes.
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import HamburgerMenu from "@/components/HamburgerMenu";
import Avatar from "@/components/Avatar";
import { useI18n, useM } from "@/lib/i18n/client";
import { ageOn, daysInMonth, KIND_EMOJI, type BirthdayKind } from "@/lib/birthdayLabel";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcBack() { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6"/></svg>; }

type Member = { userId: string; role: string; name: string };
type Birthday = {
  id: string; name: string; month: number; day: number; birthYear: number | null;
  personId: string | null; kind: BirthdayKind; forPerson: string | null;
  daysBefore: number; nextDate: string; legacy: boolean; canEdit: boolean;
};
type Data = { canEdit: boolean; me: string; hasHousehold: boolean; members: Member[]; birthdays: Birthday[] };

type Draft = { id: string | null; personId: string | null; name: string; kind: BirthdayKind; forPerson: string; day: number; month: number; year: string; daysBefore: number };
const OTHER_KINDS: BirthdayKind[] = ["RELATIVE", "FRIEND", "PET", "OTHER"];
const REMIND = [0, 1, 3, 7, 14];

function daysUntil(iso: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(iso); const target = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export default function BirthdaysPage() {
  const { status } = useSession();
  const router = useRouter();
  const { m: msg, dateLocale } = useI18n();
  const t = msg.birthdays;
  const [data, setData] = useState<Data | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  useEffect(() => { if (status === "authenticated") load(); }, [status]);

  async function load() {
    const res = await fetch("/api/family/birthdays");
    if (res.ok) setData(await res.json());
  }

  const monthName = (mo: number) => new Date(2024, mo - 1, 1).toLocaleDateString(dateLocale, { month: "long" });
  const dayMonth = (b: { day: number; month: number }) => new Date(2024, b.month - 1, b.day).toLocaleDateString(dateLocale, { day: "numeric", month: "long" });
  function when(b: Birthday) {
    const n = daysUntil(b.nextDate);
    const rel = n === 0 ? t.today : n === 1 ? t.tomorrow : t.inDays(n);
    const age = ageOn(b.birthYear, new Date(b.nextDate));
    return `${dayMonth(b)}${age ? ` · ${t.turnsShort(age)}` : ""} · ${rel}`;
  }

  function startNew(personId: string | null, name = "") {
    setError(null);
    // A child adding a friend: it's for them by default (parents see it too).
    const child = !!data && !data.canEdit;
    setDraft({ id: null, personId, name, kind: personId ? "FAMILY" : child ? "FRIEND" : "RELATIVE", forPerson: child ? data?.me ?? "" : "", day: 1, month: new Date().getMonth() + 1, year: "", daysBefore: 7 });
  }
  function startEdit(b: Birthday) {
    setError(null);
    setDraft({ id: b.id, personId: b.personId, name: b.name, kind: b.kind, forPerson: b.forPerson ?? "", day: b.day, month: b.month, year: b.birthYear ? String(b.birthYear) : "", daysBefore: b.daysBefore });
  }

  async function save() {
    if (!draft) return;
    setSaving(true); setError(null);
    try {
      const body = { name: draft.name, personId: draft.personId, kind: draft.kind, forPerson: draft.forPerson || null, day: draft.day, month: draft.month, year: draft.year ? Number(draft.year) : null, daysBefore: draft.daysBefore };
      const res = await fetch(draft.id ? `/api/family/birthdays/${draft.id}` : "/api/family/birthdays", {
        method: draft.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setError(e.error === "invalidDate" ? t.invalidDate : e.error === "nameRequired" ? t.nameRequired : t.saveFailed);
        return;
      }
      setDraft(null);
      await load();
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    setSaving(true);
    try {
      await fetch(`/api/family/birthdays/${id}`, { method: "DELETE" });
      setDraft(null);
      await load();
    } finally { setSaving(false); }
  }

  if (status === "loading" || !data) {
    return <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}><div style={{ color: "var(--muted)", fontSize: 15 }}>{t.loading}</div></div>;
  }

  const byPerson = new Map(data.birthdays.filter((b) => b.personId).map((b) => [b.personId!, b]));
  const memberName = new Map(data.members.map((m) => [m.userId, m.name]));
  const others = data.birthdays.filter((b) => !b.personId);
  const isChildView = !data.canEdit;

  const card = { background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", overflow: "hidden" as const, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" };
  const sectionTitle = { fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em", margin: "0 2px 10px" };
  const input = { width: "100%", boxSizing: "border-box" as const, padding: "11px 12px", borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--fg)", fontSize: 14, fontFamily: FONT };
  const label = { display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted)", margin: "12px 0 6px" };

  function Form() {
    if (!draft) return null;
    const d = draft;
    const set = (patch: Partial<Draft>) => setDraft({ ...d, ...patch });
    const maxDay = daysInMonth(d.month);
    return (
      <div style={{ ...card, padding: 16, marginTop: 10, overflow: "visible" }}>
        {!d.personId && (
          <>
            <span style={{ ...label, marginTop: 0 }}>{t.kind}</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {OTHER_KINDS.map((k) => (
                <button key={k} type="button" onClick={() => set({ kind: k })} aria-pressed={d.kind === k}
                  style={{ padding: "8px 12px", borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
                    border: d.kind === k ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                    background: d.kind === k ? "var(--tint-accent)" : "var(--surface)", color: d.kind === k ? "var(--accent-strong)" : "var(--fg-2)" }}>
                  {KIND_EMOJI[k]} {t.kinds[k]}
                </button>
              ))}
            </div>
            <label style={label} htmlFor="bd-name">{t.name}</label>
            <input id="bd-name" style={input} value={d.name} maxLength={80} onChange={(e) => set({ name: e.target.value })}
              placeholder={d.kind === "PET" ? t.petPlaceholder : d.kind === "FRIEND" ? t.friendPlaceholder : t.namePlaceholder} />
          </>
        )}
        {/* 2026-10-10 (Mikael): for the whole family or just one person. */}
        {data!.members.length > 1 && (
          <>
            <label style={label} htmlFor="bd-for">{t.forPerson}</label>
            <select id="bd-for" style={input} value={d.forPerson} onChange={(e) => set({ forPerson: e.target.value })}>
              <option value="">{t.forEveryone}</option>
              {data!.members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
            </select>
            <div style={{ fontSize: 12, color: "var(--subtle)", marginTop: 6 }}>{t.forHelp}</div>
          </>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1.2fr", gap: 8 }}>
          <div>
            <label style={label} htmlFor="bd-day">{t.day}</label>
            <select id="bd-day" style={input} value={Math.min(d.day, maxDay)} onChange={(e) => set({ day: Number(e.target.value) })}>
              {Array.from({ length: maxDay }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label style={label} htmlFor="bd-month">{t.month}</label>
            <select id="bd-month" style={input} value={d.month} onChange={(e) => { const mo = Number(e.target.value); set({ month: mo, day: Math.min(d.day, daysInMonth(mo)) }); }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{monthName(n)}</option>)}
            </select>
          </div>
          <div>
            <label style={label} htmlFor="bd-year">{t.yearOptional}</label>
            <input id="bd-year" style={input} inputMode="numeric" maxLength={4} value={d.year} placeholder="—"
              onChange={(e) => set({ year: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--subtle)", marginTop: 6 }}>{t.yearHelp}</div>
        <label style={label} htmlFor="bd-remind">{t.remind}</label>
        <select id="bd-remind" style={input} value={d.daysBefore} onChange={(e) => set({ daysBefore: Number(e.target.value) })}>
          {REMIND.map((n) => <option key={n} value={n}>{t.remindOptions[n]}</option>)}
        </select>
        {error && <div role="alert" style={{ color: "var(--danger)", fontSize: 13, fontWeight: 600, marginTop: 10 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <button type="button" onClick={save} disabled={saving}
            style={{ flex: 1, minWidth: 120, padding: "12px 16px", borderRadius: 50, border: "none", background: "var(--accent)", color: "var(--on-accent)", fontWeight: 800, fontSize: 14, cursor: saving ? "wait" : "pointer", fontFamily: FONT }}>
            {t.save}
          </button>
          <button type="button" onClick={() => setDraft(null)}
            style={{ padding: "12px 16px", borderRadius: 50, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--fg-2)", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: FONT }}>
            {t.cancel}
          </button>
          {d.id && (
            <button type="button" onClick={() => remove(d.id!)} disabled={saving}
              style={{ padding: "12px 16px", borderRadius: 50, border: "none", background: "var(--tint-danger)", color: "var(--danger)", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: FONT }}>
              {t.remove}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT }}>
      <Header onBack={() => router.push("/dashboard")} />
      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "20px 20px 40px" }}>
        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, margin: "0 0 20px" }}>
          {data.hasHousehold ? t.intro : t.noHousehold}
        </p>

        {data.members.length > 0 && (
          <section style={{ marginBottom: 26 }}>
            <h2 style={sectionTitle}>{t.family}</h2>
            <div style={card}>
              {data.members.map((mem, i) => {
                const b = byPerson.get(mem.userId);
                const editingThis = draft && draft.personId === mem.userId;
                return (
                  <div key={mem.userId} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-soft)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
                      <Avatar userId={mem.userId} name={mem.name} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)" }}>{mem.name}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                          {b ? when(b) : "—"}{b?.forPerson && memberName.get(b.forPerson) ? ` · ${t.onlyFor(memberName.get(b.forPerson)!)}` : ""}
                        </div>
                      </div>
                      {b && mem.role === "CHILD" && (
                        <Link href="/dashboard/wishlist" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent)", textDecoration: "none", whiteSpace: "nowrap" }}>{t.wishlist}</Link>
                      )}
                      {data.canEdit && !editingThis && (
                        b ? (b.canEdit && <button type="button" onClick={() => startEdit(b)} style={linkBtn}>{t.edit}</button>)
                          : <button type="button" onClick={() => startNew(mem.userId, mem.name)} style={linkBtn} aria-label={t.addFor(mem.name)}>+ 🎂</button>
                      )}
                    </div>
                    {editingThis && <div style={{ padding: "0 12px 12px" }}>{Form()}</div>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h2 style={sectionTitle}>{t.others}</h2>
          {others.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--subtle)", padding: "4px 2px 12px" }}>{t.noOthers}</div>
          ) : (
            <div style={card}>
              {others.map((b, i) => {
                const editingThis = draft?.id === b.id;
                const forName = b.forPerson ? memberName.get(b.forPerson) : null;
                const chip = b.legacy ? null : b.kind === "FRIEND" && forName ? t.friendOfShort(forName)
                  : [b.kind !== "OTHER" ? t.kinds[b.kind] : null, forName ? t.onlyFor(forName) : null].filter(Boolean).join(" · ") || null;
                return (
                  <div key={b.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-soft)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
                      <div style={{ width: 36, height: 36, borderRadius: 12, background: "var(--tint-pink)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }} aria-hidden>
                        {KIND_EMOJI[b.kind] ?? "🎂"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)" }}>{b.name}</span>
                          {chip && (
                            <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 50, background: "var(--surface-3)", color: "var(--fg-2)" }}>
                              {chip}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{when(b)}</div>
                      </div>
                      {b.canEdit && !editingThis && <button type="button" onClick={() => startEdit(b)} style={linkBtn}>{t.edit}</button>}
                    </div>
                    {editingThis && <div style={{ padding: "0 12px 12px" }}>{Form()}</div>}
                  </div>
                );
              })}
            </div>
          )}

          {draft && !draft.id && !draft.personId ? Form() : (
            <button type="button" onClick={() => startNew(null)}
              style={{ width: "100%", marginTop: 12, padding: "14px 16px", borderRadius: 14, border: "1.5px dashed var(--border)", background: "var(--surface)", color: "var(--accent-strong)", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
              {t.addOther}
            </button>
          )}
          {isChildView && <p style={{ fontSize: 12, color: "var(--subtle)", marginTop: 12 }}>{t.readOnly}</p>}
        </section>
      </main>
    </div>
  );
}

const linkBtn = { background: "none", border: "none", color: "var(--accent)", fontWeight: 700, fontSize: 13, cursor: "pointer", padding: "6px 4px", fontFamily: FONT, whiteSpace: "nowrap" as const };

function Header({ onBack }: { onBack: () => void }) {
  const m = useM();
  return (
    <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} aria-label={m.common.back} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-2)", display: "flex", padding: 4 }}>
          <IcBack />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)", margin: 0, flex: 1 }}>🎂 {m.birthdays.title}</h1>
        <HamburgerMenu />
      </div>
    </div>
  );
}
