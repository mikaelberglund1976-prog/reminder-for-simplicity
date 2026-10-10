"use client";

// 2026-10-10 (Mikael: "Här skulle man själv kunna förändra färgerna som pro
// medlem. Barn ett blå, barn 2 gul, prov röd osv."): Settings → Colours.
// One colour per person (avatar + calendar when colouring by person) and per
// kind (calendar + Home badges). Shared by the whole family; an adult in a
// Pro/trial family edits, everyone else sees the result. Saves on every tap.
import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import UpgradeGate from "@/components/UpgradeGate";
import { useI18n } from "@/lib/i18n/client";
import {
  COLOR_KINDS, DEFAULT_KIND_COLORS, SWATCHES, EMPTY_FAMILY_COLORS,
  defaultPersonColor, isHex, kindColor, personColor, type ColorKind, type FamilyColors,
} from "@/lib/familyColors";
import { loadFamilyColors, saveFamilyColorsRemote, useFamilyColors } from "@/lib/familyColorsClient";

type Member = { id: string; name: string; role: string };

const KIND_EMOJI: Record<ColorKind, string> = { reminder: "🔔", chore: "🧹", training: "🎯", homework: "📝", test: "🧪" };

export default function FamilyColorsSettings() {
  const { m } = useI18n();
  const t = m.familyColors;
  const fam = useFamilyColors();
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState<string | null>(null); // "p:<id>" | "k:<kind>"
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/household").then((r) => (r.ok ? r.json() : null)).then((d) => {
      const list = (d?.household?.members ?? []) as { userId: string; role?: string; user: { name: string | null; email: string } }[];
      const out = list.map((x) => ({ id: x.userId, role: x.role ?? "MEMBER", name: x.user.name?.split(" ")[0] ?? x.user.email.split("@")[0] }));
      out.sort((a, b) => (a.role === "CHILD" ? 0 : 1) - (b.role === "CHILD" ? 0 : 1));
      setMembers(out);
    }).catch(() => {});
  }, []);

  const c = fam.colors;

  async function update(next: FamilyColors) {
    setSaved(false);
    try {
      await saveFamilyColorsRemote(next);
      setSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 1800);
    } catch { /* helper reloaded the real state */ }
  }

  function setPerson(id: string, color: string | null) {
    const members = { ...c.members };
    if (color && color.toUpperCase() !== defaultPersonColor(id).toUpperCase()) members[id] = color.toUpperCase(); else delete members[id];
    update({ ...c, members });
  }
  function setKind(kind: ColorKind, color: string | null) {
    const kinds = { ...c.kinds };
    // Reminders: "default" means per-category colours, so any explicit pick is kept.
    if (color && (kind === "reminder" || color.toUpperCase() !== DEFAULT_KIND_COLORS[kind].toUpperCase())) kinds[kind] = color.toUpperCase(); else delete kinds[kind];
    update({ ...c, kinds });
  }

  if (!fam.loaded) return <div style={{ fontSize: 13, color: "var(--subtle)" }}>…</div>;

  if (!fam.canEdit) {
    if (!fam.isAdult) return <div style={{ fontSize: 13, color: "var(--muted)" }}>{t.onlyAdults}</div>;
    return <UpgradeGate compact feature={t.featureName} description={t.featureDescription} emoji="🎨" onUnlocked={() => loadFamilyColors(true)} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>{t.intro}</div>

      {/* Calendar: colour by kind or by person */}
      <div>
        <Label>{t.calendarByTitle}</Label>
        <div role="radiogroup" style={{ display: "inline-flex", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 50, padding: 3 }}>
          {(["kind", "person"] as const).map((by) => {
            const on = c.calendarBy === by;
            return (
              <button key={by} type="button" role="radio" aria-checked={on} onClick={() => on || update({ ...c, calendarBy: by })} style={{
                border: "none", borderRadius: 50, padding: "6px 14px", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
                background: on ? "var(--surface)" : "transparent", color: on ? "var(--fg)" : "var(--subtle)",
                boxShadow: on ? "0 1px 2px rgba(0,0,0,.08)" : "none",
              }}>{by === "kind" ? t.byKind : t.byPerson}</button>
            );
          })}
        </div>
        {c.calendarBy === "person" && <div style={{ fontSize: 11.5, color: "var(--subtle)", marginTop: 6 }}>{t.byPersonHint}</div>}
      </div>

      {members.length > 0 && (
        <div>
          <Label>{t.peopleTitle}</Label>
          <List>
            {members.map((p, i) => {
              const key = `p:${p.id}`;
              const color = personColor(c, p.id);
              return (
                <Row key={key} first={i === 0} open={open === key} onToggle={() => setOpen(open === key ? null : key)}
                  icon={<Avatar userId={p.id} name={p.name} size={26} />} label={p.name} color={color} chooseLabel={t.choose(p.name)}>
                  <Picker value={color} isDefault={!c.members[p.id]} customLabel={t.custom} defaultLabel={t.defaultColor}
                    onPick={(v) => setPerson(p.id, v)} onDefault={() => setPerson(p.id, null)} />
                </Row>
              );
            })}
          </List>
        </div>
      )}

      <div>
        <Label>{t.kindsTitle}</Label>
        <List>
          {COLOR_KINDS.map((k, i) => {
            const key = `k:${k}`;
            const isDefault = !c.kinds[k];
            const color = kindColor(c, k);
            return (
              <Row key={key} first={i === 0} open={open === key} onToggle={() => setOpen(open === key ? null : key)}
                icon={<span style={{ width: 26, height: 26, borderRadius: 8, background: `${color}1F`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{KIND_EMOJI[k]}</span>}
                label={t.kinds[k]} color={k === "reminder" && isDefault ? null : color} chooseLabel={t.choose(t.kinds[k])}
                hint={k === "reminder" && isDefault ? t.reminderHint : undefined}>
                <Picker value={color} isDefault={isDefault} customLabel={t.custom} defaultLabel={t.defaultColor}
                  onPick={(v) => setKind(k, v)} onDefault={() => setKind(k, null)} />
              </Row>
            );
          })}
        </List>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" onClick={() => { setOpen(null); update({ ...EMPTY_FAMILY_COLORS, calendarBy: c.calendarBy }); }}
          style={{ background: "none", border: "none", padding: 0, fontSize: 12.5, fontWeight: 700, color: "var(--accent)", cursor: "pointer", fontFamily: "inherit" }}>
          {t.reset}
        </button>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--success)", opacity: saved ? 1 : 0, transition: "opacity .2s" }}>✓ {t.saved}</span>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>{children}</div>;
}

function List({ children }: { children: React.ReactNode }) {
  return <div style={{ border: "1.5px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>{children}</div>;
}

function Row({ first, open, onToggle, icon, label, color, hint, chooseLabel, children }: {
  first: boolean; open: boolean; onToggle: () => void; icon: React.ReactNode; label: string;
  color: string | null; hint?: string; chooseLabel: string; children: React.ReactNode;
}) {
  return (
    <div style={{ borderTop: first ? "none" : "1px solid var(--border-soft)" }}>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-label={chooseLabel} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--surface)",
        border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
      }}>
        {icon}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--fg)" }}>{label}</span>
          {hint && <span style={{ display: "block", fontSize: 11.5, color: "var(--subtle)", marginTop: 1 }}>{hint}</span>}
        </span>
        {color
          ? <span style={{ width: 26, height: 26, borderRadius: "50%", background: color, boxShadow: "inset 0 0 0 2px rgba(255,255,255,.35)", flexShrink: 0 }} />
          : <span style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: "conic-gradient(#3A4FC5 0 25%, #C4367A 0 50%, #1E7D52 0 75%, #C06010 0)" }} />}
      </button>
      {open && <div style={{ padding: "4px 14px 14px", background: "var(--surface-2)", borderTop: "1px solid var(--border-soft)" }}>{children}</div>}
    </div>
  );
}

