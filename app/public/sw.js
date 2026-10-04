// Reminder for Simplicity – service worker (v2, 2026-10-04)
//
// What it does:
//  - Pages (HTML): always fetched from the network, NEVER cached. That keeps
//    family data out of the phone's cache (shared devices, after logout) and
//    means a new deploy shows up immediately. With no connection we show
//    /offline.html instead of the browser's error page.
//  - /_next/static/* (hashed JS/CSS, never changes): cache-first → fast starts.
//  - Icons + manifest: served from cache, refreshed in the background.
//  - /api/* and everything else: straight to the network.
// Bump CACHE when this file changes; old caches (incl. v1, which cached pages)
// are deleted on activate.

const CACHE = "rfs-v2";
const PRECACHE = [
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Page navigations: network only, offline page as fallback.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }

  // Hashed build assets: cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(req).then((hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
      )
    );
    return;
  }

  // Icons + manifest: stale-while-revalidate.
  if (url.pathname.startsWith("/icons/") || url.pathname === "/manifest.json") {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(req).then((hit) => {
          const net = fetch(req)
            .then((res) => { if (res.ok) c.put(req, res.clone()); return res; })
            .catch(() => hit);
          return hit || net;
        })
      )
    );
  }
});
