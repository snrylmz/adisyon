import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getZReportBySequence } from '@/lib/db/z-reports'
import { formatDateTimeTR } from '@/lib/dates'
import { formatTRY } from '@/lib/utils'
import PrintButton from './print-button'

export const dynamic = 'force-dynamic'

export default async function ZReportDetailPage({
  params,
}: {
  params: Promise<{ seq: string }>
}) {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'cashier')) redirect('/tables')

  const { seq } = await params
  const seqNo = Number(seq)
  if (!seqNo) notFound()
  const z = await getZReportBySequence(seqNo)
  if (!z) notFound()

  const topProducts = z.top_products ?? []
  const waiterSales = z.waiter_sales ?? []
  const categoryShare = z.category_share ?? []
  const hourly = z.hourly ?? []
  const peak = [...hourly].sort((a, b) => b.revenue - a.revenue)[0]
  const periodMin = Math.max(
    1,
    Math.round((new Date(z.closed_at).getTime() - new Date(z.opened_at).getTime()) / 60000),
  )
  const periodLabel =
    periodMin < 60
      ? `${periodMin} dk`
      : `${Math.floor(periodMin / 60)}sa ${periodMin % 60}dk`

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <Link
        href="/z-reports"
        className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-white border border-zinc-300 hover:bg-zinc-50 active:scale-95 text-sm font-semibold text-zinc-700 shadow-sm transition print:hidden"
      >
        <span className="text-base leading-none">←</span> Z Raporları
      </Link>

      {/* Hero card */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <div className="p-6 bg-gradient-to-br from-brand-50 to-white border-b border-zinc-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wider font-bold text-brand-700">
                Z Raporu
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-zinc-900 mt-1 tabular-nums">
                Z-{String(z.sequence_no).padStart(3, '0')}
              </h1>
              <div className="text-sm text-zinc-500 mt-2">
                {formatDateTimeTR(z.opened_at)} → {formatDateTimeTR(z.closed_at)}
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">
                Süre: {periodLabel} · Kapatan: {z.closed_by_name ?? '—'}
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              ✓ KAPATILDI
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6">
            <Stat label="Ciro" value={formatTRY(z.revenue)} tone="brand" />
            <Stat label="Adisyon" value={String(z.order_count)} />
            <Stat label="Ürün" value={String(z.item_count)} />
            <Stat label="Ort. Adisyon" value={formatTRY(z.avg_ticket)} tone="emerald" />
          </div>
        </div>

        {z.cancelled_count > 0 && (
          <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div className="text-sm text-zinc-700">
              <span className="font-semibold">{z.cancelled_count} iptal adisyon</span>{' '}
              <span className="text-zinc-500">
                · {formatTRY(z.cancelled_amount)} ciroya yansımadı
              </span>
            </div>
          </div>
        )}

        {/* Top products */}
        <div className="p-6 border-b border-zinc-200">
          <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500 mb-4">
            En Çok Satanlar
          </h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-zinc-400">Veri yok</p>
          ) : (
            <ol className="divide-y divide-zinc-100">
              {topProducts.slice(0, 5).map((p, i) => (
                <li key={p.name} className="py-2.5 flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                      i < 3 ? 'bg-brand-600 text-white' : 'bg-zinc-100 text-zinc-500'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-zinc-900 truncate">{p.name}</div>
                    <div className="text-xs text-zinc-500">{p.quantity} adet</div>
                  </div>
                  <div className="font-bold tabular-nums text-zinc-900">
                    {formatTRY(p.revenue)}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Two-col breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-200">
          <div className="p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500 mb-4">
              Kategori Dağılımı
            </h2>
            {categoryShare.length === 0 ? (
              <p className="text-sm text-zinc-400">Veri yok</p>
            ) : (
              <ul className="space-y-2.5">
                {categoryShare.map((c) => {
                  const share = z.revenue > 0 ? (c.revenue / z.revenue) * 100 : 0
                  return (
                    <li key={c.name} className="text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-zinc-700">{c.name}</span>
                        <span className="tabular-nums text-zinc-500">
                          {formatTRY(c.revenue)}{' '}
                          <span className="text-xs text-zinc-400">· {share.toFixed(0)}%</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500 mb-4">
              Personel Performansı
            </h2>
            {waiterSales.length === 0 ? (
              <p className="text-sm text-zinc-400">Veri yok</p>
            ) : (
              <ul className="space-y-2.5">
                {waiterSales.map((w) => {
                  const share = z.revenue > 0 ? (w.revenue / z.revenue) * 100 : 0
                  return (
                    <li key={(w.id ?? 'x') + w.name} className="text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-zinc-700">{w.name}</span>
                        <span className="tabular-nums text-zinc-500">
                          {formatTRY(w.revenue)}{' '}
                          <span className="text-xs text-zinc-400">
                            · {w.orderCount} adisyon
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-full"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Peak hour */}
        {peak && peak.revenue > 0 && (
          <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 text-sm text-zinc-600">
            <span className="text-xs uppercase tracking-wider font-bold text-zinc-500">
              Zirve Saat
            </span>{' '}
            <span className="font-bold text-zinc-900 tabular-nums">{peak.hour}:00</span>{' '}
            <span className="text-zinc-400">·</span>{' '}
            <span className="tabular-nums">{formatTRY(peak.revenue)}</span>{' '}
            <span className="text-zinc-400">·</span> {peak.count} adisyon
          </div>
        )}
      </div>

      <div className="text-center print:hidden">
        <PrintButton />
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'brand' | 'emerald'
}) {
  const tones = {
    brand: 'bg-brand-100 text-brand-900',
    emerald: 'bg-emerald-100 text-emerald-900',
    default: 'bg-white text-zinc-900',
  }
  return (
    <div className={`rounded-xl ${tones[tone ?? 'default']} px-3 py-2.5 ring-1 ring-zinc-200`}>
      <div className="text-[10px] uppercase tracking-wider font-bold opacity-70">{label}</div>
      <div className="text-base font-bold tabular-nums leading-tight mt-0.5">{value}</div>
    </div>
  )
}
