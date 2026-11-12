const CACHE_NAME = 'my-savepoint-v1';

// Static assets — precached on install, then stale-while-revalidate
const PRECACHE = [
  '/my-savepoint/',
  '/my-savepoint/index.html',
  '/my-savepoint/profile/ra/index.html',
  '/my-savepoint/profile/ra/app.js',
  '/my-savepoint/profile/ra/utils/constants.js',
  '/my-savepoint/profile/ra/utils/helpers.js',
  '/my-savepoint/profile/ra/utils/transform.js',
  '/my-savepoint/profile/steam/index.html',
  '/my-savepoint/profile/steam/app.js',
  '/my-savepoint/profile/steam/utils/constants.js',
  '/my-savepoint/profile/steam/utils/helpers.js',
  '/my-savepoint/profile/xbox/index.html',
  '/my-savepoint/profile/xbox/app.js',
  '/my-savepoint/profile/xbox/utils/constants.js',
  '/my-savepoint/profile/xbox/utils/helpers.js',
  '/my-savepoint/activity/index.html',
  '/my-savepoint/activity/app.js',
  '/my-savepoint/activity/utils/constants.js',
  '/my-savepoint/activity/utils/helpers.js',
  '/my-savepoint/activity/utils/normalizers.js',
  '/my-savepoint/analytics/index.html',
  '/my-savepoint/analytics/app.js',
  '/my-savepoint/analytics/utils.js',
  '/my-savepoint/completions/index.html',
  '/my-savepoint/completions/app.js',
  '/my-savepoint/changelog/index.html',
  '/my-savepoint/changelog/app.js',
  '/my-savepoint/assets/time.js',
  '/my-savepoint/assets/playing.js',
  '/my-savepoint/assets/motion.css',
  '/my-savepoint/assets/ui.css',
  '/my-savepoint/assets/sheet.js',
  '/my-savepoint/assets/game-view.js',
  '/my-savepoint/assets/tabs.js',
  '/my-savepoint/assets/avatar.png',
  '/my-savepoint/assets/icon-ra.png',
  '/my-savepoint/assets/icon-steam.png',
  '/my-savepoint/assets/icon-xbox.png',
  '/my-savepoint/assets/icon-192.png',
  '/my-savepoint/assets/icon-512.png',
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

  const isData = url.pathname.startsWith('/my-savepoint/data/') ||
                 url.pathname.startsWith('/my-savepoint/changelog.md');

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
