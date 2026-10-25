"use client";

// 2026-10-24: tiny product analytics — the first events (the new More sheet).
// Fire-and-forget: never blocks a tap, never throws, and a failure is silent.
// Stored by POST /api/events without user id (lib/analyticsStore.ts).
export type AnalyticsEvent =
  | "more_opened"
  | "more_search_used"
  | "more_quick_action_clicked"
  | "more_feature_clicked";

export function track(event: AnalyticsEvent, props: Record<string, string | number | boolean | null> = {}): void {
  try {
    const body = JSON.stringify({ event, props });
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      // sendBeacon survives the page navigation a tap in More starts.
      if (navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }))) return;
    }
    fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch {
    /* analytics must never break the app */
  }
}
