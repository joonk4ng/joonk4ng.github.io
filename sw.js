const CACHE_NAME = 'pwa-pdf-cache-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Helper function to handle failed requests
const handleFetchError = (error) => {
  console.error('Fetch failed:', error);
  return new Response(
    JSON.stringify({
      error: 'Network request failed',
      message: 'The application is currently offline'
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};

// Helper function to determine if a request should be cached
const shouldCache = (request) => {
  const url = new URL(request.url);
  // Don't cache WebSocket connections
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return false;
  }
  // Don't cache browser-sync requests
  if (url.pathname.includes('browser-sync')) {
    return false;
  }
  // Don't cache PDF files
  if (url.pathname.endsWith('.pdf')) {
    return false;
  }
  return true;
};

self.addEventListener('install', (event) => {
  // Skip waiting only if this is the first install
  event.waitUntil(
    caches.keys().then(cacheNames => {
      if (cacheNames.length === 0) {
        self.skipWaiting();
      }
      return caches.open(CACHE_NAME)
        .then((cache) => {
          console.log('Opened cache');
          return Promise.allSettled(
            urlsToCache.map(url => 
              cache.add(url).catch(error => {
                console.error(`Failed to cache ${url}:`, error);
                return Promise.resolve();
              })
            )
          );
        });
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Don't handle non-GET requests or WebSocket connections
  if (event.request.method !== 'GET' || !shouldCache(event.request)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request.clone())
          .then(response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            if (shouldCache(event.request)) {
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                })
                .catch(error => {
                  console.error('Failed to cache response:', error);
                });
            }

            return response;
          })
          .catch(handleFetchError);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Only claim clients if there are no other active service workers
        return self.clients.matchAll().then(clients => {
          if (clients.length === 0) {
            return self.clients.claim();
          }
        });
      })
  );
}); 