function Picker({ value, isDefault, customLabel, defaultLabel, onPick, onDefault }: {
  value: string; isDefault: boolean; customLabel: string; defaultLabel: string;
  onPick: (v: string) => void; onDefault: () => void;
}) {
  const [custom, setCustom] = useState(value);
  useEffect(() => setCustom(value), [value]);
  // The native colour wheel fires onChange continuously while dragging — save once it settles.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onCustom(v: string) {
    setCustom(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { if (isHex(v) && v.toUpperCase() !== value.toUpperCase()) onPick(v); }, 450);
  }
  const isSwatch = SWATCHES.some((s) => s.toUpperCase() === value.toUpperCase());
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginTop: 10, maxWidth: 320 }}>
        {SWATCHES.map((s) => {
          const on = !isDefault && s.toUpperCase() === value.toUpperCase();
          return (
            <button key={s} type="button" onClick={() => onPick(s)} aria-label={s} aria-pressed={on} style={{
              width: "100%", aspectRatio: "1", borderRadius: "50%", background: s, cursor: "pointer", padding: 0,
              border: "none", boxShadow: on ? `0 0 0 2px var(--surface-2), 0 0 0 4px ${s}` : "none",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 900,
            }}>{on ? "✓" : ""}</button>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, color: "var(--fg-2)", cursor: "pointer" }}>
          <span style={{ position: "relative", width: 26, height: 26, borderRadius: "50%", overflow: "hidden", background: custom,
            boxShadow: !isDefault && !isSwatch ? `0 0 0 2px var(--surface-2), 0 0 0 4px ${custom}` : "inset 0 0 0 1.5px var(--border)" }}>
            <input type="color" value={custom} onChange={(e) => onCustom(e.target.value)}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", border: "none", padding: 0 }} />
          </span>
          {customLabel}
        </label>
        {!isDefault && (
          <button type="button" onClick={onDefault} style={{ background: "none", border: "none", padding: 0, fontSize: 12.5, fontWeight: 700, color: "var(--accent)", cursor: "pointer", fontFamily: "inherit" }}>
            ↺ {defaultLabel}
          </button>
        )}
      </div>
    </div>
  );
}
