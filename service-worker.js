const CACHE_NAME = "fretboard-cache-v1.1";
const urlsToCache = [
  "./",                // racine
  "./index.html",      // page principale
  "./css/style.css",   // CSS
  "./js/script.js",    // JS
  "./images/fretboard13.svg",
  "./images/fretboard16.svg",
  "./images/fretboard20.svg",
  "./images/icon-192.png",
  "./images/icon-512.png"
];

// Installation du service worker
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interception des requêtes pour servir le cache hors ligne
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Retourne la réponse du cache si disponible, sinon fetch réseau
      return response || fetch(event.request);
    })
  );
});
