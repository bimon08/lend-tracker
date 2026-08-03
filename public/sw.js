const CACHE_VERSION = 5;
const CACHE_NAME = `lendtracker-v${CACHE_VERSION}`;

// Install — don't fail if some assets are missing
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache each URL individually so one failure doesn't block others
      const urls = ['/', '/lend', '/borrow', '/people', '/settings', '/login'];
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

// Activate — delete ALL old caches, then cache the current page
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
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

  // Everything else — stale-while-revalidate for better offline support
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);

      // Always try fetching fresh version
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      // If we have a cached version, return it immediately
      // The fetch will update the cache in the background
      if (cached) {
        fetchPromise; // fire and forget the background update
        return cached;
      }

      // No cached version — wait for network
      const networkResponse = await fetchPromise;
      if (networkResponse) return networkResponse;

      // Last resort for navigation — serve cached home page
      if (request.mode === 'navigate') {
        const homeCached = await cache.match('/');
        if (homeCached) return homeCached;
      }

      return new Response('Offline', { status: 503 });
    })
  );
});
