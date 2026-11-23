/**
 * ============================================================
 * SiGuru SD - Service Worker (Offline-First App Shell & Cache)
 * Memungkinkan aplikasi tetap terbuka dan berjalan lancar saat
 * perangkat guru tidak memiliki koneksi internet (Offline Mode).
 * ============================================================
 */

const CACHE_NAME = 'siguru-pwa-v1';

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

// Siklus Activate: Bersihkan versi cache usang dan ambil alih klien
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Siklus Fetch: Tangani permintaan jaringan dengan strategi Offline-First Cerdas
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

  // 3. Strategi Permintaan Navigasi Halaman (HTML): Network-First dengan Fallback ke Cache
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

  // 4. Strategi Aset Statis (CSS, JS, Fonts, Gambar, CDN): Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // Gagal fetch jaringan saat offline, biarkan cachedResponse yang menangani
        });

      return cachedResponse || fetchPromise;
    })
  );
});
