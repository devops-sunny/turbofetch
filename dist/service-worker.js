const CACHE_NAME = 'api-cache-v1';

self.addEventListener('install', (event) => {
    console.log('Service Worker installed');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(['/offline.html'])
                .catch((error) => {
                    console.error('Failed to cache offline page:', error);
                });
        })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName)
                            .catch((error) => {
                                console.error('Failed to delete old cache:', error);
                            });
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseToCache)
                                    .catch((error) => {
                                        console.error('Failed to cache new response:', error);
                                    });
                            });
                        }
                        return networkResponse;
                    })
                    .catch((error) => {
                        console.error('Fetch failed:', error);
                        return caches.match('/offline.html');
                    });
            })
            .catch((error) => {
                console.error('Cache match failed:', error);
                return caches.match('/offline.html');
            })
    );
});

self.addEventListener('message', (event) => {
    if (event.data.type === 'CACHE_URL') {
        event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.add(event.data.url)
                    .catch((error) => {
                        console.error('Failed to cache URL:', error);
                    });
            })
        );
    }
});
