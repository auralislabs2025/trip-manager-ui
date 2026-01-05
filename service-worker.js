// Service Worker for PWA Offline Support

const CACHE_NAME = 'truck-management-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/trips.html',
    '/trip-detail.html',
    '/reports.html',
    '/css/styles.css',
    '/css/login.css',
    '/css/dashboard.css',
    '/css/components.css',
    '/js/utils.js',
    '/js/storage.js',
    '/js/auth.js',
    '/js/calculations.js',
    '/js/dashboard.js',
    '/js/trips.js',
    '/js/trip-detail.js',
    '/js/reports.js',
    '/js/pwa.js',
    '/manifest.json',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('Cache installation failed:', error);
            })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                
                // Clone the request
                const fetchRequest = event.request.clone();
                
                return fetch(fetchRequest).then((response) => {
                    // Check if valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Clone the response
                    const responseToCache = response.clone();
                    
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                }).catch(() => {
                    // Network request failed - return offline page if available
                    if (event.request.destination === 'document') {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});

// Background sync (for future use)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-trips') {
        event.waitUntil(syncTrips());
    }
});

function syncTrips() {
    // Future: Sync trips with backend
    return Promise.resolve();
}

// Push notification (for future use)
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'New notification',
        icon: '/assets/images/icon-192.png',
        badge: '/assets/images/icon-192.png',
        vibrate: [200, 100, 200],
        tag: 'truck-management-notification'
    };
    
    event.waitUntil(
        self.registration.showNotification('Trip Tracker', options)
    );
});

// Notification click (for future use)
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow('/dashboard.html')
    );
});

