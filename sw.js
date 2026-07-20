// ═══════════════════════════════════════════════════════════════════════════
//  ArtEval Service Worker — v217
//  Sube este archivo JUNTO al index.html en Cloudflare Pages (raíz del repo).
//  Estrategia:
//    · Navegación (index.html): RED PRIMERO — siempre la versión más nueva;
//      si no hay conexión, sirve la copia en caché (la app abre offline).
//    · Recursos estáticos (cdnjs: xlsx, mammoth, GIS): CACHÉ PRIMERO — son
//      URLs versionadas que no cambian; red solo la primera vez.
//    · APIs de Google (Drive, Gmail, Gemini, OAuth): NUNCA se interceptan.
//  Al publicar una versión nueva de ArtEval, subir el número de CACHE para
//  que los clientes descarten la caché anterior.
// ═══════════════════════════════════════════════════════════════════════════
const CACHE = 'arteval-v217';
const SKIP = [
  'googleapis.com',
  'accounts.google.com',
  'script.google.com',
  'googleusercontent.com',
  'generativelanguage'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (k) { return k !== CACHE; })
              .map(function (k) { return caches.delete(k); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;
  if (SKIP.some(function (s) { return url.includes(s); })) return;

  // Navegación: red primero, caché como respaldo offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(function (r) {
          const clon = r.clone();
          caches.open(CACHE).then(function (c) { c.put(req, clon); });
          return r;
        })
        .catch(function () {
          return caches.match(req).then(function (hit) {
            return hit || new Response(
              '<meta charset="utf-8"><body style="font-family:sans-serif;text-align:center;padding:40px;">'
              + '<h2>Sin conexi\u00f3n</h2><p>ArtEval necesita abrirse al menos una vez con internet para quedar disponible offline.</p></body>',
              { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            );
          });
        })
    );
    return;
  }

  // Estáticos: caché primero, red como respaldo (y se guarda para la próxima)
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (r) {
        if (r && r.status === 200 && r.type !== 'opaque') {
          const clon = r.clone();
          caches.open(CACHE).then(function (c) { c.put(req, clon); });
        }
        return r;
      });
    })
  );
});
