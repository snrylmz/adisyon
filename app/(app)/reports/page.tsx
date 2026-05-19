import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { buildReport } from '@/lib/db/reports'
import { resolveRange } from '@/lib/dates'
import { formatTRY } from '@/lib/utils'
import RangePicker from './range-picker'
import HourlyChart from './hourly-chart'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'cashier')) redirect('/tables')

  const params = await searchParams
  const range = resolveRange(params)
  const report = await buildReport(range)

  const maxHourly = Math.max(1, ...report.hourly.map((h) => h.revenue))
  const maxCategory = Math.max(1, ...report.categoryShare.map((c) => c.revenue))
  const maxWaiter = Math.max(1, ...report.waiterSales.map((w) => w.revenue))

  return (
    <div>
      {/* Hero */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Rapor</h1>
              <p className="text-sm text-zinc-500 mt-1">{range.label}</p>
            </div>
            <RangePicker current={range} />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Top stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatBig label="Ciro" value={formatTRY(report.revenue)} tone="brand" />
          <StatBig label="Adisyon" value={report.orderCount.toString()} tone="zinc" />
          <StatBig label="Satılan Ürün" value={report.itemCount.toString()} tone="zinc" />
          <StatBig
            label="Ort. Adisyon"
            value={formatTRY(report.avgTicket)}
            tone="emerald"
          />
        </div>

        {report.cancelledCount > 0 && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-lg">
              ⚠️
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-zinc-900">
                {report.cancelledCount} iptal adisyon
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                Toplam{' '}
                <span className="tabular-nums font-semibold text-zinc-700">
                  {formatTRY(report.cancelledAmount)}
                </span>{' '}
                tutarındaki adisyonlar iptal edildi · ciroya yansımadı
              </div>
            </div>
            <Link
              href={`/orders?range=${range.key}${
                range.key === 'custom' ? `&from=${range.fromYmd}&to=${range.toYmd}` : ''
              }`}
              className="hidden sm:inline-flex h-9 px-3 items-center bg-white border border-zinc-300 hover:bg-zinc-50 rounded-lg text-xs font-semibold text-zinc-700 transition"
            >
              İncele →
            </Link>
          </div>
        )}

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Hourly */}
          <section className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500 mb-4">
              Saatlik Ciro
            </h2>
            {report.revenue === 0 ? (
              <EmptyChart label="Bu aralıkta veri yok" />
            ) : (
              <HourlyChart data={report.hourly} max={maxHourly} />
            )}
          </section>

          {/* Categories */}
          <section className="bg-white rounded-2xl border border-zinc-200 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500 mb-4">
              Kategori Dağılımı
            </h2>
            {report.categoryShare.length === 0 ? (
              <EmptyChart label="Veri yok" />
            ) : (
              <ul className="space-y-3">
                {report.categoryShare.map((c) => {
                  const pct = (c.revenue / maxCategory) * 100
                  const share = report.revenue > 0 ? (c.revenue / report.revenue) * 100 : 0
                  return (
                    <li key={c.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-zinc-700">{c.name}</span>
                        <span className="tabular-nums text-zinc-500">
                          {formatTRY(c.revenue)}{' '}
                          <span className="text-xs text-zinc-400">· {share.toFixed(0)}%</span>
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top products */}
          <section className="bg-white rounded-2xl border border-zinc-200 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500 mb-4">
              En Çok Satanlar
            </h2>
            {report.topProducts.length === 0 ? (
              <EmptyChart label="Veri yok" />
            ) : (
              <ol className="divide-y divide-zinc-100">
                {report.topProducts.map((p, i) => (
                  <li key={p.name} className="py-2.5 flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        i < 3
                          ? 'bg-brand-600 text-white'
                          : 'bg-zinc-100 text-zinc-500'
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
          </section>

          {/* Waiter sales */}
          <section className="bg-white rounded-2xl border border-zinc-200 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500 mb-4">
              Personel Performansı
            </h2>
            {report.waiterSales.length === 0 ? (
              <EmptyChart label="Veri yok" />
            ) : (
              <ul className="space-y-3">
                {report.waiterSales.map((w) => {
                  const pct = (w.revenue / maxWaiter) * 100
                  return (
                    <li key={w.id ?? 'unknown'}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-zinc-700">{w.name}</span>
                        <span className="tabular-nums text-zinc-500">
                          {formatTRY(w.revenue)}{' '}
                          <span className="text-xs text-zinc-400">· {w.orderCount} adisyon</span>
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        {/* CTA to detail list */}
        <div className="flex justify-center pt-2">
          <Link
            href={`/orders?range=${range.key}${
              range.key === 'custom' ? `&from=${range.fromYmd}&to=${range.toYmd}` : ''
            }`}
            className="inline-flex items-center h-11 px-5 bg-white border border-zinc-300 hover:bg-zinc-50 hover:border-zinc-400 rounded-xl font-semibold text-sm text-zinc-700 shadow-sm transition"
          >
            {report.orderCount} adisyonu tek tek incele →
          </Link>
        </div>
      </div>
    </div>
  )
}

function StatBig({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'brand' | 'emerald' | 'zinc'
}) {
  const tones = {
    brand: 'bg-gradient-to-br from-brand-50 to-brand-100 ring-brand-200 text-brand-900',
    emerald: 'bg-gradient-to-br from-emerald-50 to-emerald-100 ring-emerald-200 text-emerald-900',
    zinc: 'bg-white ring-zinc-200 text-zinc-900',
  }
  return (
    <div className={`rounded-2xl ring-1 px-5 py-4 ${tones[tone]}`}>
      <div className="text-[11px] uppercase tracking-wider font-bold opacity-70">{label}</div>
      <div className="text-2xl sm:text-3xl font-bold tabular-nums leading-tight mt-1">
        {value}
      </div>
    </div>
  )
}

function EmptyChart({ label }: { label: string }) {
  return <div className="py-12 text-center text-sm text-zinc-400">{label}</div>
}
