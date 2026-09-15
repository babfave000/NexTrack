/**
 * NexTrack Service Worker
 * Provides offline functionality with cache-first strategy for assets
 * and network-first strategy for API calls.
 */

const CACHE_NAME = 'nextrack-v2';
const ASSET_CACHE = 'nextrack-assets-v2';
const RUNTIME_CACHE = 'nextrack-runtime-v2';
const OFFLINE_URL = '/offline.html';

// Assets to cache on install
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  OFFLINE_URL,
  '/icon.jpg',
  '/icons/icon.svg',
  '/icons/icon-maskable.svg',
];

/**
 * Install: Cache essential assets
 */
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(ASSET_CACHE).then((cache) => {
      console.log('[ServiceWorker] Caching assets');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[ServiceWorker] Some assets failed to pre-cache, continuing:', err);
        return cache.addAll([
          '/',
          '/index.html',
          '/manifest.json',
          OFFLINE_URL,
        ]);
      });
    }).then(() => {
      console.log('[ServiceWorker] Precache complete, forcing skipWaiting');
      return self.skipWaiting();
    })
  );
});

/**
 * Activate: Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  const expectedCaches = new Set([ASSET_CACHE, RUNTIME_CACHE, CACHE_NAME]);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!expectedCaches.has(cacheName)) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] Claiming all clients immediately');
      return self.clients.claim();
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
 * - Return styled offline fallback if both fail and request is navigate
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests and chrome extensions
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip non-GET requests (POST/PUT etc. can't be cached)
  if (request.method && request.method !== 'GET') {
    return;
  }

  // API calls: network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, false));
    return;
  }

  // Manifest + icons: cache-first always
  if (
    url.pathname === '/manifest.json' ||
    url.pathname === '/offline.html' ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/icon.jpg'
  ) {
    event.respondWith(cacheFirstStrategy(request, false));
    return;
  }

  // Static assets (built js/css etc.): cache first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request, false));
    return;
  }

  // HTML pages / navigate: network first with styled offline shell
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstStrategy(request, true));
    return;
  }

  // Default: cache first
  event.respondWith(cacheFirstStrategy(request, false));
});

function serveOfflineShell() {
  return caches.match(OFFLINE_URL).then((cachedOffline) => {
    if (cachedOffline) return cachedOffline;
    return new Response(
      '<!doctype html><title>Offline - NexTrack</title>' +
      '<body style="font-family:system-ui;padding:2rem">' +
      '<h1>You\u2019re offline</h1><p>Connect to the internet and retry.</p>' +
      '<p><a href="/">Go home</a></p></body></html>',
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  });
}

/**
 * Cache-first strategy: Try cache, fallback to network
 */
function cacheFirstStrategy(request, serveOfflineOnFailure) {
  return caches.match(request).then((response) => {
    if (response) {
      return response;
    }
    return fetch(request).then((response) => {
      if (!response || response.status !== 200 || response.type !== 'basic') {
        return response;
      }
      const responseToCache = response.clone();
      caches.open(RUNTIME_CACHE).then((cache) => {
        cache.put(request, responseToCache);
      });
      return response;
    }).catch(() => {
      if (serveOfflineOnFailure) return serveOfflineShell();
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
function networkFirstStrategy(request, serveOfflineOnFailure) {
  return fetch(request).then((response) => {
    if (response && response.status === 200 && response.type === 'basic') {
      const responseToCache = response.clone();
      caches.open(RUNTIME_CACHE).then((cache) => {
        cache.put(request, responseToCache);
      });
    }
    return response;
  }).catch(() => {
    return caches.match(request).then((response) => {
      if (response) {
        return response;
      }
      if (serveOfflineOnFailure) return serveOfflineShell();
      return new Response('Offline - Unable to load', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    });
  });
}

/**
 * Check if URL is a static asset
 */
function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot|ico|wasm|map)$/i.test(pathname);
}

/**
 * Handle messages from clients
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[ServiceWorker] Received SKIP_WAITING, forcing activate');
    Promise.resolve(self.skipWaiting()).then(() => {
      if (event.source && event.source.postMessage) {
        try { event.source.postMessage({ type: 'SKIP_WAITING_ACK' }); } catch (_) { /* noop */ }
      }
    });
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => Promise.all(cacheNames.map((n) => caches.delete(n))))
    );
  }

  if (event.data && event.data.type === 'PING') {
    if (event.source && event.source.postMessage) {
      try { event.source.postMessage({ type: 'PONG' }); } catch (_) { /* noop */ }
    }
  }
});
