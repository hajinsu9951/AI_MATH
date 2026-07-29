const CACHE_NAME = 'ai-math-v12';
const ASSETS = [
  './',
  './index.html',
  './loader.js',
  './core.js',
  './manifest.json',
  './views/home.html',
  './views/intro.html',
  './views/perceptron.html',
  './views/text.html',
  './views/mnist.html',
  './views/quickdraw.html',
  './views/hamming.html',
  './views/conv.html',
  './views/filter.html',
  './views/pool.html',
  './views/pipeline.html',
  './views/detect.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE_NAME ? null : caches.delete(k))));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      // same-origin only cache
      const url = new URL(req.url);
      if (url.origin === location.origin && fresh.ok) cache.put(req, fresh.clone());
      return fresh;
    } catch (e) {
      // fallback to index for navigation
      if (req.mode === 'navigate') {
        return (await cache.match('./index.html')) || new Response('Offline', { status: 503 });
      }
      throw e;
    }
  })());
});
