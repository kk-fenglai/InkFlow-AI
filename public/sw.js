// Minimal service worker for InkFlow AI PWA installability + offline fallback.
// Intentionally conservative: it does not cache API/auth responses, only the
// app shell and static icons, so dynamic pages always hit the network.

const CACHE = "inkflow-shell-v1";
const SHELL = ["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle same-origin GET navigations/assets. Let everything else
  // (POST, API, cross-origin, auth) pass straight through to the network.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    // Network-first for pages; fall back to cached shell when offline.
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((r) => r || caches.match("/")))
    );
    return;
  }

  // Cache-first for static icon assets only.
  if (request.url.includes("/icons/")) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});
