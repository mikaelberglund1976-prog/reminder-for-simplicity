"use client";

// 2026-09-28: one shared, short-lived cache of GET /api/profile for the
// components that only need "who am I" (role-aware menus, bottom nav, the
// home screen) — so three components on one page don't make three calls.
import { useEffect, useState } from "react";

export type Me = {
  id: string;
  name: string | null;
  email: string;
  isChildProfile?: boolean;
  bottomNavTabs?: string | null;
  preferredCurrency?: string | null;
  /** 2026-10-04: the family's language (null = not chosen). */
  language?: string | null;
};

const TTL_MS = 30_000;
let cached: { at: number; promise: Promise<Me | null> } | null = null;

export function getMe(force = false): Promise<Me | null> {
  if (!force && cached && Date.now() - cached.at < TTL_MS) return cached.promise;
  const promise = fetch("/api/profile")
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  cached = { at: Date.now(), promise };
  return promise;
}

export function invalidateMe() {
  cached = null;
}

/** undefined while loading, null when logged out / failed. */
export function useMe(): Me | null | undefined {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    getMe().then((m) => { if (alive) setMe(m); });
    return () => { alive = false; };
  }, []);
  return me;
}
