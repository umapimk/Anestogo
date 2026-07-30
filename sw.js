/* Anesthculator service worker — v0.63.2
 *
 * v0.60 and earlier used a network-first strategy. In an operating theatre
 * that is the worst case: a weak-but-alive WiFi signal makes every request
 * wait for a TCP timeout before falling back to cache, so the app feels
 * slower on bad WiFi than with no WiFi at all.
 *
 * v0.63.2 serves the app shell from cache immediately and refreshes it in the
 * background (stale-while-revalidate), so the crisis screens open instantly
 * regardless of connectivity. The cache name now carries the app version, so
 * a new release always evicts the previous shell.
 */
const VERSION = 'v0632-r1';
const CACHE = `anesthculator-${VERSION}`;
const SHELL = ['./', './index.html', './style.css', './app.js', './manifest.json', './cloud.js'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Cloud/API traffic must never be served stale — it is shared library data.
  // Try the network, and fall back to cache only if the device is offline.
  if (url.origin !== self.location.origin) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // App shell and same-origin assets: cache first, revalidate in background.
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
