/**
 * ============================================================
 * SiGuru SD - Service Worker (Speed Wush & Turbo Cache Engine)
 * Memungkinkan aplikasi terbuka instan (<0.1s) dan berjalan lancar saat
 * perangkat guru tidak memiliki koneksi internet (Offline Mode).
 * Version: v4.8-holo-3d-aurora-guide
 * ============================================================
 */

const CACHE_NAME = 'siguru-pwa-v4.8-holo-3d-aurora-guide';

// Aset inti yang wajib di-cache saat Service Worker dipasang
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/config.js',
  '/manifest.json',
  '/assets/icon.svg'
];

// Siklus Install: Unduh dan simpan aset dasar aplikasi
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Peringatan: Sebagian aset pra-cache gagal dimuat:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Siklus Activate: Bersihkan versi cache usang (v1, v2) dan ambil alih klien
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Menghapus cache usang:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Siklus Fetch: Tangani permintaan jaringan dengan strategi Speed Wush
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Lewati permintaan non-GET (POST, PUT, DELETE) agar ditangani oleh Sync Engine
  if (req.method !== 'GET') {
    return;
  }

  // 2. Lewati API backend (/api/, script.google.com, firebase, auth)
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com/identitytoolkit')
  ) {
    return;
  }

  // 3. Strategi Permintaan Navigasi Halaman (HTML): Network-First dengan Fallback Cepat ke Cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cachedIndex = await cache.match('/index.html') || await cache.match('/');
          if (cachedIndex) return cachedIndex;
          return new Response('Aplikasi SiGuru SD Offline. Silakan buka aplikasi yang tersimpan.', {
            headers: { 'Content-Type': 'text/html' }
          });
        })
    );
    return;
  }

  // 3b. Khusus config.js: Network-First agar daftar sekolah & konfigurasi selalu update terkini
  if (url.pathname.includes('config.js')) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(req) || await cache.match('/config.js');
          if (cached) return cached;
        })
    );
    return;
  }

  // 4. STRATEGI TURBO CACHE-FIRST UNTUK CDN & ASSETS STATIS
  // (Tailwind, Lucide, Fonts, Html5Qrcode, QrCodeJs, Xlsx, Images)
  const isStaticCDN = (
    url.hostname.includes('cdn.tailwindcss.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('cdnjs.cloudflare.com') ||
    url.hostname.includes('cdn.jsdelivr.net') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|gif|woff2?|ttf|css|js)$/i)
  );

  if (isStaticCDN) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        if (cachedResponse) {
          // SPEED WUSH: Kembalikan langsung dari disk cache lokal (0 ms)!
          // Jalankan fetch background untuk revalidasi jika ada pembaruan
          fetch(req).then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            }
          }).catch(() => {});
          return cachedResponse;
        }

        // Jika belum ada di cache, unduh dari internet dan simpan ke cache
        return fetch(req).then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 5. Fallback Default: Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return networkResponse;
        })
        .catch(() => {});

      return cachedResponse || fetchPromise;
    })
  );
});
