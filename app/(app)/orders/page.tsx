import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { listClosedOrders } from '@/lib/db/reports'
import { resolveRange, formatDateTimeTR } from '@/lib/dates'
import { formatTRY, cn } from '@/lib/utils'
import RangePicker from '../reports/range-picker'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; page?: string }>
}) {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'cashier')) redirect('/tables')

  const params = await searchParams
  const range = resolveRange(params)
  const page = Math.max(1, Number(params.page ?? 1))
  const { items, total } = await listClosedOrders({ range, page, pageSize: PAGE_SIZE })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const totalRevenue = items.reduce(
    (s, o) => (o.status === 'closed' ? s + o.total : s),
    0,
  )

  function pageLink(p: number) {
    const sp = new URLSearchParams()
    sp.set('range', range.key)
    if (range.key === 'custom') {
      sp.set('from', range.fromYmd)
      sp.set('to', range.toYmd)
    }
    sp.set('page', String(p))
    return `?${sp.toString()}`
  }

  return (
    <div>
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Geçmiş Adisyonlar</h1>
              <p className="text-sm text-zinc-500 mt-1">
                {range.label} · {total} kayıt {total > 0 && `· Toplam ${formatTRY(totalRevenue)}`}
              </p>
            </div>
            <RangePicker current={range} />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {items.length === 0 ? (
          <div className="text-center py-20 bg-white border-2 border-dashed border-zinc-200 rounded-2xl">
            <div className="text-5xl mb-4 opacity-60">📋</div>
            <h3 className="text-lg font-bold text-zinc-900">Bu aralıkta kapalı adisyon yok</h3>
            <p className="text-sm text-zinc-500 mt-1">Tarih aralığını değiştirmeyi dene</p>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
            <div className="hidden md:grid grid-cols-12 px-4 py-3 bg-zinc-50 border-b border-zinc-200 text-[11px] uppercase tracking-wider font-bold text-zinc-500">
              <div className="col-span-3">Tarih</div>
              <div className="col-span-2">Masa</div>
              <div className="col-span-2 text-right">Ürün</div>
              <div className="col-span-3">Personel</div>
              <div className="col-span-2 text-right">Tutar</div>
            </div>
            <ul className="divide-y divide-zinc-100">
              {items.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/orders/${o.id}`}
                    className="grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-3 hover:bg-zinc-50 transition items-center"
                  >
                    <div className="col-span-2 md:col-span-3">
                      <div className="text-sm font-medium text-zinc-900 tabular-nums">
                        {formatDateTimeTR(o.closed_at)}
                      </div>
                    </div>
                    <div className="md:col-span-2 text-sm font-semibold text-zinc-700">
                      {o.table_name}
                    </div>
                    <div className="md:col-span-2 text-sm text-zinc-500 md:text-right tabular-nums">
                      {o.item_count} adet
                    </div>
                    <div className="md:col-span-3 text-sm text-zinc-600 truncate">
                      {o.opened_by_name ?? '—'}
                      {o.closed_by_name && o.closed_by_name !== o.opened_by_name && (
                        <span className="text-zinc-400"> · {o.closed_by_name}</span>
                      )}
                    </div>
                    <div
                      className={cn(
                        'md:col-span-2 text-base font-bold tabular-nums md:text-right',
                        o.status === 'cancelled' ? 'text-zinc-400 line-through' : 'text-zinc-900',
                      )}
                    >
                      {formatTRY(o.total)}
                      {o.status === 'cancelled' && (
                        <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-zinc-100 text-zinc-500 align-middle">
                          İptal
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-zinc-500">
              Sayfa {page} / {totalPages}
            </div>
            <div className="flex gap-1">
              {page > 1 && (
                <Link
                  href={pageLink(page - 1)}
                  className="h-9 px-3 inline-flex items-center bg-white border border-zinc-300 hover:bg-zinc-50 rounded-lg text-sm font-medium"
                >
                  ← Önceki
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={pageLink(page + 1)}
                  className="h-9 px-3 inline-flex items-center bg-white border border-zinc-300 hover:bg-zinc-50 rounded-lg text-sm font-medium"
                >
                  Sonraki →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
