// ArborSuite service worker.
// v2: the app shell (HTML) is NETWORK-FIRST so a new deploy always loads.
// The old v1 was cache-first on '/', which served a stale index.html pointing
// at a deleted JS bundle -> blank screen that wouldn't load. Only immutable
// hashed /assets/* files are cached.
const CACHE = 'arborsuite-v2'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  // API: never cached — let it hit the network (SW stays out of the way).
  if (url.pathname.startsWith('/api/')) return

  // App shell / navigations: NETWORK-FIRST. Always try the live page; only fall
  // back to a cached copy when actually offline.
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          const clone = resp.clone()
          caches.open(CACHE).then((c) => c.put(request, clone))
          return resp
        })
        .catch(() => caches.match(request).then((c) => c || caches.match('/')))
    )
    return
  }

  // Immutable hashed build assets: cache-first is safe (filenames change per build).
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ||
        fetch(request).then((resp) => {
          if (resp.ok) {
            const clone = resp.clone()
            caches.open(CACHE).then((c) => c.put(request, clone))
          }
          return resp
        })
      )
    )
    return
  }

  // Everything else: network, fall back to cache if offline.
  event.respondWith(fetch(request).catch(() => caches.match(request)))
})
