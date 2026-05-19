'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { DateRange } from '@/lib/dates'

const PRESETS: { key: string; label: string }[] = [
  { key: 'today', label: 'Bugün' },
  { key: 'yesterday', label: 'Dün' },
  { key: 'week', label: 'Bu hafta' },
  { key: 'month', label: 'Bu ay' },
]

export default function RangePicker({ current }: { current: DateRange }) {
  const router = useRouter()
  const params = useSearchParams()
  const [showCustom, setShowCustom] = useState(current.key === 'custom')
  const [from, setFrom] = useState(current.fromYmd)
  const [to, setTo] = useState(current.toYmd)

  function pick(key: string) {
    const p = new URLSearchParams(params.toString())
    p.set('range', key)
    p.delete('from')
    p.delete('to')
    router.push(`?${p.toString()}`)
    setShowCustom(false)
  }

  function applyCustom() {
    if (!from || !to || from > to) return
    const p = new URLSearchParams()
    p.set('range', 'custom')
    p.set('from', from)
    p.set('to', to)
    router.push(`?${p.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESETS.map((preset) => (
        <button
          key={preset.key}
          onClick={() => pick(preset.key)}
          className={cn(
            'h-9 px-3.5 rounded-full text-sm font-semibold transition',
            current.key === preset.key
              ? 'bg-zinc-900 text-white shadow-sm'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
          )}
        >
          {preset.label}
        </button>
      ))}
      <button
        onClick={() => setShowCustom((s) => !s)}
        className={cn(
          'h-9 px-3.5 rounded-full text-sm font-semibold transition',
          current.key === 'custom' || showCustom
            ? 'bg-zinc-900 text-white'
            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
        )}
      >
        Özel
      </button>
      {showCustom && (
        <div className="flex items-center gap-1.5 ml-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 px-2 rounded-lg border border-zinc-300 text-sm bg-white"
          />
          <span className="text-zinc-400">–</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 px-2 rounded-lg border border-zinc-300 text-sm bg-white"
          />
          <button
            onClick={applyCustom}
            className="h-9 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold shadow-sm"
          >
            Uygula
          </button>
        </div>
      )}
    </div>
  )
}
