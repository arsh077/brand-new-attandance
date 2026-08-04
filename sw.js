const CACHE_NAME = 'legal-success-app-v2'; // Bumped version
const DYNAMIC_CACHE = 'legal-success-dynamic-v2';

// Install Event
self.addEventListener('install', (event) => {
    console.log('✅ Service Worker: Installed');
    self.skipWaiting(); // Force update
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Pre-cache essential assets
            return cache.addAll([
                '/',
                '/index.html',
                '/assets/logo.png'
            ]).catch(err => {
                console.warn('⚠️ Pre-caching failed:', err);
            });
        })
    );
});

// Activate Event
self.addEventListener('activate', (event) => {
    console.log('✅ Service Worker: Activated');
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME && key !== DYNAMIC_CACHE)
                    .map((key) => caches.delete(key))
            );
        })
    );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests (like Firebase) from caching logic if needed, 
    // but caching them might be okay if CORS allows. 
    // Firebase SDK handles its own offline persistence, so we can let those pass through or cache network-first.

    if (event.request.url.includes('firestore.googleapis.com')) {
        return; // Let Firebase SDK handle Firestore requests
    }

    // Network First Strategy for HTML/API (fall back to cache)
    event.respondWith(
        fetch(event.request)
            .then((fetchRes) => {
                return caches.open(DYNAMIC_CACHE).then((cache) => {
                    // Cache successful GET requests with http/https schemes only
                    const isHttp = event.request.url.startsWith('http');
                    if (fetchRes.ok && event.request.method === 'GET' && isHttp) {
                        // Clone response because it can only be consumed once
                        cache.put(event.request.url, fetchRes.clone());
                    }
                    return fetchRes;
                });
            })
            .catch(() => {
                // If network fails, try cache
                return caches.match(event.request).then(cachedRes => {
                    if (cachedRes) return cachedRes;
                    // If request was for a page, return index.html (SPA fallback)
                    if (event.request.headers.get('accept').includes('text/html')) {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});
