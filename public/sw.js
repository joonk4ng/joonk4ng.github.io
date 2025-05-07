const CACHE_NAME = 'firefighter-shift-v1';
const BASE_PATH = '/'; // Updated for username.github.io
const urlsToCache = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'firefighters.csv',
  BASE_PATH + 'manifest.json',
  BASE_PATH + 'icons/icon-192.png',
  BASE_PATH + 'icons/icon-512.png',
  BASE_PATH + 'assets/index.css',
  BASE_PATH + 'assets/index.js'
];

// Log all URLs we're trying to cache
console.log('Attempting to cache URLs:', urlsToCache);

self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened successfully');
        return cache.addAll(urlsToCache)
          .then(() => {
            console.log('All URLs cached successfully');
          })
          .catch(error => {
            console.error('Error caching URLs:', error);
            // Log which URLs failed
            urlsToCache.forEach(url => {
              cache.match(url).catch(() => {
                console.error('Failed to cache:', url);
              });
            });
          });
      })
      .catch(error => {
        console.error('Error opening cache:', error);
      })
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  // Clean up old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  console.log('Fetching:', event.request.url);
  
  // Handle requests for the root path
  if (event.request.url.endsWith(BASE_PATH)) {
    event.respondWith(
      caches.match(BASE_PATH + 'index.html')
        .then(response => response || fetch(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log('Cache hit for:', event.request.url);
          return response;
        }
        console.log('Cache miss for:', event.request.url);
        
        const fetchRequest = event.request.clone();
        return fetch(fetchRequest)
          .then(response => {
            if(!response || response.status !== 200 || response.type !== 'basic') {
              console.log('Invalid response for:', event.request.url, response);
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
                console.log('Cached new resource:', event.request.url);
              })
              .catch(error => {
                console.error('Error caching new resource:', error);
              });

            return response;
          })
          .catch(error => {
            console.error('Fetch failed:', error);
            return new Response('Network error occurred', {
              status: 408,
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
}); 