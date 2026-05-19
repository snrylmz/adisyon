// Adisyon — Service Worker for Web Push notifications
// iOS PWA uyumlu: minimal Notification opsiyonları kullanıyor.

const SW_VERSION = '4'

self.addEventListener('install', (event) => {
  console.log('[SW] install', SW_VERSION)
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW] activate', SW_VERSION)
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  console.log('[SW] push received')
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
    try {
      if (event.data) data.body = event.data.text()
    } catch {}
  }

  // Minimal options — iOS PWA Web Push uyumlu
  // requireInteraction, actions, vibrate, renotify, image gibi alanlar
  // iOS'ta DESTEKLENMEZ. Eklendiğinde bildirim sessizce düşürülüyor.
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    tag: data.tag,
    data: { url: data.url },
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options).catch((e) => {
      console.error('[SW] showNotification failed:', e)
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] notificationclick')
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/pending'

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      for (const client of allClients) {
        if ('focus' in client) {
          try {
            await client.focus()
            if ('navigate' in client) {
              await client.navigate(url).catch(() => {})
            }
            return
          } catch {}
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })(),
  )
})
