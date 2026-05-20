'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type LockState = 'on' | 'off' | 'unsupported'

export default function WakeLockButton() {
  const [state, setState] = useState<LockState>('off')
  const sentinelRef = useRef<WakeLockSentinel | null>(null)
  const wantLockRef = useRef(true) // kullanıcı kapatmadıkça hep açık olsun

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('wakeLock' in navigator)) {
      setState('unsupported')
      return
    }

    let cancelled = false

    async function acquire() {
      if (!wantLockRef.current) return
      if (document.visibilityState !== 'visible') return
      if (sentinelRef.current) return // zaten var
      try {
        const s = await (navigator as any).wakeLock.request('screen')
        if (cancelled) {
          s.release().catch(() => {})
          return
        }
        sentinelRef.current = s
        setState('on')
        s.addEventListener('release', () => {
          sentinelRef.current = null
          // Hâlâ istiyorsak ve sayfa görünürse tekrar al
          if (wantLockRef.current && document.visibilityState === 'visible') {
            setState('off')
            acquire()
          } else {
            setState('off')
          }
        })
      } catch {
        setState('off')
      }
    }

    // İlk al
    acquire()

    // Sayfa tekrar görünür olunca (background → foreground) tekrar al
    function onVisible() {
      if (document.visibilityState === 'visible') acquire()
    }
    document.addEventListener('visibilitychange', onVisible)
    // Bazı tarayıcılarda focus da iyi bir tetikleyici
    window.addEventListener('focus', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      sentinelRef.current?.release().catch(() => {})
      sentinelRef.current = null
    }
  }, [])

  async function toggle() {
    if (state === 'on') {
      wantLockRef.current = false
      await sentinelRef.current?.release().catch(() => {})
      sentinelRef.current = null
      setState('off')
    } else {
      wantLockRef.current = true
      if (!('wakeLock' in navigator)) return
      try {
        const s = await (navigator as any).wakeLock.request('screen')
        sentinelRef.current = s
        setState('on')
        s.addEventListener('release', () => {
          sentinelRef.current = null
          setState('off')
          if (wantLockRef.current && document.visibilityState === 'visible') {
            ;(navigator as any).wakeLock
              .request('screen')
              .then((ns: WakeLockSentinel) => {
                sentinelRef.current = ns
                setState('on')
              })
              .catch(() => {})
          }
        })
      } catch {
        setState('off')
      }
    }
  }

  if (state === 'unsupported') return null

  return (
    <button
      onClick={toggle}
      title={
        state === 'on'
          ? 'Ekran sürekli açık (dokun → kapat)'
          : 'Ekran uykuya geçebilir (dokun → açık tut)'
      }
      className={cn(
        'px-2 py-1.5 rounded-lg text-xs transition',
        state === 'on'
          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
          : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100',
      )}
    >
      {state === 'on' ? '☀️' : '🌙'}
    </button>
  )
}
