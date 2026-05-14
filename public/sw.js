const VERSION = 'v1';
const CACHE = `animelegacy-${VERSION}`;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (request.mode !== 'navigate') return;
  event.respondWith(
    fetch(request).catch(
      () =>
        new Response(
          '<!doctype html><meta charset="utf-8"><title>Offline</title><body style="background:#0b0c10;color:#e6e8ef;font-family:system-ui;padding:48px;text-align:center"><h1>Sem ligação</h1><p>Verifica a tua internet e tenta de novo.</p></body>',
          {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          },
        ),
    ),
  );
});
