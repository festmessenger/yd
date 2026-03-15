/* FestMessenger Service Worker v0.1.0 */
const CACHE = 'festmessenger-v0.1.0';
const OFFLINE_ASSETS = [
  '/yd/',
  '/yd/index.html',
  '/yd/core/disk.js',
  '/yd/core/i18n.js',
  '/yd/core/updater.js',
  '/yd/i18n/ru.json',
  '/yd/i18n/en.json',
  '/yd/themes/light.css',
  '/yd/themes/dark.css',
  '/yd/assets/logo.png',
  '/yd/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(OFFLINE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Always network-first for Yandex Disk API
  if (url.hostname.includes('yandex')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // Cache-first for app assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        // Background refresh
        fetch(e.request).then(r => {
          if (r.ok) caches.open(CACHE).then(c => c.put(e.request, r));
        }).catch(() => {});
        return cached;
      }
      return fetch(e.request).then(r => {
        if (r.ok) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      });
    })
  );
});

// Push notifications
self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'FestMessenger', {
      body: data.body || '',
      icon: '/yd/assets/logo.png',
      badge: '/yd/assets/logo.png',
      tag: data.tag || 'fm',
      data: data
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/yd/'));
});
