const CACHE_NAME = 'kalina-ai-cache-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './index.tsx'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                // Use a separate request to avoid caching issues with service worker script itself
                const cachePromises = ASSETS_TO_CACHE.map(assetUrl => {
                    return cache.add(assetUrl).catch(err => {
                        console.warn(`Failed to cache ${assetUrl}:`, err);
                    });
                });
                return Promise.all(cachePromises);
            })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    // For navigation and local assets, try cache first.
    // This strategy is simple and effective for app shell caching.
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // Not in cache - fetch from network
                return fetch(event.request);
            })
    );
});