'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const BEEP_INTERVAL_MS = 30_000

// Tek bir global AudioContext — kullanıcı etkileşimi ile prime ediliyor
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
    // No-op sessiz buffer çalıyoruz — iOS bunu user-gesture'a bağlı initialize için ister
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

export function playBeep() {
  const ctx = ensureAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
  try {
    const t = ctx.currentTime
    // İlk ton: 880 Hz
    const o1 = ctx.createOscillator()
    const g1 = ctx.createGain()
    o1.connect(g1)
    g1.connect(ctx.destination)
    o1.frequency.value = 880
    o1.type = 'sine'
    g1.gain.setValueAtTime(0.0001, t)
    g1.gain.exponentialRampToValueAtTime(0.4, t + 0.02)
    g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
    o1.start(t)
    o1.stop(t + 0.55)
    // İkinci ton: 1320 Hz (üst oktav)
    const o2 = ctx.createOscillator()
    const g2 = ctx.createGain()
    o2.connect(g2)
    g2.connect(ctx.destination)
    o2.frequency.value = 1320
    o2.type = 'sine'
    g2.gain.setValueAtTime(0.0001, t + 0.15)
    g2.gain.exponentialRampToValueAtTime(0.35, t + 0.17)
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
    o2.start(t + 0.15)
    o2.stop(t + 0.65)
  } catch (e) {
    console.warn('playBeep failed:', e)
  }
}

export default function PendingBell() {
  const [count, setCount] = useState(0)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pathname = usePathname()

  // Sayfa açılır açılmaz audio prime için global click/touch listener
  useEffect(() => {
    function onInteraction() {
      primeAudio()
      const ctx = ensureAudioContext()
      if (ctx && ctx.state === 'running') {
        setAudioBlocked(false)
      }
    }
    // Ses durumunu başlangıçta kontrol et
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

  // count > 0 ise her 30 sn'de çal
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (count > 0) {
      playBeep()
      intervalRef.current = setInterval(playBeep, BEEP_INTERVAL_MS)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [count])

  function testSound() {
    primeAudio()
    playBeep()
    const ctx = ensureAudioContext()
    setAudioBlocked(!!ctx && ctx.state !== 'running')
  }

  return (
    <div className="flex items-center gap-1">
      {audioBlocked && (
        <button
          onClick={testSound}
          title="Bildirim sesi kapalı görünüyor — açmak için tıklayın"
          className="px-2 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200"
        >
          🔇 Ses
        </button>
      )}
      {!audioBlocked && (
        <button
          onClick={testSound}
          title="Bildirim sesini test et"
          className="px-2 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
        >
          🔊
        </button>
      )}
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
