const CACHE_NAME = 'pwa-pdf-cache-v3';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './pdf.worker.min.mjs',
  './assets/main-*.js',
  './assets/vendor-*.js',
  './assets/pdf-*.js',
  './assets/xlsx-*.js',
  './assets/index-*.css'
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

function shouldCache(request) {
  const url = new URL(request.url);
  // Cache local assets and API requests
  return url.origin === location.origin || url.pathname.startsWith('/api/');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache.filter(url => !url.includes('*')))
          .then(() => self.skipWaiting());
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request.clone())
          .then(response => {
            if (!response || response.status !== 200) {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                // Only cache same-origin requests
                if (event.request.url.startsWith(self.location.origin)) {
                  cache.put(event.request, responseToCache);
                }
              });

            return response;
          })
          .catch(() => {
            // Return a fallback response if offline
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
          });
      })
  );
}); 