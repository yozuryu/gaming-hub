const CACHE_NAME = 'gaming-hub-v5';

// Static assets — precached on install, then stale-while-revalidate
const PRECACHE = [
  '/gaming-hub/',
  '/gaming-hub/index.html',
  '/gaming-hub/profile/ra/index.html',
  '/gaming-hub/profile/ra/app.js',
  '/gaming-hub/profile/ra/utils/constants.js',
  '/gaming-hub/profile/ra/utils/helpers.js',
  '/gaming-hub/profile/ra/utils/transform.js',
  '/gaming-hub/profile/steam/index.html',
  '/gaming-hub/profile/steam/app.js',
  '/gaming-hub/profile/steam/utils/constants.js',
  '/gaming-hub/profile/steam/utils/helpers.js',
  '/gaming-hub/profile/xbox/index.html',
  '/gaming-hub/profile/xbox/app.js',
  '/gaming-hub/profile/xbox/utils/constants.js',
  '/gaming-hub/profile/xbox/utils/helpers.js',
  '/gaming-hub/activity/index.html',
  '/gaming-hub/activity/app.js',
  '/gaming-hub/activity/utils/constants.js',
  '/gaming-hub/activity/utils/helpers.js',
  '/gaming-hub/activity/utils/normalizers.js',
  '/gaming-hub/completions/index.html',
  '/gaming-hub/completions/app.js',
  '/gaming-hub/changelog/index.html',
  '/gaming-hub/changelog/app.js',
  '/gaming-hub/assets/avatar.png',
  '/gaming-hub/assets/icon-ra.png',
  '/gaming-hub/assets/icon-steam.png',
  '/gaming-hub/assets/icon-xbox.png',
  '/gaming-hub/assets/icon-192.png',
  '/gaming-hub/assets/icon-512.png',
];

// Install — precache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate — delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch — network-first for JSON data, stale-while-revalidate for everything else
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;

  const isData = url.pathname.startsWith('/gaming-hub/data/') ||
                 url.pathname.startsWith('/gaming-hub/changelog.md');

  if (isData) {
    // Network-first: always try fresh data, fall back to cache if offline
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Stale-while-revalidate: serve the cached copy immediately and refresh it
    // in the background, so a deploy shows up on the next page load without a
    // CACHE_NAME bump. no-cache revalidates past GitHub Pages' HTTP cache.
    const network = fetch(event.request, { cache: 'no-cache' })
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return res;
      });
    event.respondWith(caches.match(event.request).then(cached => cached || network));
    event.waitUntil(network.catch(() => {}));
  }
});
