const CACHE_NAME = 'csv-editor-v3';
const STATIC_CACHE = 'static-v3';
const DYNAMIC_CACHE = 'dynamic-v3';

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
  '.csv': 'text/csv',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

// Critical assets that should be cached immediately
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/index.css',
  '/assets/main.js',
  '/assets/main-*.js',
  '/src/components/MainTable.tsx',
  '/src/components/MainTable.css',
  '/src/data/defaultData.ts',
  '/CTR_Fillable.pdf',
  '/CTR_Template.xlsx'
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
        return cache.addAll(CRITICAL_ASSETS.filter(asset => !asset.includes('*')));
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

// Helper function to match request against a pattern with wildcards
function matchPattern(pattern, url) {
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '[^/]*')
    .replace(/\//g, '\\/');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(url);
}

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

  // Handle CSV and Excel file requests
  if (url.pathname.endsWith('.csv') || url.pathname.endsWith('.xlsx')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return new Response(response.body, {
              headers: {
                'Content-Type': mimeType,
                ...response.headers
              }
            });
          }
          return fetch(event.request)
            .then(networkResponse => {
              if (!networkResponse || networkResponse.status !== 200) {
                throw new Error('Network response was not ok');
              }
              const responseToCache = networkResponse.clone();
              caches.open(STATIC_CACHE)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
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
    return;
  }

  // Handle other requests
  event.respondWith(
    caches.match(event.request)
      .then(async response => {
        // If exact match found, return it
        if (response) {
          return new Response(response.body, {
            headers: {
              'Content-Type': mimeType,
              ...response.headers
            }
          });
        }

        // Check for pattern matches (e.g., hashed filenames)
        const cache = await caches.open(STATIC_CACHE);
        const keys = await cache.keys();
        const patternMatch = keys.find(key => {
          const patterns = CRITICAL_ASSETS.filter(asset => asset.includes('*'));
          return patterns.some(pattern => matchPattern(pattern, key.url));
        });

        if (patternMatch) {
          const patternResponse = await cache.match(patternMatch);
          if (patternResponse) {
            return new Response(patternResponse.body, {
              headers: {
                'Content-Type': mimeType,
                ...patternResponse.headers
              }
            });
          }
        }

        // Fetch from network if no cache match
        return fetch(event.request)
          .then(networkResponse => {
            const responseToCache = networkResponse.clone();
            caches.open(DYNAMIC_CACHE)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
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