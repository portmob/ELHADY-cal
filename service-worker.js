/* =========================================
   ELHADY PWA — AUTO UPDATE SERVICE WORKER
   ========================================= */

const CACHE_NAME = "elhady-cache-v10";   // IMPORTANT: change version when needed
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon.png",
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
  "https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js",
  "https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js"
];

/* INSTALL — cache app shell */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting(); // activate immediately
});

/* ACTIVATE — delete old caches */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim(); // control all tabs
});

/* FETCH — Network First, fallback to cache */
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // clone response and update cache
        const resClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

/* AUTO UPDATE NOTIFICATION */
self.addEventListener("message", event => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
