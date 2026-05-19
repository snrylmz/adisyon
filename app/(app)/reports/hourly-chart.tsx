'use client'

import { useState } from 'react'
import { formatTRY, cn } from '@/lib/utils'

type Hour = { hour: number; revenue: number; count: number }

export default function HourlyChart({ data, max }: { data: Hour[]; max: number }) {
  const [hover, setHover] = useState<number | null>(null)
  // Sadece açık saatleri göster (bir veri var mı yoksa)
  const hasData = data.some((d) => d.revenue > 0)
  const range = hasData
    ? data.slice(
        Math.max(0, data.findIndex((d) => d.revenue > 0) - 1),
        Math.min(24, [...data].reverse().findIndex((d) => d.revenue > 0) === -1
          ? 24
          : 24 - [...data].reverse().findIndex((d) => d.revenue > 0) + 1),
      )
    : data.slice(8, 23)

  const slice = range.length > 0 ? range : data.slice(8, 23)
  const peak = slice.find((h) => hover === h.hour) ?? slice.find((h) => h.revenue === Math.max(...slice.map((s) => s.revenue)))

  return (
    <div>
      <div className="flex items-end gap-1.5 h-44">
        {slice.map((h) => {
          const pct = max > 0 ? (h.revenue / max) * 100 : 0
          const isPeak = peak?.hour === h.hour
          return (
            <div
              key={h.hour}
              className="flex-1 flex flex-col items-center gap-1 group cursor-default"
              onMouseEnter={() => setHover(h.hour)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="w-full h-full flex items-end">
                <div
                  className={cn(
                    'w-full rounded-t-md transition-all duration-300',
                    h.revenue === 0
                      ? 'bg-zinc-100'
                      : isPeak
                        ? 'bg-gradient-to-t from-brand-600 to-brand-400'
                        : 'bg-gradient-to-t from-brand-500/80 to-brand-400/80 group-hover:from-brand-600 group-hover:to-brand-500',
                  )}
                  style={{ height: `${Math.max(4, pct)}%` }}
                  title={`${h.hour}:00 – ${formatTRY(h.revenue)} (${h.count} adisyon)`}
                />
              </div>
              <div
                className={cn(
                  'text-[10px] tabular-nums font-medium',
                  isPeak ? 'text-brand-700' : 'text-zinc-400',
                )}
              >
                {h.hour}
              </div>
            </div>
          )
        })}
      </div>
      {peak && peak.revenue > 0 && (
        <div className="mt-3 text-xs text-zinc-500">
          <span className="font-semibold text-zinc-900 tabular-nums">{peak.hour}:00</span> ·{' '}
          <span className="tabular-nums">{formatTRY(peak.revenue)}</span>
          <span className="opacity-50"> · </span>
          <span>{peak.count} adisyon</span>
        </div>
      )}
    </div>
  )
}
