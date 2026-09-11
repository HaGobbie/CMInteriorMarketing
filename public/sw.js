const CACHE_NAME = "cm-interiors-shell-v1";
const APP_SHELL = ["./", "./index.html", "./manifest.webmanifest"];

const isSameOrigin = (request) => {
  const requestUrl = new URL(request.url);
  return requestUrl.origin === self.location.origin;
};

const networkFirstNavigation = async (request) => {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
    return response;
  } catch {
    return (
      (await caches.match(request)) ||
      (await caches.match("./index.html")) ||
      Response.error()
    );
  }
};

const staleWhileRevalidate = async (request) => {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || network;
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !isSameOrigin(request)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (
    /\.(?:css|js|png|jpe?g|svg|webp|woff2?)$/i.test(
      new URL(request.url).pathname,
    )
  ) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
