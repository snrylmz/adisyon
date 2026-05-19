'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const BEEP_INTERVAL_MS = 30_000

// Kısa "bing" sesi - Web Audio ile generate ediyoruz, dosya gerekmiyor
function playBeep() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    const ctx: AudioContext = new Ctx()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g)
    g.connect(ctx.destination)
    o.frequency.value = 880
    o.type = 'sine'
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5)
    o.start(ctx.currentTime)
    o.stop(ctx.currentTime + 0.55)
    // İkinci ton — biraz daha tiz, "ding ding" hissi
    const o2 = ctx.createOscillator()
    const g2 = ctx.createGain()
    o2.connect(g2)
    g2.connect(ctx.destination)
    o2.frequency.value = 1320
    o2.type = 'sine'
    g2.gain.setValueAtTime(0.0001, ctx.currentTime + 0.15)
    g2.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.17)
    g2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6)
    o2.start(ctx.currentTime + 0.15)
    o2.stop(ctx.currentTime + 0.65)
  } catch {
    // sessiz başarısızlık
  }
}

export default function PendingBell() {
  const [count, setCount] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pathname = usePathname()

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

    // Her 30 sn'de bir refresh (expiry için)
    const slow = setInterval(refresh, 30_000)

    return () => {
      cancelled = true
      if (debounce) clearTimeout(debounce)
      sb.removeChannel(ch)
      clearInterval(slow)
    }
  }, [])

  // Sesli alarm — count > 0 olduğu sürece her 30 sn'de bir çalsın
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (count > 0 && pathname !== '/pending') {
      // İlk anda çal, sonra interval
      playBeep()
      intervalRef.current = setInterval(playBeep, BEEP_INTERVAL_MS)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [count, pathname])

  if (count === 0) {
    return (
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
    )
  }

  return (
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
  )
}
