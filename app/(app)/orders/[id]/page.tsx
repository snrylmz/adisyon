import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getClosedOrderDetail } from '@/lib/db/reports'
import { formatDateTimeTR } from '@/lib/dates'
import { formatTRY } from '@/lib/utils'
import { PAYMENT_LABELS } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'cashier')) redirect('/tables')

  const { id } = await params
  const data = await getClosedOrderDetail(id)
  if (!data) notFound()
  const { order, items } = data
  const cancelled = order.status === 'cancelled'

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 h-10 px-3.5 mb-4 rounded-xl bg-white border border-zinc-300 hover:bg-zinc-50 hover:border-zinc-400 active:scale-95 text-sm font-semibold text-zinc-700 shadow-sm transition"
      >
        <span className="text-base leading-none">←</span> Geçmiş Adisyonlar
      </Link>

      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-zinc-200 bg-gradient-to-br from-white to-zinc-50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wider font-bold text-zinc-500">
                Adisyon
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 mt-1">
                {!order.table_id ? (
                  <span className="inline-flex items-center gap-2">
                    <span>📦</span> Paket Satış
                  </span>
                ) : (
                  order.table_name
                )}
              </h1>
              <div className="text-sm text-zinc-500 mt-1">
                {formatDateTimeTR(order.closed_at)}
              </div>
            </div>
            {cancelled ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-600">
                İPTAL
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                ✓ KAPATILDI
              </span>
            )}
          </div>

          {/* Meta */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Meta label="Açılış" value={formatDateTimeTR(order.opened_at)} />
            <Meta label="Kapanış" value={formatDateTimeTR(order.closed_at)} />
            <Meta label="Açan" value={order.opened_by_name ?? '—'} />
            <Meta label="Kapatan" value={order.closed_by_name ?? '—'} />
          </div>
          {(order as any).payment_type && !cancelled && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700">
              {(order as any).payment_type === 'cash'
                ? '💵'
                : (order as any).payment_type === 'card'
                  ? '💳'
                  : (order as any).payment_type === 'transfer'
                    ? '🏦'
                    : '•'}{' '}
              {PAYMENT_LABELS[(order as any).payment_type as keyof typeof PAYMENT_LABELS]}
            </div>
          )}
        </div>

        {/* Items */}
        <div className="p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500 mb-3">
            Kalemler
          </h2>
          <ul className="divide-y divide-zinc-100">
            {items.map((it) => (
              <li key={it.id} className="py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-zinc-900 truncate">{it.product_name}</div>
                  <div className="text-xs text-zinc-500 tabular-nums mt-0.5">
                    {formatTRY(it.unit_price)} × {it.quantity}
                  </div>
                  {it.note && (
                    <div className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded mt-1.5 inline-block">
                      📝 {it.note}
                    </div>
                  )}
                </div>
                <div className="font-bold tabular-nums text-zinc-900 pt-0.5">
                  {formatTRY(Number(it.unit_price) * it.quantity)}
                </div>
              </li>
            ))}
            {items.length === 0 && (
              <li className="py-6 text-center text-zinc-400 text-sm">Bu adisyonda kalem yok</li>
            )}
          </ul>
        </div>

        {/* Total */}
        <div className="px-6 py-5 bg-zinc-50 border-t border-zinc-200 flex items-baseline justify-between">
          <div className="text-xs uppercase tracking-wider font-bold text-zinc-500">Toplam</div>
          <div
            className={`text-3xl font-bold tabular-nums ${
              cancelled ? 'text-zinc-400 line-through' : 'text-zinc-900'
            }`}
          >
            {formatTRY(order.total)}
          </div>
        </div>
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">{label}</div>
      <div className="text-sm font-medium text-zinc-800 mt-0.5">{value}</div>
    </div>
  )
}
