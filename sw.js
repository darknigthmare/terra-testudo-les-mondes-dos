const CACHE = 'terra-testudo-v1.1.0';
const FILES = [
  './', './index.html', './styles.css', './manifest.webmanifest', './assets/icon.svg', './assets/terra-testudo-title-art.png',
  './src/main.js', './src/data.js', './src/state.js', './src/render.js', './src/audio.js', './src/icons.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const freshFirst = request.mode === 'navigate' || ['document', 'script', 'style'].includes(request.destination);
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (freshFirst) {
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return (await cache.match(request)) || (await cache.match('./index.html'));
      }
    }
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      return cache.match('./index.html');
    }
  })());
});
