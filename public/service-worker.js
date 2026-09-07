/**
 * NexTrack Service Worker
 * Provides offline functionality with cache-first strategy for assets
 * and network-first strategy for API calls.
 */

const CACHE_NAME = 'nextrack-v1';
const ASSET_CACHE = 'nextrack-assets-v1';
const RUNTIME_CACHE = 'nextrack-runtime-v1';

// Assets to cache on install
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.jpg',
];

/**
 * Install: Cache essential assets
 */
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(ASSET_CACHE).then((cache) => {
      console.log('[ServiceWorker] Caching assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      self.skipWaiting(); // Activate immediately
    })
  );
});

/**
 * Activate: Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== ASSET_CACHE && cacheName !== RUNTIME_CACHE && cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_ACTIVATED' });
        });
      });
    })
  );
});

/**
 * Fetch: Smart caching strategy
 * - Cache first for static assets (js, css, images, fonts)
 * - Network first for API calls and HTML
 * - Return offline fallback if both fail
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests and chrome extensions
  if (url.origin !== self.location.origin) {
    return;
  }

  // API calls: network first, fallback to cache
  if (url.pathname.startsWith('/api/') || url.pathname.includes('.json')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Static assets: cache first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // HTML pages: network first
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Default: cache first
  event.respondWith(cacheFirstStrategy(request));
});

/**
 * Cache-first strategy: Try cache, fallback to network
 */
function cacheFirstStrategy(request) {
  return caches.match(request).then((response) => {
    if (response) {
      return response;
    }
    return fetch(request).then((response) => {
      // Only cache successful responses
      if (!response || response.status !== 200) {
        return response;
      }
      const responseToCache = response.clone();
      caches.open(RUNTIME_CACHE).then((cache) => {
        cache.put(request, responseToCache);
      });
      return response;
    }).catch(() => {
      // Return offline page or minimal response
      return new Response('Offline - Resource not available', {
        status: 503,
        statusText: 'Service Unavailable',
      });
    });
  });
}

/**
 * Network-first strategy: Try network, fallback to cache
 */
function networkFirstStrategy(request) {
  return fetch(request).then((response) => {
    // Only cache successful responses
    if (!response || response.status !== 200) {
      return response;
    }
    const responseToCache = response.clone();
    caches.open(RUNTIME_CACHE).then((cache) => {
      cache.put(request, responseToCache);
    });
    return response;
  }).catch(() => {
    return caches.match(request).then((response) => {
      if (response) {
        return response;
      }
      return new Response('Offline - Unable to load', {
        status: 503,
        statusText: 'Service Unavailable',
      });
    });
  });
}

/**
 * Check if URL is a static asset
 */
function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot|ico)$/i.test(pathname);
}

/**
 * Handle messages from clients
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    });
  }
});
