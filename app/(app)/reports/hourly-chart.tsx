'use client'

import { useState } from 'react'
import { formatTRY, cn } from '@/lib/utils'

type Hour = { hour: number; revenue: number; count: number }

export default function HourlyChart({ data, max }: { data: Hour[]; max: number }) {
  const [hover, setHover] = useState<number | null>(null)

  // Sadece veri olan ya da pastanenin aktif olduğu saatleri göster (8-22)
  const firstHour = data.findIndex((d) => d.revenue > 0)
  const lastHour = (() => {
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].revenue > 0) return i
    }
    return -1
  })()
  const slice =
    firstHour >= 0 && lastHour >= 0
      ? data.slice(Math.max(0, firstHour - 1), Math.min(24, lastHour + 2))
      : data.slice(8, 23)

  const peakHour = slice.reduce(
    (acc, h) => (h.revenue > acc.revenue ? h : acc),
    slice[0] ?? { hour: 0, revenue: 0, count: 0 },
  )
  const activeHour = hover !== null ? slice.find((h) => h.hour === hover) : null
  const focused = activeHour ?? (peakHour.revenue > 0 ? peakHour : null)

  return (
    <div>
      {/* Y axis hint + Bars */}
      <div className="relative">
        {/* Maks tutar etiketi */}
        {max > 0 && (
          <div className="absolute -top-1 right-0 text-[10px] tabular-nums text-zinc-400 font-medium">
            {formatTRY(max)}
          </div>
        )}

        {/* Bar row */}
        <div className="flex items-end gap-1.5 h-44 mt-4 border-b border-zinc-100">
          {slice.map((h) => {
            const pct = max > 0 ? (h.revenue / max) * 100 : 0
            const isPeak = peakHour.hour === h.hour && peakHour.revenue > 0
            const isHovered = hover === h.hour
            const hasData = h.revenue > 0

            return (
              <div
                key={h.hour}
                onMouseEnter={() => setHover(h.hour)}
                onMouseLeave={() => setHover(null)}
                onTouchStart={() => setHover(h.hour)}
                className="flex-1 h-full flex items-end cursor-default min-w-0"
              >
                <div
                  className={cn(
                    'w-full rounded-t-md transition-all duration-200',
                    !hasData && 'bg-zinc-100',
                    hasData &&
                      !isPeak &&
                      !isHovered &&
                      'bg-gradient-to-t from-brand-400 to-brand-300',
                    hasData && (isPeak || isHovered) && 'bg-gradient-to-t from-brand-600 to-brand-400 shadow-sm shadow-brand-500/30',
                  )}
                  style={{
                    height: hasData ? `${Math.max(3, pct)}%` : '4px',
                  }}
                />
              </div>
            )
          })}
        </div>

        {/* Hour labels */}
        <div className="flex gap-1.5 mt-2">
          {slice.map((h) => {
            const isPeak = peakHour.hour === h.hour && peakHour.revenue > 0
            const isHovered = hover === h.hour
            return (
              <div
                key={h.hour}
                className={cn(
                  'flex-1 text-center text-[10px] tabular-nums font-medium',
                  isPeak || isHovered ? 'text-brand-700 font-bold' : 'text-zinc-400',
                )}
              >
                {h.hour}
              </div>
            )
          })}
        </div>
      </div>

      {/* Focused hour info */}
      {focused && focused.revenue > 0 && (
        <div className="mt-4 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center justify-center w-9 h-7 rounded-md font-bold tabular-nums text-xs',
                hover !== null ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-800',
              )}
            >
              {String(focused.hour).padStart(2, '0')}:00
            </span>
            <span className="text-xs text-zinc-500">
              {hover !== null ? 'Seçili saat' : 'Zirve saat'}
            </span>
          </div>
          <div className="text-right">
            <div className="font-bold tabular-nums text-zinc-900">
              {formatTRY(focused.revenue)}
            </div>
            <div className="text-[10px] text-zinc-500 tabular-nums">
              {focused.count} adisyon
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
