// ArtEval Service Worker — v234
// CAMBIO CLAVE (v234): se eliminó skipWaiting() + clients.claim() automáticos.
// En una PWA de escritorio (MacBook), reclamar el control de todas las ventanas
// apenas se instala una versión nueva puede traer la ventana de ArtEval al
// frente y sacar al profesor de lo que esté haciendo (por ejemplo, una
// presentación en pantalla completa). Ahora el SW nuevo espera en segundo plano
// y toma control recién en la próxima apertura natural de la app, sin robar foco.

const CACHE = 'arteval-v247';
const SKIP = ['googleapis.com', 'accounts.google.com', 'script.google.com', 'gstatic.com'];

self.addEventListener('install', function(e) {
  // NO llamar self.skipWaiting(): dejar que el SW nuevo espere.
});

self.addEventListener('activate', function(e) {
  // Limpiar cachés viejas, pero SIN clients.claim() — no reclamar ventanas ya abiertas.
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; })
                            .map(function(k) { return caches.delete(k); }));
    })
  );
});

self.addEventListener('fetch', function(e) {
  var u = e.request.url;
  if (SKIP.some(function(s) { return u.includes(s); })) return;
  // Solo GET se cachea; nunca interferir con POST/PUT (envíos, API).
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function(c) {
      if (c) return c;
      return fetch(e.request).then(function(r) {
        if (r && r.status === 200 && r.type !== 'opaque') {
          var cl = r.clone();
          caches.open(CACHE).then(function(ca) { ca.put(e.request, cl); });
        }
        return r;
      }).catch(function() {
        return c || new Response('Sin conexión', { status: 503 });
      });
    })
  );
});

// Permite que la app pida activar la versión nueva SOLO cuando el usuario lo
// decida (ej: un botón "actualizar"), nunca de forma automática.
self.addEventListener('message', function(e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
