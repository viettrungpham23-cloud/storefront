/* Service worker — app shell offline + cập nhật.
 * Tĩnh: cache-first.  Điều hướng: network-first → fallback index.html.
 * API & cross-origin (backend host, fonts): luôn qua mạng (không cache). */
const CACHE = 'ta-store-v20';
// Mã nguồn → network-first (luôn lấy bản mới); ảnh/asset → cache-first.
const FRESH = ['/app.js', '/styles.css', '/config.js', '/index.html', '/'];
const SHELL = [
  '/', '/index.html', '/styles.css', '/app.js', '/config.js',
  '/manifest.webmanifest',
  '/assets/logo.png', '/assets/icon-192.png', '/assets/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
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
  if (e.request.method !== 'GET') return;            // POST/PATCH/DELETE → mạng
  if (url.origin !== location.origin) return;        // backend host, Google Fonts → mạng
  if (url.pathname.startsWith('/api/')) return;      // API cùng origin → mạng

  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/index.html')));
    return;
  }
  // Mã nguồn: network-first (cập nhật ngay), rớt mạng thì dùng cache.
  if (FRESH.includes(url.pathname)) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // Ảnh/asset: cache-first.
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => hit))
  );
});
