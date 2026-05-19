// Adisyon — Service Worker for Web Push notifications

self.addEventListener('install', (event) => {
  // Yeni SW hemen aktif olsun
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {
    title: 'Yeni sipariş',
    body: 'Bir müşteri sipariş gönderdi',
    url: '/pending',
    tag: 'pending-order',
  }
  try {
    if (event.data) {
      const parsed = event.data.json()
      data = { ...data, ...parsed }
    }
  } catch (e) {
    // payload metin gelmiş olabilir
    try {
      if (event.data) data.body = event.data.text()
    } catch {}
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag,
    requireInteraction: true,
    renotify: true,
    vibrate: [300, 100, 300, 100, 300],
    data: { url: data.url },
    actions: [{ action: 'view', title: 'Aç' }],
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/pending'

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      // Açık bir window varsa onu fokus + yönlendir
      for (const client of allClients) {
        if ('focus' in client) {
          try {
            await client.focus()
            if ('navigate' in client) {
              await client.navigate(url)
            }
            return
          } catch {}
        }
      }
      // Açık değilse yeni pencere
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })(),
  )
})
