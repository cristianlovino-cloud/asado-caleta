// sw.js — Service Worker para Asado en la Caleta
// Versión: cambiá este número para forzar actualización en todos los dispositivos
const VERSION = 'v1.0.5';
const CACHE_NAME = 'asado-caleta-' + VERSION;

// Archivos a cachear
const STATIC_ASSETS = [
  '/asado-caleta/',
  '/asado-caleta/index.html',
  '/asado-caleta/icon.png',
  '/asado-caleta/manifest.json',
];

// INSTALL: cachear assets estáticos
self.addEventListener('install', event => {
  console.log('[SW] Install', VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  // Activar inmediatamente sin esperar
  self.skipWaiting();
});

// ACTIVATE: limpiar cachés viejos
self.addEventListener('activate', event => {
  console.log('[SW] Activate', VERSION);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Borrando caché viejo:', k);
          return caches.delete(k);
        })
      )
    )
  );
  self.clients.claim();
});

// FETCH: Network First — siempre intenta la red, usa caché solo si falla
self.addEventListener('fetch', event => {
  // Solo interceptar requests del mismo origen (no Supabase, no CDNs)
  const url = new URL(event.request.url);
  const isLocal = url.origin === self.location.origin;
  const isAsset = isLocal && (
    url.pathname.includes('/asado-caleta/') ||
    url.pathname === '/asado-caleta'
  );

  if (!isAsset) return; // Dejar pasar Supabase y CDNs sin interceptar

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Actualizar caché con la versión fresca
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Si no hay red, usar caché
        return caches.match(event.request);
      })
  );
});

// Mensaje para skipWaiting desde la app
self.addEventListener('message', event => {
  if (event.data?.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
