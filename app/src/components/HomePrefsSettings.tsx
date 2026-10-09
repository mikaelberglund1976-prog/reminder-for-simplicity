"use client";

// 2026-10-09: Settings → Home. Pick which sections the start page shows and
// what "Next up per child" includes. Saves on every tap (per person).
import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import { useI18n } from "@/lib/i18n/client";
import { DEFAULT_HOME_PREFS, HOME_SECTIONS, PER_CHILD_COUNTS, PER_CHILD_KINDS, normalizeHomePrefs, type HomePrefs } from "@/lib/homePrefs";

type Child = { id: string; name: string };

export default function HomePrefsSettings() {
  const { m } = useI18n();
  const t = m.homePrefs;
  const [prefs, setPrefs] = useState<HomePrefs | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/profile/home-prefs").then((r) => (r.ok ? r.json() : null)).then((d) => setPrefs(normalizeHomePrefs(d?.prefs))).catch(() => setPrefs(normalizeHomePrefs(null)));
    fetch("/api/household").then((r) => (r.ok ? r.json() : null)).then((d) => {
      const members = (d?.household?.members ?? []) as { userId: string; role?: string; user: { name: string | null; email: string } }[];
      setChildren(members.filter((x) => x.role === "CHILD").map((x) => ({ id: x.userId, name: x.user.name?.split(" ")[0] ?? x.user.email.split("@")[0] })));
    }).catch(() => {});
  }, []);

  function update(next: HomePrefs) {
    setPrefs(next);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await fetch("/api/profile/home-prefs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefs: next }) }).catch(() => null);
      if (res?.ok) { setSaved(true); setTimeout(() => setSaved(false), 1800); }
    }, 350);
  }

  if (!prefs) return <div style={{ fontSize: 13, color: "var(--subtle)" }}>…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>{t.intro}</div>

      <div style={{ border: "1.5px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        {HOME_SECTIONS.map((k, i) => (
          <div key={k}>
            <ToggleRow first={i === 0} label={t.sections[k]} on={prefs.sections[k]}
              onChange={(v) => update({ ...prefs, sections: { ...prefs.sections, [k]: v } })} />
            {k === "perChild" && prefs.sections.perChild && (
              <div style={{ padding: "4px 14px 12px 28px", background: "var(--surface-2)", borderTop: "1px solid var(--border-soft)" }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--subtle)", margin: "8px 0 6px" }}>{t.perChildTitle}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {PER_CHILD_KINDS.map((pk) => (
                    <Chip key={pk} active={prefs.perChild[pk]} onClick={() => update({ ...prefs, perChild: { ...prefs.perChild, [pk]: !prefs.perChild[pk] } })}>{t.kinds[pk]}</Chip>
                  ))}
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--subtle)", margin: "12px 0 6px" }}>{t.countLabel}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {PER_CHILD_COUNTS.map((n) => (
                    <Chip key={n} active={prefs.perChildCount === n} onClick={() => update({ ...prefs, perChildCount: n })}>{n}</Chip>
                  ))}
                </div>
                {children.length > 1 && (<>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--subtle)", margin: "12px 0 6px" }}>{t.childrenLabel}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {children.map((c) => {
                      const shown = !prefs.hiddenChildren.includes(c.id);
                      return (
                        <Chip key={c.id} active={shown} onClick={() => update({ ...prefs, hiddenChildren: shown ? [...prefs.hiddenChildren, c.id] : prefs.hiddenChildren.filter((x) => x !== c.id) })}>
                          <Avatar userId={c.id} name={c.name} size={18} /> {c.name}
                        </Chip>
                      );
                    })}
                  </div>
                </>)}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" onClick={() => update(normalizeHomePrefs(DEFAULT_HOME_PREFS))}
          style={{ background: "none", border: "none", padding: 0, fontSize: 12.5, fontWeight: 700, color: "var(--accent)", cursor: "pointer", fontFamily: "inherit" }}>
          {t.reset}
        </button>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--success)", opacity: saved ? 1 : 0, transition: "opacity .2s" }}>✓ {t.saved}</span>
      </div>
    </div>
  );
}

function ToggleRow({ label, on, onChange, first }: { label: string; on: boolean; onChange: (v: boolean) => void; first?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} style={{
      width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--surface)",
      border: "none", borderTop: first ? "none" : "1px solid var(--border-soft)", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
    }}>
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: on ? "var(--fg)" : "var(--subtle)" }}>{label}</span>
      <span style={{ width: 40, height: 24, borderRadius: 12, background: on ? "var(--accent-bg)" : "var(--surface-3)", position: "relative", flexShrink: 0, transition: "background .15s" }}>
        <span style={{ position: "absolute", top: 3, left: on ? 19 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)", transition: "left .15s" }} />
      </span>
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 50, fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
      border: active ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
      background: active ? "var(--tint-accent)" : "var(--surface)",
      color: active ? "var(--accent-strong)" : "var(--subtle)",
    }}>{children}</button>
  );
}
