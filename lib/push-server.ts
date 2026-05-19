import 'server-only'
import webpush from 'web-push'
import { supabaseAdmin } from '@/lib/supabase/server'

let vapidConfigured = false

function configureVapid() {
  if (vapidConfigured) return true
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!pub || !priv || !subject) return false
  webpush.setVapidDetails(subject, pub, priv)
  vapidConfigured = true
  return true
}

export type PushPayload = {
  title: string
  body: string
  url?: string
  tag?: string
}

/**
 * Tüm aktif subscription'lara push gönderir. 410/404 alırsa subscription'ı temizler.
 * VAPID anahtarları yoksa sessizce no-op.
 */
export async function sendPushToAll(payload: PushPayload): Promise<void> {
  if (!configureVapid()) {
    console.warn('VAPID keys not set, push notifications disabled')
    return
  }

  const sb = supabaseAdmin()
  const { data: subs, error } = await sb
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
  if (error) {
    console.warn('Failed to fetch push subscriptions:', error)
    return
  }
  if (!subs || subs.length === 0) return

  const data = JSON.stringify(payload)

  const results = await Promise.allSettled(
    subs.map((s: any) =>
      webpush.sendNotification(
        {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        },
        data,
        {
          TTL: 120,
          urgency: 'high', // iOS: cihaz uykudaysa hemen uyandır
          topic: 'pending', // 32 char max — aynı topic'teki eski bildirim yerini alır
        },
      ),
    ),
  )

  // Geçersiz subscription'ları temizle (410 Gone, 404 Not Found)
  const stale: string[] = []
  results.forEach((r, idx) => {
    if (r.status === 'rejected') {
      const code = (r.reason as any)?.statusCode
      if (code === 410 || code === 404) {
        stale.push(subs[idx].endpoint)
      } else {
        console.warn('Push delivery failed:', code, (r.reason as any)?.body ?? r.reason)
      }
    }
  })
  if (stale.length > 0) {
    await sb.from('push_subscriptions').delete().in('endpoint', stale)
  }
}
