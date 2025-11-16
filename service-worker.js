const CACHE_NAME = 'elhady-cal-cache-v1';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icon.png',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js',
    'https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js'
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request).catch(()=>caches.match('./index.html')))
    );
});
