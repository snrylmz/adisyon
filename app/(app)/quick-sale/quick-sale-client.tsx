'use client'

import Link from 'next/link'
import { memo, useCallback, useDeferredValue, useMemo, useState, useTransition } from 'react'
import { cn, formatTRY } from '@/lib/utils'
import { Modal } from '@/components/ui/modal'
import type { Category, PaymentType, Product } from '@/lib/types'
import { createQuickSale } from './actions'

type CartItem = {
  productId: string
  name: string
  unitPrice: number
  quantity: number
  note: string
}

type Props = { categories: Category[]; products: Product[] }

export default function QuickSaleClient({ categories, products }: Props) {
  const [activeCat, setActiveCat] = useState<string | 'all'>('all')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [pendingProduct, setPendingProduct] = useState<{
    product: Product
    quantity: number
    note: string
  } | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [pendingPayment, setPendingPayment] = useState<PaymentType | null>(null)
  const [, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)

  const deferredSearch = useDeferredValue(search)
  const visibleProducts = useMemo(() => {
    let list = products
    if (activeCat !== 'all') list = list.filter((p) => p.category_id === activeCat)
    if (deferredSearch.trim()) {
      const q = deferredSearch.toLocaleLowerCase('tr-TR')
      list = list.filter((p) => p.name.toLocaleLowerCase('tr-TR').includes(q))
    }
    return list
  }, [products, activeCat, deferredSearch])

  const productCountByCat = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of products) {
      if (p.category_id) m.set(p.category_id, (m.get(p.category_id) ?? 0) + 1)
    }
    return m
  }, [products])

  const total = useMemo(
    () => cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    [cart],
  )
  const totalCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart])

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
    setCart((prev) => prev.map((it, i) => (i === idx ? { ...it, quantity: it.quantity + 1 } : it)))
  }, [])
  const dec = useCallback((idx: number) => {
    setCart((prev) =>
      prev.map((it, i) =>
        i === idx ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it,
      ),
    )
  }, [])
  const remove = useCallback((idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  function checkout(paymentType: PaymentType) {
    if (cart.length === 0) return
    setBusy(true)
    startTransition(async () => {
      try {
        await createQuickSale({
          items: cart.map((c) => ({
            productId: c.productId,
            quantity: c.quantity,
            note: c.note || undefined,
          })),
          paymentType,
        })
      } finally {
        setBusy(false)
      }
    })
  }

  function closePaymentModal() {
    if (busy) return
    setPaymentOpen(false)
    setPendingPayment(null)
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)]">
      {/* SOL: Sepet */}
      <aside className="lg:w-[440px] bg-white border-r border-zinc-200 flex flex-col">
        <div className="p-5 border-b border-zinc-200">
          <div className="flex items-center justify-between gap-2 mb-4">
            <Link
              href="/tables"
              className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-white border border-zinc-300 hover:bg-zinc-50 active:scale-95 text-sm font-semibold text-zinc-700 shadow-sm transition"
            >
              <span className="text-base leading-none">←</span> Masalar
            </Link>
          </div>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Hızlı Satış</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              📦 PAKET
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            Masa açmadan, tezgah satışı için. Ödeme sonrası direkt kapanır.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="text-4xl mb-3 opacity-40">📦</div>
              <p className="text-zinc-500 font-medium">Sepet boş</p>
              <p className="text-xs text-zinc-400 mt-1">Sağdan ürün seç</p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {cart.map((c, idx) => (
                <CartRow
                  key={idx}
                  item={c}
                  index={idx}
                  onInc={inc}
                  onDec={dec}
                  onRemove={remove}
                />
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
              <div className="text-xs text-zinc-400 mt-0.5">{totalCount} adet ürün</div>
            </div>
            <div className="text-3xl font-bold tabular-nums text-zinc-900">{formatTRY(total)}</div>
          </div>
          <div className="px-5 pb-5">
            <button
              disabled={cart.length === 0 || busy}
              onClick={() => setPaymentOpen(true)}
              className="w-full h-14 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:bg-zinc-200 disabled:text-zinc-400 text-white text-base font-semibold rounded-2xl transition shadow-md shadow-brand-600/20 disabled:shadow-none"
            >
              Tahsil Et &amp; Kapat
            </button>
          </div>
        </div>
      </aside>

      {/* SAĞ: Ürünler */}
      <section className="flex-1 flex flex-col bg-zinc-50">
        <div className="bg-white border-b border-zinc-200">
          <div className="px-4 pt-4">
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ürün ara..."
                className="w-full h-11 pl-10 pr-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:bg-white transition"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">🔍</span>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 text-xl"
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

        <div className="flex-1 overflow-y-auto p-4">
          {visibleProducts.length === 0 ? (
            <div className="text-center py-20 text-zinc-400">
              {search ? <>&ldquo;{search}&rdquo; için sonuç yok</> : <>Bu kategoride ürün yok.</>}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {visibleProducts.map((p) => (
                <ProductCard key={p.id} product={p} onPick={openAdd} />
              ))}
            </div>
          )}
        </div>
      </section>

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
                      quantity: Math.min(99, pendingProduct.quantity + 1),
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
                placeholder="Örn. paket yap, az şekerli"
                maxLength={120}
                className="w-full h-11 px-3.5 rounded-xl bg-white border border-zinc-300 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setPendingProduct(null)}
                className="h-12 px-5 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-xl font-semibold text-zinc-700"
              >
                Vazgeç
              </button>
              <button
                onClick={addToCart}
                className="flex-1 h-12 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-md shadow-brand-600/20"
              >
                Sepete ekle (
                {formatTRY(pendingProduct.product.price * pendingProduct.quantity)})
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment modal */}
      <Modal
        open={paymentOpen}
        onClose={closePaymentModal}
        title={pendingPayment ? 'Onayla' : 'Ödeme tipi'}
        description={
          pendingPayment ? undefined : formatTRY(total) + ' tahsil edilecek'
        }
        size="sm"
      >
        {pendingPayment ? (
          /* ONAY ADIMI */
          <div className="space-y-4">
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 text-center space-y-1">
              <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">
                Tahsil edilecek
              </p>
              <div className="text-3xl font-bold tabular-nums text-emerald-950">
                {formatTRY(total)}
              </div>
              <p className="text-sm font-semibold text-emerald-800">
                {pendingPayment === 'cash'
                  ? '💵 Nakit'
                  : pendingPayment === 'card'
                    ? '💳 Kart'
                    : pendingPayment === 'transfer'
                      ? '🏦 Havale'
                      : '• Diğer'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPendingPayment(null)}
                disabled={busy}
                className="h-12 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-xl font-semibold text-zinc-700"
              >
                Geri
              </button>
              <button
                type="button"
                onClick={() => checkout(pendingPayment)}
                disabled={busy}
                className="h-12 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-zinc-300 text-white font-semibold rounded-xl shadow-md shadow-emerald-600/20"
              >
                {busy ? 'Tahsil ediliyor...' : 'Onayla ✓'}
              </button>
            </div>
          </div>
        ) : (
          /* ÖDEME TİPİ SEÇİMİ */
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <PaymentBtn
                icon="💵"
                label="Nakit"
                onClick={() => setPendingPayment('cash')}
                disabled={busy}
              />
              <PaymentBtn
                icon="💳"
                label="Kart"
                onClick={() => setPendingPayment('card')}
                disabled={busy}
              />
              <PaymentBtn
                icon="🏦"
                label="Havale"
                onClick={() => setPendingPayment('transfer')}
                disabled={busy}
              />
            </div>
            <button
              onClick={closePaymentModal}
              disabled={busy}
              className="w-full h-10 text-xs text-zinc-500 hover:text-zinc-700"
            >
              Vazgeç
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}

const ProductCard = memo(function ProductCard({
  product,
  onPick,
}: {
  product: Product
  onPick: (p: Product) => void
}) {
  return (
    <button
      onClick={() => onPick(product)}
      className="group bg-white rounded-2xl border border-zinc-200 hover:border-brand-300 hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all p-4 text-left min-h-[110px] flex flex-col justify-between"
    >
      <div className="font-semibold text-zinc-900 leading-tight">{product.name}</div>
      <div className="flex items-end justify-between mt-2">
        <div className="text-xl font-bold tabular-nums text-brand-700">
          {formatTRY(product.price)}
        </div>
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-100 text-zinc-400 group-hover:bg-brand-600 group-hover:text-white transition">
          +
        </span>
      </div>
    </button>
  )
})

const CartRow = memo(function CartRow({
  item,
  index,
  onInc,
  onDec,
  onRemove,
}: {
  item: CartItem
  index: number
  onInc: (i: number) => void
  onDec: (i: number) => void
  onRemove: (i: number) => void
}) {
  return (
    <li className="px-5 py-3 flex items-center gap-3 hover:bg-zinc-50/50">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-zinc-900 truncate leading-tight">{item.name}</div>
        <div className="text-xs text-zinc-500 tabular-nums mt-0.5">
          {formatTRY(item.unitPrice)} × {item.quantity}
        </div>
        {item.note && (
          <div className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-1 inline-block">
            📝 {item.note}
          </div>
        )}
      </div>
      <div className="flex items-center bg-zinc-100 rounded-full p-0.5">
        <button
          onClick={() => onDec(index)}
          disabled={item.quantity <= 1}
          className="w-7 h-7 rounded-full text-zinc-700 active:scale-90 transition font-bold flex items-center justify-center disabled:opacity-30"
        >
          −
        </button>
        <div className="w-7 text-center font-bold tabular-nums text-sm">{item.quantity}</div>
        <button
          onClick={() => onInc(index)}
          className="w-7 h-7 rounded-full text-zinc-700 active:scale-90 transition font-bold flex items-center justify-center"
        >
          +
        </button>
      </div>
      <div className="w-20 text-right font-bold tabular-nums text-zinc-900">
        {formatTRY(item.unitPrice * item.quantity)}
      </div>
      <button
        onClick={() => onRemove(index)}
        className="w-7 h-7 rounded-lg text-zinc-300 hover:text-red-600 hover:bg-red-50 active:scale-90 transition flex items-center justify-center"
      >
        🗑
      </button>
    </li>
  )
})

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

function PaymentBtn({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: string
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center justify-center gap-1 h-20 bg-zinc-50 hover:bg-emerald-50 hover:border-emerald-300 active:scale-95 border border-zinc-200 rounded-xl text-zinc-800 font-semibold transition disabled:opacity-40"
    >
      <span className="text-2xl leading-none">{icon}</span>
      <span className="text-xs">{label}</span>
    </button>
  )
}
