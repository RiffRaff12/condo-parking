const CACHE = 'parkitjiran-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

// Push handler — implementation completed in #8 (push notification infrastructure)
self.addEventListener('push', (e) => {
  if (!e.data) return
  const { title, body } = e.data.json()
  e.waitUntil(
    self.registration.showNotification(title, { body, icon: '/icons/icon-192.png' })
  )
})
