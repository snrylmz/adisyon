import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import webpush from 'web-push'

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // VAPID config
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!pub || !priv || !subject) {
    return NextResponse.json({
      ok: false,
      reason: 'vapid-missing',
      detail: {
        NEXT_PUBLIC_VAPID_PUBLIC_KEY: !!pub,
        VAPID_PRIVATE_KEY: !!priv,
        VAPID_SUBJECT: !!subject,
      },
    })
  }
  webpush.setVapidDetails(subject, pub, priv)

  const sb = supabaseAdmin()
  const { data: subs } = await sb
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', user.id)

  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: false, reason: 'no-subscriptions' })
  }

  const payload = JSON.stringify({
    title: '🧪 Test bildirim',
    body: `Adisyon · ${user.name} cihazına test push`,
    url: '/pending',
    tag: 'test-push',
  })

  const results: any[] = []
  for (const s of subs as any[]) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { TTL: 30 },
      )
      results.push({ endpoint: s.endpoint.slice(-20), ok: true })
    } catch (e: any) {
      results.push({
        endpoint: s.endpoint.slice(-20),
        ok: false,
        status: e?.statusCode,
        body: e?.body?.slice(0, 200),
      })
    }
  }

  return NextResponse.json({
    ok: true,
    sentTo: subs.length,
    results,
  })
}
