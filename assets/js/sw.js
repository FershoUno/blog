/* ============================================
   Debian MicroNews - Service Worker
   Estrategia: Cache First con actualización
   ============================================ */

var CACHE_NAME = 'debian-micronews-v1';
var OFFLINE_URL = '/blog/offline.html';

var PRECACHE_URLS = [
  '/blog/',
  '/blog/assets/css/style.css',
  '/blog/assets/js/app.js',
  '/blog/offline.html',
  '/blog/data/posts.json',
  '/blog/version.json'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key !== CACHE_NAME;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;

  if (request.method !== 'GET') return;

  if (request.url.indexOf('/blog/data/') !== -1 || request.url.indexOf('/blog/version.json') !== -1) {
    event.respondWith(
      caches.open(CACHE_NAME).then(function (cache) {
        return fetch(request).then(function (response) {
          cache.put(request, response.clone());
          return response;
        }).catch(function () {
          return caches.match(request);
        });
      })
    );
    return;
  }

  if (request.url.indexOf('/blog/') !== -1) {
    event.respondWith(
      caches.match(request).then(function (cached) {
        var fetchPromise = fetch(request).then(function (response) {
          if (response && response.status === 200) {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(request, copy);
            });
          }
          return response;
        }).catch(function () {
          return caches.match(OFFLINE_URL);
        });

        return cached || fetchPromise;
      })
    );
    return;
  }
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
