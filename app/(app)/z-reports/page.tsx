import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { countOpenOrders, listZReports } from '@/lib/db/z-reports'
import { formatTRY } from '@/lib/utils'
import { formatDateTimeTR } from '@/lib/dates'
import ZNewButton from './z-new-button'

export const dynamic = 'force-dynamic'

export default async function ZReportsPage() {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'cashier')) redirect('/tables')

  const [reports, openOrdersCount] = await Promise.all([listZReports(), countOpenOrders()])

  return (
    <div>
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Z Raporları</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Gün sonu dijital snapshot'ları · {reports.length} kayıt
            </p>
          </div>
          <ZNewButton openOrdersCount={openOrdersCount} />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {reports.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-zinc-200 rounded-2xl py-16 px-6 text-center">
            <div className="text-5xl mb-4">📑</div>
            <h3 className="text-lg font-bold text-zinc-900">Henüz Z raporu yok</h3>
            <p className="text-sm text-zinc-500 mt-1 mb-6 max-w-sm mx-auto">
              Gün sonunda &ldquo;Yeni Z Bas&rdquo; ile o ana kadar kapanmış tüm adisyonları
              dondurulmuş bir snapshot olarak kaydedersin.
            </p>
            <ZNewButton openOrdersCount={openOrdersCount} />
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
            <div className="hidden md:grid grid-cols-12 px-4 py-3 bg-zinc-50 border-b border-zinc-200 text-[11px] uppercase tracking-wider font-bold text-zinc-500">
              <div className="col-span-2">Z No</div>
              <div className="col-span-3">Kapanış</div>
              <div className="col-span-2 text-right">Adisyon</div>
              <div className="col-span-3">Kapatan</div>
              <div className="col-span-2 text-right">Ciro</div>
            </div>
            <ul className="divide-y divide-zinc-100">
              {reports.map((z) => (
                <li key={z.id}>
                  <Link
                    href={`/z-reports/${z.sequence_no}`}
                    className="grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-3.5 hover:bg-zinc-50 transition items-center"
                  >
                    <div className="col-span-2 md:col-span-2">
                      <span className="inline-flex items-center justify-center min-w-[3.5rem] h-7 px-2 rounded-lg bg-brand-100 text-brand-800 text-xs font-bold tabular-nums">
                        Z-{String(z.sequence_no).padStart(3, '0')}
                      </span>
                    </div>
                    <div className="md:col-span-3 text-sm text-zinc-700 tabular-nums">
                      {formatDateTimeTR(z.closed_at)}
                    </div>
                    <div className="md:col-span-2 text-sm text-zinc-500 md:text-right tabular-nums">
                      {z.order_count} adet
                    </div>
                    <div className="md:col-span-3 text-sm text-zinc-600 truncate">
                      {z.closed_by_name ?? '—'}
                    </div>
                    <div className="md:col-span-2 text-base font-bold tabular-nums md:text-right text-zinc-900">
                      {formatTRY(z.revenue)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
