const CACHE_NAME = 'ai-math-v93';
const ASSETS = [
  './',
  './index.html',
  './loader.js',
  './core.js',
  './manifest.json',
  './views/home.html',
  './views/intro.html',
  './assets/photo/dartmouth_1956.jpg',
  './views/mlplay.html',
  './views/logic.html',
  './views/perceptron.html',
  './views/bias.html',
  './views/dataeth.html',
  './views/text.html',
  './views/tfidf.html',
  './views/vecop.html',
  './views/sim.html',
  './views/senti.html',
  './views/review.html',
  './views/imgop.html',
  './views/rgb.html',
  './views/transpose.html',
  './views/matmul.html',
  './views/imgcls.html',
  './views/fclayer.html',
  './views/cnn.html',
  './views/prob.html',
  './views/trend.html',
  './views/optim.html',
  './views/loss2.html',
  './views/gdsheet.html',
  './views/axb.html',
  './views/inquiry.html',
  './views/decision.html',
  './views/datalab.html',
  './views/project.html',
  './views/genvec.html',
  './views/genimg.html',
  './views/genethics.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // HTTP 캐시를 우회해 항상 최신본을 받아 옵니다.
    // (기본 cache.addAll은 브라우저 HTTP 캐시의 구버전을 그대로 담을 수 있어,
    //  CACHE_NAME을 올려도 학생 기기에 구 core.js가 남는 사고가 납니다.)
    await Promise.all(ASSETS.map(async (url) => {
      const res = await fetch(url, { cache: 'reload' });
      if (!res.ok) throw new Error(`SW install: ${url} → ${res.status}`);
      await cache.put(url, res);
    }));
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

// 런타임 캐시 제외 경로 — 학습지(hwp/hwpx/pdf/xlsx/pptx, 최대 6MB)와
// 교과서 지면 캡처는 §20에 따라 네트워크 전용입니다. 이 가드가 없으면
// 학생이 학습지 버튼을 한 번 누를 때마다 대용량 파일이 캐시에 적재됩니다.
const NOCACHE = /\/assets\/(worksheets|textbook-local)\//;

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
      if (url.origin === location.origin && fresh.ok && !NOCACHE.test(url.pathname)) cache.put(req, fresh.clone());
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
