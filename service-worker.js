const CACHE_NAME = 'elhady-cal-cache-v1';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './icon.png',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js',
    'https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(resp => resp || fetch(e.request))
    );
});
