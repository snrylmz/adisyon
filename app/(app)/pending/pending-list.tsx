'use client'

import { useEffect, useState, useTransition } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { formatTRY } from '@/lib/utils'
import { approvePending, rejectPending } from './actions'

type PendingItem = {
  product_id: string
  product_name: string
  unit_price: number
  quantity: number
  note: string | null
}

type Row = {
  id: string
  table_id: string
  table_name: string
  items: PendingItem[]
  subtotal: number
  created_at: string
  expires_at: string
}

export default function PendingList({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial)
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    const sb = supabaseBrowser()
    let timer: ReturnType<typeof setTimeout> | null = null

    async function refresh() {
      const { data } = await sb
        .from('pending_orders')
        .select('*, tables(name)')
        .eq('status', 'pending')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true })
      const next = ((data ?? []) as any[]).map((p) => ({
        id: p.id,
        table_id: p.table_id,
        table_name: p.tables?.name ?? '—',
        items: p.items,
        subtotal: Number(p.subtotal),
        created_at: p.created_at,
        expires_at: p.expires_at,
      })) as Row[]
      setRows(next)
    }
    function schedule() {
      if (timer) clearTimeout(timer)
      timer = setTimeout(refresh, 150)
    }

    const ch = sb
      .channel('pending-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_orders' }, schedule)
      .subscribe()

    const tick = setInterval(() => setNow(Date.now()), 1000)

    return () => {
      sb.removeChannel(ch)
      if (timer) clearTimeout(timer)
      clearInterval(tick)
    }
  }, [])

  function approve(id: string) {
    setBusy(id)
    startTransition(async () => {
      try {
        await approvePending(id)
        setRows((prev) => prev.filter((r) => r.id !== id))
      } catch (e) {
        console.error(e)
        alert((e as any)?.message ?? 'Onay başarısız')
      } finally {
        setBusy(null)
      }
    })
  }
  function reject(id: string) {
    if (!confirm('Bu siparişi reddet?')) return
    setBusy(id)
    startTransition(async () => {
      try {
        await rejectPending(id)
        setRows((prev) => prev.filter((r) => r.id !== id))
      } finally {
        setBusy(null)
      }
    })
  }

  return (
    <div>
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Bekleyen Siparişler
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Müşterilerin telefondan gönderdiği sipariş talepleri · {rows.length} kayıt
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {rows.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-zinc-200 rounded-2xl py-16 px-6 text-center">
            <div className="text-5xl mb-4 opacity-60">🔔</div>
            <h3 className="text-lg font-bold text-zinc-900">Şu an bekleyen sipariş yok</h3>
            <p className="text-sm text-zinc-500 mt-1">
              Müşterinin QR'dan sipariş göndermesini bekliyorsun
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => {
              const secondsLeft = Math.max(
                0,
                Math.floor((new Date(r.expires_at).getTime() - now) / 1000),
              )
              const itemCount = r.items.reduce((s, i) => s + i.quantity, 0)
              const isBusy = busy === r.id
              return (
                <li
                  key={r.id}
                  className="bg-white border border-zinc-200 rounded-2xl overflow-hidden"
                >
                  <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-white border-b border-zinc-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center">
                        🔔
                      </div>
                      <div>
                        <div className="font-bold text-zinc-900 text-lg leading-tight">
                          {r.table_name}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {itemCount} ürün · {formatTRY(r.subtotal)}
                        </div>
                      </div>
                    </div>
                    <div
                      className={
                        secondsLeft < 60
                          ? 'text-sm font-bold tabular-nums text-red-600'
                          : 'text-sm font-semibold tabular-nums text-zinc-500'
                      }
                    >
                      {Math.floor(secondsLeft / 60)}:
                      {String(secondsLeft % 60).padStart(2, '0')}
                    </div>
                  </div>
                  <ul className="divide-y divide-zinc-100">
                    {r.items.map((it, idx) => (
                      <li key={idx} className="px-4 py-2.5 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-zinc-900 truncate">
                            {it.product_name}
                          </div>
                          <div className="text-xs text-zinc-500 tabular-nums">
                            {formatTRY(Number(it.unit_price))} × {it.quantity}
                          </div>
                          {it.note && (
                            <div className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                              📝 {it.note}
                            </div>
                          )}
                        </div>
                        <div className="font-bold tabular-nums text-sm">
                          {formatTRY(Number(it.unit_price) * it.quantity)}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="px-4 py-3 bg-zinc-50 border-t border-zinc-200 flex items-center gap-2">
                    <button
                      onClick={() => reject(r.id)}
                      disabled={isBusy}
                      className="h-11 px-4 bg-white border border-red-200 hover:bg-red-50 text-red-700 rounded-xl text-sm font-semibold disabled:opacity-40"
                    >
                      ✗ Reddet
                    </button>
                    <button
                      onClick={() => approve(r.id)}
                      disabled={isBusy}
                      className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-semibold shadow-sm disabled:opacity-40"
                    >
                      {isBusy ? 'İşleniyor...' : '✓ Onayla ve masaya ekle'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
