const CACHE_NAME = 'dnd-reference-v1';
const CACHE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/styles.css',
    '/script.js',
    '/icon-192x192.png',
    '/icon-512x512.png'
];

// Install event: Cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching static assets');
                return cache.addAll(CACHE_ASSETS);
            })
            .catch(error => {
                console.error('Cache installation failed:', error);
            })
    );
    
    // Force the waiting service worker to become active
    self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
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
        .then(() => {
            // Claim all clients to start controlling them immediately
            return self.clients.claim();
        })
    );
});

// Fetch event: Network-first strategy with cache fallback
self.addEventListener('fetch', event => {
    // Ignore non-GET requests and chrome extensions
    if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // If the fetch is successful, clone the response
                const responseClone = response.clone();
                
                // Try to cache the network response
                caches.open(CACHE_NAME).then(cache => {
                    // Only cache successful responses
                    if (response.ok && event.request.method === 'GET') {
                        cache.put(event.request, responseClone);
                    }
                });
                
                return response;
            })
            .catch(() => {
                // If network fails, check cache 
                return caches.match(event.request)
                    .then(response => {
                        if (response) {
                            return response;
                        }
                        // If no cache match, return offline fallback
                        return caches.match('/error.html');
                    })
            })
    );
});

