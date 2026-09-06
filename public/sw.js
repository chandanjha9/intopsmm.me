// Intopsmm Service Worker for PWA WebAPK
const CACHE_NAME = "intopsmm-pwa-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass through fetch handler to meet PWA installability criteria
  // Allows network-first operations so real-time panel data is always fresh
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
