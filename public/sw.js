const CACHE_NAME = 'csv-editor-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/vite.svg'
];

// Log all URLs we're trying to cache
console.log('Attempting to cache URLs:', urlsToCache);

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  // Skip waiting to activate the new service worker immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache opened successfully');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('All URLs cached successfully');
      })
      .catch(error => {
        console.error('Error caching URLs:', error);
        // Log which URLs failed
        urlsToCache.forEach(url => {
          caches.match(url).catch(() => {
            console.error('Failed to cache:', url);
          });
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  // Claim clients to ensure the service worker controls all pages
  event.waitUntil(
    Promise.all([
      // Clean up old caches
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
      // Take control of all clients
      clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  console.log('Fetching:', event.request.url);
  
  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html')
        .then(response => {
          if (response) {
            console.log('Serving index.html from cache');
            return response;
          }
          return fetch(event.request)
            .then(response => {
              if (!response || response.status !== 200) {
                throw new Error('Network response was not ok');
              }
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put('/index.html', responseToCache);
                });
              return response;
            })
            .catch(() => {
              // If both cache and network fail, return a fallback
              return caches.match('/index.html');
            });
        })
    );
    return;
  }

  // Handle other requests
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          console.log('Cache hit for:', event.request.url);
          return response;
        }
        console.log('Cache miss for:', event.request.url);
        
        return fetch(event.request)
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Open the cache
            caches.open(CACHE_NAME)
              .then((cache) => {
                // Add the response to the cache
                cache.put(event.request, responseToCache);
                console.log('Cached new resource:', event.request.url);
              });

            return response;
          })
          .catch(error => {
            console.error('Fetch failed:', error);
            // Return cached response if available, otherwise return error
            return caches.match(event.request)
              .then(cachedResponse => {
                if (cachedResponse) {
                  return cachedResponse;
                }
                return new Response('Network error occurred', {
                  status: 408,
                  headers: new Headers({
                    'Content-Type': 'text/plain'
                  })
                });
              });
          });
      })
  );
}); 