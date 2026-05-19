'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const BEEP_INTERVAL_MS = 20_000 // daha sık tekrar — gözden kaçırma riski azalsın

// ---------- Audio ----------

let audioCtx: AudioContext | null = null
let audioPrimed = false

function ensureAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
  if (!Ctx) return null
  if (!audioCtx) {
    audioCtx = new Ctx()
  }
  return audioCtx
}

function primeAudio() {
  const ctx = ensureAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
  if (!audioPrimed) {
    try {
      const buf = ctx.createBuffer(1, 1, 22050)
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(ctx.destination)
      src.start(0)
      audioPrimed = true
    } catch {}
  }
}

/** Agresif alarm: 6 hızlı bing, alternatif yüksek frekanslar, yüksek volume */
export function playAlarm() {
  const ctx = ensureAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  try {
    const t0 = ctx.currentTime
    const bursts = 6
    const burstDur = 0.18
    const gap = 0.05
    const step = burstDur + gap

    // Master gain — limiter etkisi için
    const master = ctx.createGain()
    master.gain.value = 0.85
    master.connect(ctx.destination)

    for (let i = 0; i < bursts; i++) {
      const start = t0 + i * step
      // Alternatif tiz frekanslar — siren hissi
      const freq = i % 2 === 0 ? 1200 : 1700

      // İki katman: square (sert) + sine (gövde)
      const oSq = ctx.createOscillator()
      oSq.type = 'square'
      oSq.frequency.value = freq
      const gSq = ctx.createGain()
      gSq.gain.setValueAtTime(0.0001, start)
      gSq.gain.exponentialRampToValueAtTime(0.45, start + 0.015)
      gSq.gain.exponentialRampToValueAtTime(0.0001, start + burstDur - 0.01)
      oSq.connect(gSq)
      gSq.connect(master)
      oSq.start(start)
      oSq.stop(start + burstDur)

      const oSi = ctx.createOscillator()
      oSi.type = 'sine'
      oSi.frequency.value = freq
      const gSi = ctx.createGain()
      gSi.gain.setValueAtTime(0.0001, start)
      gSi.gain.exponentialRampToValueAtTime(0.55, start + 0.012)
      gSi.gain.exponentialRampToValueAtTime(0.0001, start + burstDur - 0.005)
      oSi.connect(gSi)
      gSi.connect(master)
      oSi.start(start)
      oSi.stop(start + burstDur)
    }
  } catch (e) {
    console.warn('playAlarm failed:', e)
  }
}

// ---------- Notification ----------

function showOrderNotification(count: number) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  // Tab görünür durumdaysa (kullanıcı zaten bakıyor) bildirim gönderme
  if (document.visibilityState === 'visible') return
  try {
    const n = new Notification('🧁 Yeni sipariş bekliyor', {
      body: `${count} sipariş onayını bekliyor`,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'pending-order', // aynı tag → eski bildirim üzerine yazar, yığılmaz
      requireInteraction: true,
      silent: false,
    })
    n.onclick = () => {
      window.focus()
      window.location.href = '/pending'
      n.close()
    }
  } catch {}
}

// ---------- Component ----------

export default function PendingBell() {
  const [count, setCount] = useState(0)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>('default')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevCountRef = useRef(0)
  const pathname = usePathname()

  // İlk yüklemede notification durumunu oku
  useEffect(() => {
    if (typeof Notification === 'undefined') {
      setNotifPerm('unsupported')
      return
    }
    setNotifPerm(Notification.permission)
  }, [])

  // Audio prime — ilk dokunmada açılır
  useEffect(() => {
    function onInteraction() {
      primeAudio()
      const ctx = ensureAudioContext()
      if (ctx && ctx.state === 'running') {
        setAudioBlocked(false)
      }
    }
    const ctx = ensureAudioContext()
    setAudioBlocked(!!ctx && ctx.state !== 'running')

    document.addEventListener('click', onInteraction, true)
    document.addEventListener('touchstart', onInteraction, true)
    document.addEventListener('keydown', onInteraction, true)
    return () => {
      document.removeEventListener('click', onInteraction, true)
      document.removeEventListener('touchstart', onInteraction, true)
      document.removeEventListener('keydown', onInteraction, true)
    }
  }, [])

  // Pending sayısı + realtime
  useEffect(() => {
    const sb = supabaseBrowser()
    let cancelled = false
    let debounce: ReturnType<typeof setTimeout> | null = null

    async function refresh() {
      const { count: c } = await sb
        .from('pending_orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .gte('expires_at', new Date().toISOString())
      if (cancelled) return
      setCount(c ?? 0)
    }
    refresh()

    function schedule() {
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(refresh, 200)
    }

    const ch = sb
      .channel('pending-bell')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pending_orders' },
        schedule,
      )
      .subscribe()

    const slow = setInterval(refresh, 30_000)

    return () => {
      cancelled = true
      if (debounce) clearTimeout(debounce)
      sb.removeChannel(ch)
      clearInterval(slow)
    }
  }, [])

  // count > 0 olduğu sürece alarm çal (her 20 sn)
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    // Yeni sipariş geldiyse browser notification
    if (count > prevCountRef.current && count > 0) {
      showOrderNotification(count)
    }
    prevCountRef.current = count

    if (count > 0) {
      playAlarm()
      intervalRef.current = setInterval(playAlarm, BEEP_INTERVAL_MS)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [count])

  function testSound() {
    primeAudio()
    playAlarm()
    const ctx = ensureAudioContext()
    setAudioBlocked(!!ctx && ctx.state !== 'running')
  }

  function requestNotif() {
    if (typeof Notification === 'undefined') return
    Notification.requestPermission()
      .then((p) => {
        setNotifPerm(p)
        if (p === 'granted') {
          // Tek seferlik onay bildirimi
          try {
            new Notification('Bildirimler açıldı', {
              body: 'Yeni sipariş geldiğinde uyarı alacaksınız',
              icon: '/icons/icon-192.png',
            })
          } catch {}
        }
      })
      .catch(() => {})
  }

  return (
    <div className="flex items-center gap-1">
      {/* Notification permission request — sadece henüz sorulmadıysa */}
      {notifPerm === 'default' && (
        <button
          onClick={requestNotif}
          title="Tarayıcı bildirimlerini aç"
          className="px-2 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200"
        >
          🔔 İzin
        </button>
      )}

      {/* Audio test / status */}
      <button
        onClick={testSound}
        title={
          audioBlocked
            ? 'Bildirim sesi kilitli — açmak için dokun'
            : 'Bildirim sesini test et'
        }
        className={cn(
          'px-2 py-1.5 rounded-lg text-xs',
          audioBlocked
            ? 'font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200'
            : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100',
        )}
      >
        {audioBlocked ? '🔇 Ses' : '🔊'}
      </button>

      {count === 0 ? (
        <Link
          href="/pending"
          className={cn(
            'relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition',
            pathname === '/pending'
              ? 'text-brand-700 bg-brand-50'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100',
          )}
        >
          🔔 Bekleyen
        </Link>
      ) : (
        <Link
          href="/pending"
          className="relative px-3.5 py-1.5 rounded-lg text-sm font-bold bg-red-100 text-red-800 hover:bg-red-200 inline-flex items-center gap-1.5 bell-pulse"
        >
          <span className="text-base leading-none">🔔</span>
          <span>Bekleyen</span>
          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white text-xs font-bold tabular-nums">
            {count}
          </span>
        </Link>
      )}
    </div>
  )
}
