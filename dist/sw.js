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

function isDevMode() {
  return location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}

function shouldCache(request) {
  // Don't cache in development/preview mode
  if (isDevMode()) {
    return false;
  }
  
  const url = new URL(request.url);
  
  // Don't cache URLs with version parameters to ensure fresh content
  if (url.searchParams.has('v')) {
    return false;
  }
  
  // Only cache local assets in production
  return url.origin === location.origin;
}

self.addEventListener('install', (event) => {
  // Skip waiting to activate new service worker immediately
  self.skipWaiting();
  
  if (isDevMode()) {
    return; // Don't cache in dev mode
  }

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Filter out versioned URLs and wildcards
        const urlsToInstall = urlsToCache.filter(url => 
          !url.includes('*') && !url.includes('?v=')
        );
        return cache.addAll(urlsToInstall);
      })
  );
});

self.addEventListener('activate', (event) => {
  // Claim clients immediately
  event.waitUntil(self.clients.claim());

  // Clear all caches in dev mode
  if (isDevMode()) {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      })
    );
    return;
  }

  // In production, only clear old cache versions
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // In dev mode, always go to network
  if (isDevMode()) {
    event.respondWith(
      fetch(event.request)
        .catch(handleFetchError)
    );
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
            if (!response || response.status !== 200) {
              return response;
            }

            if (shouldCache(event.request)) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }

            return response;
          })
          .catch(handleFetchError);
      })
  );
}); 