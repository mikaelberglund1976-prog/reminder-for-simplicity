// Tiny client-side helper for the bottom-nav "something's new" dot (P0.4 in the
// 2026-07-27 order). We don't have a notifications table, so this is deliberately
// lightweight: each list page stamps "I've seen everything up to now" in
// localStorage when it loads, and the nav bar compares that against the newest
// item timestamp it can see. Good enough for a household-sized app; revisit with
// a real per-user "last read" column if this ever needs to be exact.

const PREFIX = "rfs:lastSeen:";

export function markSeen(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, String(Date.now()));
  } catch {
    // localStorage can throw in some privacy modes — badge just won't clear, non-critical.
  }
}

export function getLastSeen(key: string): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(window.localStorage.getItem(PREFIX + key) ?? 0);
  } catch {
    return 0;
  }
}

export function hasNewSince(key: string, latestTimestampMs: number): boolean {
  if (!latestTimestampMs) return false;
  return latestTimestampMs > getLastSeen(key);
}
