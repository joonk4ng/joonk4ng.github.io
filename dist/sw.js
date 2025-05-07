const CACHE_NAME = 'firefighter-shift-v1';
const urlsToCache = [
  '/your-repo/',
  '/your-repo/index.html',
  '/your-repo/firefighters.csv',
  '/your-repo/manifest.json',
  '/your-repo/icons/icon-192.png',
  '/your-repo/icons/icon-512.png',
  '/your-repo/assets/index.js',
  '/your-repo/assets/index.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
}); 