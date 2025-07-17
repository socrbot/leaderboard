// public/sw.js
const CACHE_NAME = 'leaderboard-cache-v1752716455327'; // Updated version number
const API_CACHE_NAME = 'leaderboard-api-cache-v1752716455327'; // Updated version number
const STATIC_CACHE_TIME = 24 * 60 * 60 * 1000; // 24 hours
const API_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

// Cache static assets
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with network-first strategy
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone response before caching
          const responseClone = response.clone();
          
          if (response.ok) {
            caches.open(API_CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request);
        })
    );
    return;
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
