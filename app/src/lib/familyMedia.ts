"use client";

// 2026-09-28 (row 40): shared, cached view of which family photos exist
// (GET /api/media). Components re-render when a photo is uploaded anywhere
// on the page, via a tiny subscribe/notify.
import { useEffect, useState } from "react";

export type FamilyMedia = {
  header: number | null;
  avatars: Record<string, number>;
  canEditHeader: boolean;
  canEditAvatarFor: string[];
};

const EMPTY: FamilyMedia = { header: null, avatars: {}, canEditHeader: false, canEditAvatarFor: [] };
let current: FamilyMedia | null = null;
let inflight: Promise<FamilyMedia> | null = null;
let fetchedAt = 0;
const listeners = new Set<(m: FamilyMedia) => void>();

export function loadFamilyMedia(force = false): Promise<FamilyMedia> {
  if (!force && current && Date.now() - fetchedAt < 60_000) return Promise.resolve(current);
  if (!force && inflight) return inflight;
  inflight = fetch("/api/media")
    .then((r) => (r.ok ? r.json() : EMPTY))
    .catch(() => EMPTY)
    .then((m: FamilyMedia) => {
      current = { ...EMPTY, ...m };
      fetchedAt = Date.now();
      inflight = null;
      listeners.forEach((l) => l(current!));
      return current;
    });
  return inflight;
}

export function useFamilyMedia(): FamilyMedia {
  const [m, setM] = useState<FamilyMedia>(current ?? EMPTY);
  useEffect(() => {
    listeners.add(setM);
    loadFamilyMedia().then(setM);
    return () => { listeners.delete(setM); };
  }, []);
  return m;
}

export function avatarUrl(userId: string, version: number) {
  return `/api/media/avatar/${encodeURIComponent(userId)}?v=${version}`;
}

export function headerUrl(version: number) {
  return `/api/media/header?v=${version}`;
}

export async function uploadAvatar(userId: string, dataUrl: string) {
  const res = await fetch(`/api/media/avatar/${encodeURIComponent(userId)}`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error ?? "Upload failed");
  await loadFamilyMedia(true);
}

export async function removeAvatar(userId: string) {
  await fetch(`/api/media/avatar/${encodeURIComponent(userId)}`, { method: "DELETE" });
  await loadFamilyMedia(true);
}

export async function uploadHeader(dataUrl: string) {
  const res = await fetch(`/api/media/header`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error ?? "Upload failed");
  await loadFamilyMedia(true);
}

export async function removeHeader() {
  await fetch(`/api/media/header`, { method: "DELETE" });
  await loadFamilyMedia(true);
}
