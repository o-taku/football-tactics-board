const CACHE = 'football-tactics-board-v1';
const SHELL = [
  '/',
  '/index.html',
  '/editor.html',
  '/viewer.html',
  '/styles.css',
  '/manifest.webmanifest',
  '/src/core/board.js',
  '/src/core/recorder.js',
  '/src/core/player.js',
  '/src/core/api.js',
  '/src/core/storage-local.js',
  '/src/core/util.js',
  '/src/pages/home.js',
  '/src/pages/editor.js',
  '/src/pages/viewer.js',
  '/src/sports/index.js',
  '/src/sports/socca.js',
  '/src/sports/soccer.js',
  '/src/sports/futsal.js',
  '/icons/icon.svg',
  '/icons/icon-maskable.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Network-only for API and Netlify functions
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/.netlify/')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('/index.html');
      });
    })
  );
});
