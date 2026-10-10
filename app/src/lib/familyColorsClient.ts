"use client";

// 2026-10-10: shared, cached view of the family's colours (GET
// /api/household/colors), same subscribe/notify pattern as familyMedia so
// every avatar and calendar on the page updates the moment a colour is saved.
import { useEffect, useState } from "react";
import { EMPTY_FAMILY_COLORS, normalizeFamilyColors, type FamilyColors } from "@/lib/familyColors";

export type FamilyColorsState = { colors: FamilyColors; canEdit: boolean; isAdult: boolean; pro: boolean; loaded: boolean };

const EMPTY: FamilyColorsState = { colors: EMPTY_FAMILY_COLORS, canEdit: false, isAdult: true, pro: false, loaded: false };
let current: FamilyColorsState | null = null;
let inflight: Promise<FamilyColorsState> | null = null;
let fetchedAt = 0;
const listeners = new Set<(s: FamilyColorsState) => void>();

function publish(s: FamilyColorsState) {
  current = s;
  fetchedAt = Date.now();
  listeners.forEach((l) => l(s));
}

export function loadFamilyColors(force = false): Promise<FamilyColorsState> {
  if (!force && current && Date.now() - fetchedAt < 60_000) return Promise.resolve(current);
  if (!force && inflight) return inflight;
  inflight = fetch("/api/household/colors")
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then((d) => {
      const s: FamilyColorsState = d
        ? { colors: normalizeFamilyColors(d.colors), canEdit: !!d.canEdit, isAdult: d.isAdult !== false, pro: !!d.pro, loaded: true }
        : { ...EMPTY, loaded: true };
      inflight = null;
      publish(s);
      return s;
    });
  return inflight;
}

export function useFamilyColors(): FamilyColorsState {
  const [s, setS] = useState<FamilyColorsState>(current ?? EMPTY);
  useEffect(() => {
    listeners.add(setS);
    loadFamilyColors().then(setS);
    return () => { listeners.delete(setS); };
  }, []);
  return s;
}

/** Optimistic local update (instant everywhere), then save. Throws on failure (caller reloads). */
export async function saveFamilyColorsRemote(colors: FamilyColors): Promise<void> {
  if (current) publish({ ...current, colors });
  const res = await fetch("/api/household/colors", {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ colors }),
  });
  if (!res.ok) { await loadFamilyColors(true); throw new Error("save failed"); }
}
