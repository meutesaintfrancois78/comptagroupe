// Service Worker pour l'application PWA Compta Groupe Saint-Martin
const CACHE_NAME = 'saint-martin-compta-shell-v4';
const OFFLINE_URL = '/offline.html';
const APP_SHELL = [
  '/',
  '/index.html',
  OFFLINE_URL,
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/marty/marty-hello.webp',
  '/marty/marty-ready.webp',
  '/marty/marty-waiting.webp',
  '/marty/marty-success.webp',
  '/marty/marty-offline.webp',
  '/marty/marty-error.webp'
];

// Fichiers du build (JS et CSS hachés) référencés par index.html.
// Sans eux en cache, l'index hors ligne afficherait une page blanche.
async function bundleAssets() {
  const response = await fetch('/index.html', { cache: 'no-store' });
  const html = await response.text();
  return Array.from(new Set(html.match(/\/assets\/[^"'\s>]+/g) || []));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(APP_SHELL).catch((err) => {
        console.warn('App Shell precache partial failure:', err);
      });
      try {
        await cache.addAll(await bundleAssets());
      } catch (err) {
        console.warn('Bundle precache failure:', err);
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => clients.claim())
  );
});

// L'index en cache n'est utilisable que si tous ses fichiers de build le sont aussi
async function cachedShell() {
  const cache = await caches.open(CACHE_NAME);
  const index = await cache.match('/index.html');
  if (!index) return null;
  const html = await index.clone().text();
  const assets = html.match(/\/assets\/[^"'\s>]+/g) || [];
  for (const asset of assets) {
    if (!(await cache.match(asset))) return null;
  }
  return index;
}

self.addEventListener('fetch', (event) => {
  // Navigation : réseau d'abord, puis l'appli en cache, sinon l'écran hors ligne autonome
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const shell = await cachedShell();
        if (shell) return shell;
        const offline = await caches.match(OFFLINE_URL);
        return (
          offline ||
          new Response('Hors-ligne', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        );
      })
    );
    return;
  }

  // Scripts et styles du build : cache d'abord, mis à jour en arrière-plan
  if (
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    event.request.url.includes('/assets/')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Images, icônes, polices
  if (
    event.request.destination === 'image' ||
    event.request.destination === 'font' ||
    event.request.url.includes('/marty/') ||
    event.request.url.includes('/icons/')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);
      })
    );
  }
});
