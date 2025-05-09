const CACHE_NAME = 'csv-editor-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Define MIME types for different file extensions
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.ts': 'application/javascript',
  '.tsx': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
  '.pdf': 'application/pdf',
  '.csv': 'text/csv'
};

// Critical assets that should be cached immediately
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/index.css',
  '/assets/main.js',
  '/firefighters.csv'  // Add CSV file to critical assets
];

// Static assets that can be cached on demand
const STATIC_ASSETS = [
  '/vite.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install event - cache critical assets
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      // Cache critical assets immediately
      caches.open(STATIC_CACHE).then(cache => {
        console.log('Caching critical assets...');
        return cache.addAll(CRITICAL_ASSETS);
      }),
      // Cache static assets in the background
      caches.open(DYNAMIC_CACHE).then(cache => {
        console.log('Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
    ])
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim clients to ensure the new service worker takes control
      clients.claim()
    ])
  );
});

// Fetch event - handle requests
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const extension = url.pathname.split('.').pop();
  const mimeType = MIME_TYPES['.' + extension] || 'text/plain';

  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html')
        .then(response => response || fetch(event.request))
    );
    return;
  }

  // Handle CSV file requests
  if (url.pathname.endsWith('.csv')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            // Return cached CSV with correct MIME type
            return new Response(response.body, {
              headers: {
                'Content-Type': 'text/csv',
                ...response.headers
              }
            });
          }
          // If not in cache, fetch from network
          return fetch(event.request)
            .then(networkResponse => {
              if (!networkResponse || networkResponse.status !== 200) {
                throw new Error('Network response was not ok');
              }
              // Cache the CSV file
              const responseToCache = networkResponse.clone();
              caches.open(STATIC_CACHE)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
              return new Response(networkResponse.body, {
                headers: {
                  'Content-Type': 'text/csv',
                  ...networkResponse.headers
                }
              });
            })
            .catch(error => {
              console.error('Fetch failed:', error);
              throw error;
            });
        })
    );
    return;
  }

  // Handle other requests
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // Return cached response with correct MIME type
          return new Response(response.body, {
            headers: {
              'Content-Type': mimeType,
              ...response.headers
            }
          });
        }

        // Fetch from network
        return fetch(event.request)
          .then(networkResponse => {
            // Clone the response before caching
            const responseToCache = networkResponse.clone();

            // Cache the response
            caches.open(DYNAMIC_CACHE)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            // Return response with correct MIME type
            return new Response(networkResponse.body, {
              headers: {
                'Content-Type': mimeType,
                ...networkResponse.headers
              }
            });
          })
          .catch(error => {
            console.error('Fetch failed:', error);
            throw error;
          });
      })
  );
}); 