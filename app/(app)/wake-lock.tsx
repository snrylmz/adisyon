'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type LockState = 'on' | 'off' | 'unsupported'

export default function WakeLockButton() {
  const [state, setState] = useState<LockState>('off')
  const [sentinel, setSentinel] = useState<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('wakeLock' in navigator)) {
      setState('unsupported')
      return
    }
    // PWA açılır açılmaz otomatik aç
    requestLock()

    // Görünürlük değişince (background → foreground) tekrar al
    function onVisibility() {
      if (document.visibilityState === 'visible' && state !== 'on') {
        requestLock()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function requestLock() {
    try {
      const s = await (navigator as any).wakeLock.request('screen')
      setSentinel(s)
      setState('on')
      s.addEventListener('release', () => {
        setState('off')
        setSentinel(null)
      })
    } catch (e) {
      console.warn('WakeLock request failed:', e)
      setState('off')
    }
  }

  async function releaseLock() {
    try {
      await sentinel?.release()
    } catch {}
    setSentinel(null)
    setState('off')
  }

  function toggle() {
    if (state === 'on') {
      releaseLock()
    } else if (state === 'off') {
      requestLock()
    }
  }

  if (state === 'unsupported') {
    return null
  }

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
