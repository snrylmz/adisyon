'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { cn, formatTRY } from '@/lib/utils'
import { Modal } from '@/components/ui/modal'
import type { Category, Product, Table } from '@/lib/types'
import { submitPendingOrder } from './actions'

type CartItem = {
  productId: string
  name: string
  unitPrice: number
  quantity: number
  note: string
}

const STORAGE_KEY = 'adisyon_customer_session'

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(STORAGE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, id)
  }
  return id
}

type Props = {
  table: Table
  categories: Category[]
  products: Product[]
  popularIds: string[]
  campaign: string | null
}

export default function CustomerOrder({
  table,
  categories,
  products,
  popularIds,
  campaign,
}: Props) {
  const popularSet = useMemo(() => new Set(popularIds), [popularIds])
  const [activeCat, setActiveCat] = useState<string | 'all'>('all')
  const [cart, setCart] = useState<CartItem[]>([])
  const [pendingProduct, setPendingProduct] = useState<{
    product: Product
    quantity: number
    note: string
  } | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [pendingStatus, setPendingStatus] = useState<'pending' | 'approved' | 'rejected' | 'expired'>('pending')
  const [secondsLeft, setSecondsLeft] = useState(300)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const visibleProducts = useMemo(() => {
    if (activeCat === 'all') return products
    return products.filter((p) => p.category_id === activeCat)
  }, [products, activeCat])

  const cartTotal = useMemo(
    () => cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    [cart],
  )
  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart])

  const openAdd = useCallback((p: Product) => {
    setPendingProduct({ product: p, quantity: 1, note: '' })
  }, [])

  function addToCart() {
    if (!pendingProduct) return
    const { product, quantity, note } = pendingProduct
    setCart((prev) => [
      ...prev,
      {
        productId: product.id,
        name: product.name,
        unitPrice: Number(product.price),
        quantity,
        note: note.trim(),
      },
    ])
    setPendingProduct(null)
  }

  const inc = useCallback((idx: number) => {
    setCart((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, quantity: it.quantity + 1 } : it)),
    )
  }, [])
  const dec = useCallback((idx: number) => {
    setCart((prev) =>
      prev.map((it, i) =>
        i === idx ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it,
      ),
    )
  }, [])
  const removeIt = useCallback((idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  async function submit() {
    if (cart.length === 0) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const sessionId = getOrCreateSessionId()
      const res = await submitPendingOrder({
        tableId: table.id,
        sessionId,
        items: cart.map((c) => ({
          productId: c.productId,
          quantity: c.quantity,
          note: c.note || undefined,
        })),
      })
      if (!res.ok) {
        setSubmitError(res.error)
        return
      }
      setPendingId(res.pendingId)
      setPendingStatus('pending')
      setSecondsLeft(300)
      setCart([])
      setCartOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  // Pending status realtime + countdown
  useEffect(() => {
    if (!pendingId) return
    const id = pendingId
    const sb = supabaseBrowser()

    // İlk fetch (tutarlılık için)
    async function refresh() {
      const { data } = await sb
        .from('pending_orders')
        .select('status, expires_at')
        .eq('id', id)
        .maybeSingle()
      if (!data) return
      const status = (data as any).status as typeof pendingStatus
      setPendingStatus(status)
      const remaining = Math.max(
        0,
        Math.floor((new Date((data as any).expires_at).getTime() - Date.now()) / 1000),
      )
      setSecondsLeft(remaining)
      if (status === 'pending' && remaining === 0) {
        setPendingStatus('expired')
      }
    }
    refresh()

    const ch = sb
      .channel(`pending-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pending_orders', filter: `id=eq.${id}` },
        refresh,
      )
      .subscribe()

    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        const next = Math.max(0, s - 1)
        if (next === 0) setPendingStatus((cur) => (cur === 'pending' ? 'expired' : cur))
        return next
      })
    }, 1000)

    return () => {
      sb.removeChannel(ch)
      clearInterval(timer)
    }
  }, [pendingId])

  // Onay modal görünüyor mu?
  const showStatusModal = !!pendingId

  function dismissStatus() {
    setPendingId(null)
    setPendingStatus('pending')
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-32">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-zinc-200">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">
              Sipariş veriyorsunuz
            </div>
            <div className="text-lg font-bold text-zinc-900 leading-tight">{table.name}</div>
          </div>
          <div className="text-2xl">🧁</div>
        </div>

        {/* Categories */}
        <div className="px-3 pb-3 flex gap-1.5 overflow-x-auto">
          <CatPill
            active={activeCat === 'all'}
            onClick={() => setActiveCat('all')}
          >
            Tümü
          </CatPill>
          {categories.map((c) => (
            <CatPill
              key={c.id}
              active={activeCat === c.id}
              onClick={() => setActiveCat(c.id)}
            >
              {c.name}
            </CatPill>
          ))}
        </div>
      </header>

      {/* Kampanya banner */}
      {campaign && (
        <div className="mx-3 mt-3 rounded-2xl bg-gradient-to-r from-amber-100 to-brand-100 border border-amber-200 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">📣</span>
            <p className="text-sm font-medium text-amber-950 leading-snug">{campaign}</p>
          </div>
        </div>
      )}

      {/* Product list */}
      <div className="p-3">
        {visibleProducts.length === 0 ? (
          <div className="text-center py-16 text-zinc-400">Bu kategoride ürün yok</div>
        ) : (
          <ul className="space-y-2">
            {visibleProducts.map((p) => {
              const isPopular = popularSet.has(p.id)
              return (
                <li key={p.id}>
                  <button
                    onClick={() => openAdd(p)}
                    className="w-full bg-white rounded-2xl border border-zinc-200 active:scale-[0.98] transition p-3 flex items-center gap-3 text-left"
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-xl bg-zinc-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.image_url}
                          alt={p.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl opacity-30">🍰</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-zinc-900 leading-tight">{p.name}</span>
                        {isPopular && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full shrink-0">
                            ⭐ Popüler
                          </span>
                        )}
                      </div>
                      <div className="text-lg font-bold tabular-nums text-brand-700 mt-1">
                        {formatTRY(p.price)}
                      </div>
                    </div>
                    <span className="w-10 h-10 rounded-full bg-brand-600 text-white text-xl font-bold flex items-center justify-center shrink-0">
                      +
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Floating cart button */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-20">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full h-14 bg-brand-600 active:bg-brand-700 text-white rounded-2xl shadow-xl shadow-brand-900/20 px-5 flex items-center justify-between font-semibold transition active:scale-[0.99]"
          >
            <span className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/20 text-sm tabular-nums">
                {cartCount}
              </span>
              <span>Sepete bak</span>
            </span>
            <span className="tabular-nums">{formatTRY(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* Add product modal */}
      <Modal
        open={!!pendingProduct}
        onClose={() => setPendingProduct(null)}
        title={pendingProduct?.product.name}
        description={pendingProduct ? formatTRY(pendingProduct.product.price) : undefined}
        size="sm"
      >
        {pendingProduct && (
          <div className="space-y-5">
            <div>
              <div className="text-[11px] uppercase tracking-wider font-bold text-zinc-500 mb-2">
                Adet
              </div>
              <div className="flex items-center justify-center gap-2 bg-zinc-50 rounded-2xl p-2">
                <button
                  onClick={() =>
                    setPendingProduct({
                      ...pendingProduct,
                      quantity: Math.max(1, pendingProduct.quantity - 1),
                    })
                  }
                  disabled={pendingProduct.quantity <= 1}
                  className="w-14 h-14 rounded-xl bg-white border border-zinc-200 active:scale-95 disabled:opacity-30 text-2xl font-bold text-zinc-700"
                >
                  −
                </button>
                <div className="flex-1 text-center">
                  <div className="text-4xl font-bold tabular-nums text-zinc-900">
                    {pendingProduct.quantity}
                  </div>
                  <div className="text-xs text-zinc-500 tabular-nums mt-1">
                    {formatTRY(pendingProduct.product.price * pendingProduct.quantity)}
                  </div>
                </div>
                <button
                  onClick={() =>
                    setPendingProduct({
                      ...pendingProduct,
                      quantity: Math.min(20, pendingProduct.quantity + 1),
                    })
                  }
                  className="w-14 h-14 rounded-xl bg-white border border-zinc-200 active:scale-95 text-2xl font-bold text-zinc-700"
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider font-bold text-zinc-500 block mb-2">
                Not <span className="font-normal normal-case text-zinc-400">(opsiyonel)</span>
              </label>
              <input
                value={pendingProduct.note}
                onChange={(e) =>
                  setPendingProduct({ ...pendingProduct, note: e.target.value })
                }
                placeholder="Örn. az şekerli"
                maxLength={120}
                className="w-full h-11 px-3.5 rounded-xl bg-white border border-zinc-300 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <button
              onClick={addToCart}
              className="w-full h-12 bg-brand-600 active:bg-brand-700 text-white font-semibold rounded-xl shadow-md shadow-brand-600/20"
            >
              Sepete ekle (
              {formatTRY(pendingProduct.product.price * pendingProduct.quantity)})
            </button>
          </div>
        )}
      </Modal>

      {/* Cart modal */}
      <Modal
        open={cartOpen}
        onClose={() => !submitting && setCartOpen(false)}
        title="Sepetiniz"
        description={`${table.name} · ${cartCount} ürün`}
        size="md"
      >
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {cart.length === 0 ? (
            <p className="text-center text-zinc-400 py-8">Sepet boş</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {cart.map((c, idx) => (
                <li key={idx} className="py-2.5 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-zinc-900 truncate">{c.name}</div>
                    <div className="text-xs text-zinc-500 tabular-nums mt-0.5">
                      {formatTRY(c.unitPrice)} × {c.quantity}
                    </div>
                    {c.note && (
                      <div className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                        📝 {c.note}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center bg-zinc-100 rounded-full p-0.5">
                    <button
                      onClick={() => dec(idx)}
                      disabled={c.quantity <= 1}
                      className="w-7 h-7 rounded-full text-zinc-700 active:scale-90 transition font-bold flex items-center justify-center disabled:opacity-30"
                    >
                      −
                    </button>
                    <div className="w-6 text-center font-bold tabular-nums text-sm">
                      {c.quantity}
                    </div>
                    <button
                      onClick={() => inc(idx)}
                      className="w-7 h-7 rounded-full text-zinc-700 active:scale-90 transition font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                  <div className="w-16 text-right font-bold tabular-nums text-sm">
                    {formatTRY(c.unitPrice * c.quantity)}
                  </div>
                  <button
                    onClick={() => removeIt(idx)}
                    className="w-6 h-6 text-zinc-300 active:text-red-600"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-zinc-200 pt-3 mt-3 space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-medium text-zinc-700">Toplam</span>
            <span className="text-2xl font-bold tabular-nums text-zinc-900">
              {formatTRY(cartTotal)}
            </span>
          </div>
          {submitError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg font-medium">
              {submitError}
            </div>
          )}
          <button
            onClick={submit}
            disabled={cart.length === 0 || submitting}
            className="w-full h-14 bg-brand-600 active:bg-brand-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white text-base font-semibold rounded-2xl shadow-md shadow-brand-600/20"
          >
            {submitting ? 'Gönderiliyor...' : 'Siparişi Gönder'}
          </button>
          <p className="text-xs text-center text-zinc-500">
            Sipariş garson tarafından onaylandıktan sonra hazırlanır
          </p>
        </div>
      </Modal>

      {/* Status modal — gönderdikten sonra */}
      <Modal
        open={showStatusModal}
        onClose={() => {
          if (pendingStatus !== 'pending') dismissStatus()
        }}
        title={
          pendingStatus === 'pending'
            ? 'Siparişiniz gönderildi'
            : pendingStatus === 'approved'
              ? '✓ Sipariş onaylandı'
              : pendingStatus === 'rejected'
                ? 'Sipariş alınamadı'
                : 'Süreniz doldu'
        }
        size="sm"
      >
        <div className="text-center py-4 space-y-4">
          {pendingStatus === 'pending' && (
            <>
              <div className="flex justify-center">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
                  <div className="absolute inset-0 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
                </div>
              </div>
              <p className="text-sm text-zinc-700 font-medium">
                Garson siparişinizi onayladığında masanıza işlenecek.
              </p>
              <p className="text-xs text-zinc-500">
                Lütfen bekleyin · İstediğinizde menüye dönüp yeni sipariş ekleyebilirsiniz
              </p>
              <button
                onClick={dismissStatus}
                className="text-sm text-brand-600 hover:text-brand-700 font-semibold underline"
              >
                Menüye dön
              </button>
            </>
          )}
          {pendingStatus === 'approved' && (
            <>
              <div className="text-6xl">🎉</div>
              <p className="text-sm text-zinc-700">
                Siparişiniz alındı, az sonra masanıza getirilecek. Afiyet olsun!
              </p>
              <button
                onClick={dismissStatus}
                className="w-full h-12 bg-emerald-600 text-white font-semibold rounded-xl"
              >
                Menüye dön
              </button>
            </>
          )}
          {pendingStatus === 'rejected' && (
            <>
              <div className="text-6xl">😔</div>
              <p className="text-sm text-zinc-700">
                Garson bu siparişi onaylayamadı. Lütfen yeniden deneyin veya yardım için garsonu
                çağırın.
              </p>
              <button
                onClick={dismissStatus}
                className="w-full h-12 bg-zinc-700 text-white font-semibold rounded-xl"
              >
                Menüye dön
              </button>
            </>
          )}
          {pendingStatus === 'expired' && (
            <>
              <div className="text-6xl">⏳</div>
              <p className="text-sm text-zinc-700">
                Süreniz doldu. Garson yoğun olabilir, lütfen tekrar deneyin veya garsonu çağırın.
              </p>
              <button
                onClick={dismissStatus}
                className="w-full h-12 bg-zinc-700 text-white font-semibold rounded-xl"
              >
                Menüye dön
              </button>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}

function CatPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'h-9 px-3.5 rounded-full text-sm font-semibold whitespace-nowrap transition',
        active ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700 active:bg-zinc-200',
      )}
    >
      {children}
    </button>
  )
}
