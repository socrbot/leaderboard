// public/sw.js
const CACHE_NAME = 'leaderboard-cache-v' + Date.now();
const API_CACHE_NAME = 'leaderboard-api-cache-v' + Date.now();

self.addEventListener('install', event => {
  console.log('Service worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service worker activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      ))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests: only cache GET requests; let all other methods pass through unmodified
  if (url.pathname.includes('/api/')) {
    if (request.method !== 'GET') {
      // POST/PUT/DELETE with auth headers must go straight to the network
      return;
    }
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached ||
          new Response(JSON.stringify({ error: 'Network unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          })
        ))
    );
    return;
  }

  // HTML navigation: network-first, fall back to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok && request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached ||
          new Response('<html><body><h1>Offline</h1><p>Please check your connection.</p></body></html>', {
            status: 503,
            headers: { 'Content-Type': 'text/html' }
          })
        ))
    );
    return;
  }

  // Static assets: cache-first, fall back to network
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok && request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        });
      })
      .catch(() => new Response('', { status: 404, statusText: 'Not Found' }))
  );
});

self.addEventListener('notificationclick', event => {
  event.notification?.close();
  const payload = event.notification?.data || {};

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList && clientList.length > 0) {
        const client = clientList[0];
        client.postMessage({ type: 'notification_click', payload });
        return client.focus();
      }
      return self.clients.openWindow('/');
    })
  );
});
