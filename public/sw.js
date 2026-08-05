// Service Worker mínimo para habilitar instalación PWA
const CACHE_NAME = 'margen-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through fetch for online-first strategy
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
