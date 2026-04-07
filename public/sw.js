// public/sw.js
const CACHE_NAME = 'leaderboard-cache-v' + Date.now(); // Dynamic version to force updates
const API_CACHE_NAME = 'leaderboard-api-cache-v' + Date.now();

// Don't pre-cache assets - they don't exist until after build and can cause install failures
// Assets will be cached on first request instead

// Install event - skip waiting to activate immediately
self.addEventListener('install', event => {
  console.log('Service worker installing...');
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service worker activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Delete all old caches to prevent corruption
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() - network-first with error handling
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with network-first strategy
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Only cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(API_CACHE_NAME)
              .then(cache => cache.put(request, responseClone))
              .catch(err => console.warn('Failed to cache API response:', err));
          }
          return response;
        })
        .catch(error => {
          console.warn('API fetch failed, trying cache:', error);
          // Fallback to cache if network fails
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // No cache available - return error response
              return new Response(
                JSON.stringify({ error: 'Network unavailable and no cached data' }),
                { 
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
        })
    );
    return;
  }

  // Handle static assets with network-first for HTML, cache-first for others
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    // Network-first for HTML to avoid stale UI
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, responseClone))
              .catch(err => console.warn('Failed to cache HTML:', err));
          }
          return response;
        })
        .catch(error => {
          console.warn('HTML fetch failed, trying cache:', error);
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // No cache - return minimal error page
              return new Response(
                '<html><body><h1>Offline</h1><p>Unable to load page. Please check your connection and try again.</p></body></html>',
                { 
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'text/html' }
                }
              );
            });
        })
    );
  } else {
    // Cache-first for static assets (JS, CSS, images) with network fallback
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Not in cache - fetch from network
          return fetch(request)
            .then(response => {
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(request, responseClone))
                  .catch(err => console.warn('Failed to cache asset:', err));
              }
              return response;
            })
            .catch(error => {
              console.error('Asset fetch failed:', error);
              // Return a basic error response instead of failing silently
              return new Response('', { status: 404, statusText: 'Not Found' });
            });
        })
    );
  }
  // Handle static assets with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request);
      })
  );
});
