/* service-worker.js — ELHADY PWA (MD3 Update) */

const CACHE_NAME = "elhady-md-v1";
const ASSETS = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.json",
    "./icon.png",
    "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
];

/* Install: Cache core assets */
self.addEventListener("install", evt => {
    evt.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log("Caching assets...");
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting(); // Force this SW to become active immediately
});

/* Activate: Clean up old caches (removes the old Glass theme cache) */
self.addEventListener("activate", evt => {
    evt.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null)
        ))
    );
    self.clients.claim();
});

/* Fetch: Network first, fall back to cache (or Stale-While-Revalidate) */
self.addEventListener("fetch", evt => {
    evt.respondWith(
        fetch(evt.request).then(resp => {
            // Update cache with new version if network is available
            const cloned = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(evt.request, cloned));
            return resp;
        }).catch(() => {
            // If offline, serve from cache
            return caches.match(evt.request);
        })
    );
});