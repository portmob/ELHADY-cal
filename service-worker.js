/* service-worker.js — ELHADY PWA auto-update */

const CACHE_NAME = "elhady-glass-v11";
const ASSETS = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.json",
    "./icon.png",
    "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
    "https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"
];

self.addEventListener("install", evt => {
    evt.waitUntil(caches.open(CACHE_NAME).then(c=> c.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener("activate", evt => {
    evt.waitUntil(
        caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null)))
    );
    self.clients.claim();
});

self.addEventListener("fetch", evt => {
    evt.respondWith(
        fetch(evt.request).then(resp => {
            // update cache in background
            const cloned = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(evt.request, cloned));
            return resp;
        }).catch(()=> caches.match(evt.request))
    );
});

self.addEventListener("message", evt => {
    if (evt.data === "skipWaiting") self.skipWaiting();
});
