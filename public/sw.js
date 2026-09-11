const OLD_CACHE_NAMES = ["cm-interiors-shell-v1", "cm-interiors-shell-v2"];

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all(
      OLD_CACHE_NAMES.map((cacheName) => caches.delete(cacheName)),
    ).then(() => self.clients.claim()),
  );
});
