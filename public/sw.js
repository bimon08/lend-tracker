const CACHE_VERSION = 6;
const CACHE_NAME = `lendtracker-v${CACHE_VERSION}`;

// Install — don't fail if some assets are missing
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache each URL individually so one failure doesn't block others
      const urls = ['/', '/people', '/settings', '/login'];
      for (const url of urls) {
        try {
          await cache.add(url);
        } catch (e) {
          console.warn(`SW: Failed to cache ${url}:`, e);
        }
      }
    })
  );
  self.skipWaiting();
});

// Activate — delete ALL old caches, then claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Notify all clients to reload when new SW takes over
self.addEventListener('activate', () => {
  self.clients.matchAll({ type: 'window' }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: 'SW_UPDATED' });
    });
  });
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin, HMR
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/_next/webpack-hmr')) return;

  // API calls — always network
  if (url.pathname.startsWith('/api/')) return;

  // Supabase calls — never cache
  if (url.hostname.includes('supabase')) return;

  // Static assets with hashes — cache first (immutable)
  if (url.pathname.startsWith('/_next/static')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Page navigations — network first, fall back to cache only when offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(request);
          if (cached) return cached;
          // Fall back to cached home page for any route
          const homeCached = await cache.match('/');
          if (homeCached) return homeCached;
          return new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  // Other resources (JS chunks, CSS, images) — stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);

      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        fetchPromise; // fire and forget the background update
        return cached;
      }

      const networkResponse = await fetchPromise;
      if (networkResponse) return networkResponse;

      return new Response('Offline', { status: 503 });
    })
  );
});
