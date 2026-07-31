/* Anesthculator service worker — v0.72.0
 * Cache-first app shell for fast offline opening, with background refresh.
 * The release-specific cache name forces old v0.63.x shells to be removed.
 */
const VERSION = 'v0720-r1';
const CACHE = `anesthculator-${VERSION}`;
const SHELL = [
  './',
  './index.html',
  './style.css?v=0720',
  './clinical-reasoning.js?v=0720',
  './engines/clinical-engine.js?v=0720',
  './engines/question-engine.js?v=0720',
  './engines/response-engine.js?v=0720',
  './engines/algorithm-router.js?v=0720',
  './engines/mentor-engine.js?v=0720',
  './app.js?v=0720',
  './manifest.json?v=0720',
  './cloud.js?v=0720'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // Navigation uses network first so a deployed release becomes visible immediately.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            caches.open(CACHE).then(cache => cache.put('./index.html', response.clone()));
          }
          return response;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            caches.open(CACHE).then(cache => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
