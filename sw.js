/*
 * Service Worker «Свой Маркет» — v4.
 * Стратегия: сеть в приоритете (онлайн — всегда свежие файлы),
 * кэш — запасной вариант для офлайна. Старые версии кэша удаляются.
 */
const CACHE_NAME = "svoi-market-pwa-v6";

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true })
      || await cache.match(new URL("index.html", self.registration.scope).href);
    return cached || Response.error();
  }
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([
      new URL("index.html", self.registration.scope).href,
      new URL("manifest.webmanifest", self.registration.scope).href
    ]);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter(name => name.startsWith("svoi-market-pwa-") && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(networkFirst(request));
});

// Позволяет странице принудительно проверять обновления.
self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
