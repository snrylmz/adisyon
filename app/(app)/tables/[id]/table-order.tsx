'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { cn, formatTRY, formatTime } from '@/lib/utils'
import { Modal } from '@/components/ui/modal'
import type { Category, Order, OrderItem, Product, Role, Table, TableWithOrder } from '@/lib/types'
import {
  addOrderItem,
  cancelOrder,
  changeItemQuantity,
  closeOrder,
  moveOrderToTable,
  removeOrderItem,
} from './actions'

type Props = {
  table: Table
  categories: Category[]
  products: Product[]
  initialOrder: { order: Order; items: OrderItem[] } | null
  role: Role
  allTables: TableWithOrder[]
}

export default function TableOrder({
  table,
  categories,
  products,
  initialOrder,
  role,
  allTables,
}: Props) {
  const [order, setOrder] = useState<Order | null>(initialOrder?.order ?? null)
  const [items, setItems] = useState<OrderItem[]>(initialOrder?.items ?? [])
  const [activeCat, setActiveCat] = useState<string | 'all'>('all')
  const [search, setSearch] = useState('')
  const [, startTransition] = useTransition()
  const [closing, setClosing] = useState(false)
  const [flashId, setFlashId] = useState<string | null>(null)
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveError, setMoveError] = useState<string | null>(null)
  const [moving, setMoving] = useState<string | null>(null)
  const [pending, setPending] = useState<{ product: Product; quantity: number; note: string } | null>(null)
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<OrderItem | null>(null)
  const [removingBusy, setRemovingBusy] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelBusy, setCancelBusy] = useState(false)

  const freeTables = useMemo(
    () => allTables.filter((t) => !t.open_order && t.id !== table.id),
    [allTables, table.id],
  )

  const visibleProducts = useMemo(() => {
    let list = products
    if (activeCat !== 'all') list = list.filter((p) => p.category_id === activeCat)
    if (search.trim()) {
      const q = search.toLocaleLowerCase('tr-TR')
      list = list.filter((p) => p.name.toLocaleLowerCase('tr-TR').includes(q))
    }
    return list
  }, [products, activeCat, search])

  const productCountByCat = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of products) {
      if (p.category_id) m.set(p.category_id, (m.get(p.category_id) ?? 0) + 1)
    }
    return m
  }, [products])

  useEffect(() => {
    const sb = supabaseBrowser()

    async function refresh() {
      const { data: o } = await sb
        .from('orders')
        .select('*')
        .eq('table_id', table.id)
        .eq('status', 'open')
        .maybeSingle()
      if (!o) {
        setOrder(null)
        setItems([])
        return
      }
      setOrder({ ...(o as any), total: Number((o as any).total) })
      const { data: its } = await sb
        .from('order_items')
        .select('*')
        .eq('order_id', (o as any).id)
        .order('created_at')
      setItems(((its ?? []) as any[]).map((i) => ({ ...i, unit_price: Number(i.unit_price) })))
    }

    const ch = sb
      .channel(`table-${table.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `table_id=eq.${table.id}` },
        refresh,
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, refresh)
      .subscribe()
    return () => {
      sb.removeChannel(ch)
    }
  }, [table.id])

  const total = order?.total ?? 0
  const totalCount = items.reduce((s, i) => s + i.quantity, 0)
  const occupied = !!order

  function openAdd(p: Product) {
    setPending({ product: p, quantity: 1, note: '' })
  }

  function confirmAdd() {
    if (!pending) return
    const { product, quantity, note } = pending
    setAdding(true)
    startTransition(async () => {
      try {
        await addOrderItem({
          tableId: table.id,
          productId: product.id,
          quantity,
          note: note.trim() || undefined,
        })
        setFlashId(product.id)
        setTimeout(() => setFlashId(null), 400)
        setPending(null)
      } finally {
        setAdding(false)
      }
    })
  }
  function inc(it: OrderItem) {
    startTransition(async () => {
      await changeItemQuantity({ tableId: table.id, itemId: it.id, delta: 1 })
    })
  }
  function dec(it: OrderItem) {
    if (it.quantity <= 1) return // 1'in altına inmesin, silmek için × kullanılsın
    startTransition(async () => {
      await changeItemQuantity({ tableId: table.id, itemId: it.id, delta: -1 })
    })
  }
  function askRemove(it: OrderItem) {
    setRemoving(it)
  }
  function confirmRemove() {
    if (!removing) return
    setRemovingBusy(true)
    startTransition(async () => {
      try {
        await removeOrderItem({ tableId: table.id, itemId: removing.id })
        setRemoving(null)
      } finally {
        setRemovingBusy(false)
      }
    })
  }
  function doClose() {
    if (!order) return
    startTransition(async () => {
      await closeOrder({ tableId: table.id, orderId: order.id })
      setClosing(false)
    })
  }
  function confirmCancel() {
    if (!order) return
    setCancelBusy(true)
    startTransition(async () => {
      try {
        await cancelOrder({ tableId: table.id, orderId: order.id })
        setCancelOpen(false)
      } finally {
        setCancelBusy(false)
      }
    })
  }

  async function doMove(targetTableId: string) {
    if (!order) return
    setMoveError(null)
    setMoving(targetTableId)
    try {
      await moveOrderToTable({ orderId: order.id, targetTableId })
      // redirect happens in server action
    } catch (e: any) {
      setMoveError(e?.message ?? 'Taşıma başarısız')
      setMoving(null)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)]">
      {/* SOL: Adisyon paneli */}
      <aside className="lg:w-[440px] bg-white border-r border-zinc-200 flex flex-col">
        {/* Table header */}
        <div className="p-5 border-b border-zinc-200">
          <div className="flex items-center justify-between gap-2 mb-4">
            <Link
              href="/tables"
              className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-white border border-zinc-300 hover:bg-zinc-50 hover:border-zinc-400 active:scale-95 text-sm font-semibold text-zinc-700 shadow-sm transition"
            >
              <span className="text-base leading-none">←</span> Masalar
            </Link>
            {occupied && (
              <button
                onClick={() => {
                  setMoveError(null)
                  setMoveOpen(true)
                }}
                className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-white border border-zinc-300 hover:bg-brand-50 hover:border-brand-400 hover:text-brand-700 active:scale-95 text-sm font-semibold text-zinc-700 shadow-sm transition"
              >
                <span className="text-base leading-none">⇄</span> Masa Değiştir
              </button>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{table.name}</h1>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold',
                occupied
                  ? 'bg-red-100 text-red-800'
                  : 'bg-emerald-100 text-emerald-800',
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  occupied ? 'bg-red-500' : 'bg-emerald-500',
                )}
              />
              {occupied ? 'AÇIK ADİSYON' : 'BOŞ'}
            </span>
          </div>
          {occupied && (
            <div className="flex items-center gap-3 text-xs text-zinc-500 mt-2">
              <span>Açılış {formatTime(order!.opened_at)}</span>
              <span className="opacity-40">·</span>
              <span>{totalCount} ürün</span>
            </div>
          )}
        </div>

        {/* Order items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="text-4xl mb-3 opacity-40">🛒</div>
              <p className="text-zinc-500 font-medium">Henüz ürün eklenmedi</p>
              <p className="text-xs text-zinc-400 mt-1">Sağdan ürün seçerek başla</p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {items.map((it) => (
                <li key={it.id} className="px-5 py-3 flex items-center gap-3 hover:bg-zinc-50/50">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-zinc-900 truncate leading-tight">
                      {it.product_name}
                    </div>
                    <div className="text-xs text-zinc-500 tabular-nums mt-0.5">
                      {formatTRY(it.unit_price)} × {it.quantity}
                    </div>
                    {it.note && (
                      <div className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                        📝 {it.note}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center bg-zinc-100 rounded-full p-0.5">
                    <button
                      onClick={() => dec(it)}
                      disabled={it.quantity <= 1}
                      className="w-7 h-7 rounded-full text-zinc-700 hover:bg-white active:scale-90 transition font-bold flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      aria-label="Azalt"
                    >
                      −
                    </button>
                    <div className="w-7 text-center font-bold tabular-nums text-sm">
                      {it.quantity}
                    </div>
                    <button
                      onClick={() => inc(it)}
                      className="w-7 h-7 rounded-full text-zinc-700 hover:bg-white active:scale-90 transition font-bold flex items-center justify-center"
                      aria-label="Artır"
                    >
                      +
                    </button>
                  </div>
                  <div className="w-20 text-right font-bold tabular-nums text-zinc-900">
                    {formatTRY(Number(it.unit_price) * it.quantity)}
                  </div>
                  <button
                    onClick={() => askRemove(it)}
                    aria-label="Kaldır"
                    className="w-7 h-7 rounded-lg text-zinc-300 hover:text-red-600 hover:bg-red-50 active:scale-90 transition flex items-center justify-center"
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer / Checkout */}
        <div className="border-t border-zinc-200 bg-gradient-to-b from-white to-zinc-50">
          <div className="px-5 py-4 flex items-baseline justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider font-bold text-zinc-500">
                Toplam
              </div>
              {occupied && (
                <div className="text-xs text-zinc-400 mt-0.5">{totalCount} adet ürün</div>
              )}
            </div>
            <div className="text-3xl font-bold tabular-nums text-zinc-900">
              {formatTRY(total)}
            </div>
          </div>
          {occupied && (
            <div className="px-5 pb-5 space-y-2">
              {!closing ? (
                <button
                  disabled={items.length === 0}
                  onClick={() => setClosing(true)}
                  className="w-full h-14 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:bg-zinc-200 disabled:text-zinc-400 text-white text-base font-semibold rounded-2xl transition shadow-md shadow-brand-600/20 disabled:shadow-none"
                >
                  Hesabı Kapat
                </button>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 space-y-2">
                  <p className="text-sm font-medium text-emerald-900 text-center">
                    Bu adisyonu kapatmayı onaylıyor musun?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setClosing(false)}
                      className="h-12 bg-white border border-zinc-200 hover:bg-zinc-50 font-semibold rounded-xl"
                    >
                      Vazgeç
                    </button>
                    <button
                      onClick={doClose}
                      className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm"
                    >
                      Onayla ✓
                    </button>
                  </div>
                </div>
              )}
              {(role === 'admin' || role === 'cashier') && !closing && (
                <button
                  onClick={() => setCancelOpen(true)}
                  className="w-full h-9 text-xs text-zinc-400 hover:text-red-600 transition"
                >
                  Adisyonu iptal et
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* SAĞ: Ürün kataloğu */}
      <section className="flex-1 flex flex-col bg-zinc-50">
        {/* Search + categories */}
        <div className="bg-white border-b border-zinc-200">
          <div className="px-4 pt-4">
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ürün ara..."
                className="w-full h-11 pl-10 pr-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:bg-white transition"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                🔍
              </span>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 text-xl"
                  aria-label="Aramayı temizle"
                >
                  ×
                </button>
              )}
            </div>
          </div>
          <div className="px-3 py-3 flex gap-1.5 overflow-x-auto">
            <CatPill
              active={activeCat === 'all'}
              onClick={() => setActiveCat('all')}
              count={products.length}
            >
              Tümü
            </CatPill>
            {categories.map((c) => (
              <CatPill
                key={c.id}
                active={activeCat === c.id}
                onClick={() => setActiveCat(c.id)}
                count={productCountByCat.get(c.id) ?? 0}
              >
                {c.name}
              </CatPill>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {visibleProducts.length === 0 ? (
            <div className="text-center py-20 text-zinc-400">
              {search ? (
                <>"{search}" için sonuç yok</>
              ) : (
                <>
                  Bu kategoride ürün yok.{' '}
                  <Link href="/admin/products" className="text-brand-600 underline font-medium">
                    Ürün ekle
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {visibleProducts.map((p) => {
                const flashing = flashId === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => openAdd(p)}
                    className={cn(
                      'group relative bg-white rounded-2xl border border-zinc-200',
                      'hover:border-brand-300 hover:shadow-md hover:-translate-y-0.5',
                      'active:scale-95 transition-all',
                      'p-4 text-left min-h-[110px] flex flex-col justify-between',
                      flashing && 'ring-2 ring-brand-500 shadow-lg',
                    )}
                  >
                    <div className="font-semibold text-zinc-900 leading-tight">{p.name}</div>
                    <div className="flex items-end justify-between mt-2">
                      <div className="text-xl font-bold tabular-nums text-brand-700">
                        {formatTRY(p.price)}
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center justify-center w-7 h-7 rounded-full',
                          'bg-zinc-100 text-zinc-400 group-hover:bg-brand-600 group-hover:text-white',
                          'transition',
                          flashing && 'bg-brand-600 text-white scale-110',
                        )}
                      >
                        +
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Adisyon iptal onay modal'ı */}
      <Modal
        open={cancelOpen}
        onClose={() => !cancelBusy && setCancelOpen(false)}
        title="Adisyonu iptal et"
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="text-xs uppercase tracking-wider font-bold text-red-700">
              {table.name}
            </div>
            <div className="text-2xl font-bold tabular-nums text-red-900 mt-1">
              {formatTRY(total)}
            </div>
            <div className="text-xs text-red-700/80 mt-1">
              {totalCount} ürün · {items.length} kalem
            </div>
          </div>
          <p className="text-sm text-zinc-600">
            Bu adisyon <span className="font-semibold text-zinc-900">iptal</span> olarak işaretlenecek.
            Tutar ciroya yansımaz ama kayıt geçmişte ve raporlarda görünür. Bu işlem{' '}
            <span className="font-semibold text-zinc-900">geri alınamaz</span>.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCancelOpen(false)}
              disabled={cancelBusy}
              className="h-12 px-5 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-xl font-semibold text-zinc-700 transition"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={confirmCancel}
              disabled={cancelBusy}
              className="flex-1 h-12 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-zinc-300 text-white font-semibold rounded-xl shadow-md shadow-red-600/20 transition"
            >
              {cancelBusy ? 'İptal ediliyor...' : 'Evet, iptal et'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Ürün kaldırma onay modal'ı */}
      <Modal
        open={!!removing}
        onClose={() => !removingBusy && setRemoving(null)}
        title="Ürünü kaldır"
        size="sm"
      >
        {removing && (
          <div className="space-y-4">
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4">
              <div className="font-semibold text-zinc-900">{removing.product_name}</div>
              <div className="text-sm text-zinc-600 tabular-nums mt-0.5">
                {formatTRY(removing.unit_price)} × {removing.quantity} ={' '}
                <span className="font-bold text-zinc-900">
                  {formatTRY(Number(removing.unit_price) * removing.quantity)}
                </span>
              </div>
              {removing.note && (
                <div className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded mt-2 inline-block">
                  📝 {removing.note}
                </div>
              )}
            </div>
            <p className="text-sm text-zinc-600">
              Bu kalem adisyondan tamamen kaldırılacak. Devam edilsin mi?
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRemoving(null)}
                disabled={removingBusy}
                className="h-12 px-5 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-xl font-semibold text-zinc-700 transition"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={confirmRemove}
                disabled={removingBusy}
                className="flex-1 h-12 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-zinc-300 text-white font-semibold rounded-xl shadow-md shadow-red-600/20 transition"
              >
                {removingBusy ? 'Kaldırılıyor...' : 'Evet, kaldır'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Ürün ekleme onay modal'ı */}
      <Modal
        open={!!pending}
        onClose={() => !adding && setPending(null)}
        title={pending?.product.name}
        description={pending ? formatTRY(pending.product.price) : undefined}
        size="sm"
      >
        {pending && (
          <div className="space-y-5">
            {/* Quantity stepper */}
            <div>
              <div className="text-[11px] uppercase tracking-wider font-bold text-zinc-500 mb-2">
                Adet
              </div>
              <div className="flex items-center justify-center gap-2 bg-zinc-50 rounded-2xl p-2">
                <button
                  type="button"
                  onClick={() =>
                    setPending({ ...pending, quantity: Math.max(1, pending.quantity - 1) })
                  }
                  disabled={pending.quantity <= 1 || adding}
                  className="w-14 h-14 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 active:scale-95 disabled:opacity-30 text-2xl font-bold text-zinc-700 transition"
                  aria-label="Azalt"
                >
                  −
                </button>
                <div className="flex-1 text-center">
                  <div className="text-4xl font-bold tabular-nums text-zinc-900">
                    {pending.quantity}
                  </div>
                  <div className="text-xs text-zinc-500 tabular-nums mt-1">
                    {formatTRY(pending.product.price * pending.quantity)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setPending({ ...pending, quantity: Math.min(99, pending.quantity + 1) })
                  }
                  disabled={adding}
                  className="w-14 h-14 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 active:scale-95 disabled:opacity-30 text-2xl font-bold text-zinc-700 transition"
                  aria-label="Artır"
                >
                  +
                </button>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="text-[11px] uppercase tracking-wider font-bold text-zinc-500 block mb-2">
                Not <span className="font-normal normal-case text-zinc-400">(opsiyonel)</span>
              </label>
              <input
                type="text"
                value={pending.note}
                onChange={(e) => setPending({ ...pending, note: e.target.value })}
                placeholder="Örn. az şekerli, ekstra krema"
                maxLength={120}
                className="w-full h-11 px-3.5 rounded-xl bg-white border border-zinc-300 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPending(null)}
                disabled={adding}
                className="h-12 px-5 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-xl font-semibold text-zinc-700 transition"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={confirmAdd}
                disabled={adding}
                className="flex-1 h-12 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:bg-zinc-300 text-white font-semibold rounded-xl shadow-md shadow-brand-600/20 transition"
              >
                {adding
                  ? 'Ekleniyor...'
                  : `Adisyona ekle (${formatTRY(pending.product.price * pending.quantity)})`}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        title={`${table.name} → Yeni masa seç`}
        description={`${formatTRY(total)} tutarındaki adisyon hedef masaya taşınacak.`}
        size="lg"
      >
        {moveError && (
          <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg font-medium">
            {moveError}
          </div>
        )}
        {freeTables.length === 0 ? (
          <div className="py-10 text-center text-sm text-zinc-500">
            Şu anda boş masa yok. Önce bir masanın hesabını kapat.
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto">
            {freeTables.map((t) => {
              const isMoving = moving === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => doMove(t.id)}
                  disabled={!!moving}
                  className={cn(
                    'h-20 rounded-xl border-2 font-bold text-base transition-all',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                    isMoving
                      ? 'bg-brand-600 text-white border-brand-600 scale-95'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100 hover:border-emerald-400 active:scale-95',
                  )}
                >
                  {isMoving ? '...' : t.name}
                </button>
              )
            })}
          </div>
        )}
        <div className="mt-4 text-xs text-zinc-500">
          Açık adisyonu taşımak masadaki ürün ve toplamı korur, kayıtlarda da yeni masa görünür.
        </div>
      </Modal>
    </div>
  )
}

function CatPill({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean
  onClick: () => void
  count: number
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'h-10 px-4 rounded-full text-sm font-semibold whitespace-nowrap transition flex items-center gap-2',
        active
          ? 'bg-zinc-900 text-white shadow-sm'
          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
      )}
    >
      <span>{children}</span>
      <span
        className={cn(
          'text-[11px] tabular-nums font-bold px-1.5 rounded-full',
          active ? 'bg-white/20 text-white' : 'bg-white text-zinc-500',
        )}
      >
        {count}
      </span>
    </button>
  )
}
