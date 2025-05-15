# Deploying a React PWA to GitHub Pages: A Complete Guide

## Table of Contents
1. [Initial Setup](#initial-setup)
2. [Project Configuration](#project-configuration)
3. [PWA Configuration](#pwa-configuration)
4. [GitHub Pages Deployment](#github-pages-deployment)
5. [Troubleshooting](#troubleshooting)

## Initial Setup

### 1. Create a New React Project with Vite
```bash
npm create vite@latest my-pwa -- --template react-ts
cd my-pwa
npm install
```

### 2. Install Required Dependencies
```bash
npm install idb # For IndexedDB support
```

## Project Configuration

### 1. Configure Vite (vite.config.ts)
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/', // For username.github.io repositories
  // base: '/repository-name/', // For other repositories
  server: {
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: undefined,
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    }
  },
  publicDir: 'public',
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  }
});
```

### 2. Configure index.html
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#your-color" />
    <meta name="description" content="Your PWA description" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="/icons/icon-192.png" />
    <title>Your PWA Title</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <script>
      // Add error handling for failed script loads
      window.addEventListener('error', function(e) {
        if (e.target.tagName === 'SCRIPT') {
          console.error('Script failed to load:', e.target.src);
        }
      }, true);
    </script>
  </body>
</html>
```

## PWA Configuration

### 1. Create manifest.json (public/manifest.json)
```json
{
  "short_name": "Your App",
  "name": "Your PWA Name",
  "description": "Your PWA description",
  "icons": [
    {
      "src": "icons/icon-192.png",
      "type": "image/png",
      "sizes": "192x192",
      "purpose": "any maskable"
    },
    {
      "src": "icons/icon-512.png",
      "type": "image/png",
      "sizes": "512x512",
      "purpose": "any maskable"
    }
  ],
  "start_url": "/",
  "display": "standalone",
  "background_color": "#your-color",
  "theme_color": "#your-color",
  "orientation": "portrait",
  "scope": "/",
  "prefer_related_applications": false
}
```

### 2. Create Service Worker (public/sw.js)
```javascript
const CACHE_NAME = 'your-pwa-v1';
const BASE_PATH = '/'; // For username.github.io
// const BASE_PATH = '/repository-name/'; // For other repositories
const urlsToCache = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'manifest.json',
  BASE_PATH + 'icons/icon-192.png',
  BASE_PATH + 'icons/icon-512.png',
  BASE_PATH + 'assets/main.js',
  BASE_PATH + 'assets/index.css'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      clients.claim()
    ])
  );
});

self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(BASE_PATH + 'index.html')
        .then(response => response || fetch(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

### 3. Register Service Worker (src/main.tsx)
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered successfully:', registration);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## GitHub Pages Deployment

### 1. Create GitHub Actions Workflow (.github/workflows/deploy.yml)
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
        with:
          static_site_generator: vite
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### 2. Repository Setup
1. Go to repository Settings > Pages
2. Set source to "GitHub Actions"
3. Ensure repository has necessary permissions:
   - Settings > Actions > General
   - Enable "Read and write permissions"

## Troubleshooting

### Common Issues and Solutions

1. **Blank Page After Installation**
   - Check service worker registration
   - Verify cache paths in sw.js
   - Clear browser cache and reinstall PWA

2. **Build Failures**
   - Ensure correct base path in vite.config.ts
   - Check for duplicate entry points
   - Verify all dependencies are installed

3. **Service Worker Not Registering**
   - Check file paths in sw.js
   - Verify manifest.json paths
   - Ensure HTTPS is enabled (required for service workers)

4. **Assets Not Loading**
   - Check asset paths in sw.js
   - Verify build output structure
   - Clear browser cache

### Testing Checklist
- [ ] Local development works (`npm run dev`)
- [ ] Build succeeds (`npm run build`)
- [ ] Service worker registers
- [ ] PWA installs correctly
- [ ] Works offline
- [ ] Assets load properly
- [ ] GitHub Actions workflow succeeds

## Best Practices

1. **Version Control**
   - Use semantic versioning
   - Keep dependencies updated
   - Document changes

2. **Performance**
   - Optimize images
   - Use code splitting
   - Implement lazy loading

3. **Security**
   - Use HTTPS
   - Implement proper CSP headers
   - Keep dependencies secure

4. **User Experience**
   - Add loading states
   - Implement error boundaries
   - Provide offline fallbacks

## Resources

- [Vite Documentation](https://vitejs.dev/)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) 