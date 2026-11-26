/* ことばの森 — Service Worker
   GitHub Pages サブディレクトリ対応（相対パス使用） */

const CACHE_NAME = 'kotoba-no-mori-v1';
const OFFLINE_URLS = [
  './',
  './index.html',
  './manifest.json'
];

/* インストール時: コアファイルをキャッシュ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS).catch((err) => {
        console.warn('SW install cache failed:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

/* アクティベーション時: 古いキャッシュを削除 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

/* フェッチ: ネットワーク優先、失敗時キャッシュ */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  /* Pantry API へのリクエストはキャッシュしない */
  if (req.url.includes('getpantry.cloud')) {
    event.respondWith(
      fetch(req).catch(() => {
        return new Response(JSON.stringify({ board: [] }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      })
      .catch(() => {
        return caches.match(req).then((cached) => {
          if (cached) return cached;
          if (req.mode === 'navigate') return caches.match('./index.html');
          return new Response('Offline', { status: 503 });
        });
      })
  );
});