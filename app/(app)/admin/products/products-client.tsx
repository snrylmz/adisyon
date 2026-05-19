'use client'

import { useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { formatTRY, cn } from '@/lib/utils'
import type { Category, Product } from '@/lib/types'
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  updateCategory,
  updateProduct,
} from '../actions'

type Props = { categories: Category[]; products: Product[] }

type ProductDraft = {
  id?: string
  name: string
  category_id: string
  price: string
  sort_order: string
  active: boolean
}

type CategoryDraft = { id?: string; name: string; sort_order: string }

const EMPTY_PRODUCT: ProductDraft = {
  name: '',
  category_id: '',
  price: '',
  sort_order: '0',
  active: true,
}
const EMPTY_CATEGORY: CategoryDraft = { name: '', sort_order: '0' }

export default function ProductsClient({ categories, products }: Props) {
  const [activeCat, setActiveCat] = useState<string | 'all'>('all')
  const [productModal, setProductModal] = useState<ProductDraft | null>(null)
  const [categoryModal, setCategoryModal] = useState<CategoryDraft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const countByCat = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of products) m.set(p.category_id ?? '__none', (m.get(p.category_id ?? '__none') ?? 0) + 1)
    return m
  }, [products])

  const visibleProducts = useMemo(() => {
    if (activeCat === 'all') return products
    if (activeCat === '__none') return products.filter((p) => !p.category_id)
    return products.filter((p) => p.category_id === activeCat)
  }, [products, activeCat])

  const activeProductCount = products.filter((p) => p.active).length

  function openNewProduct() {
    setError(null)
    setProductModal({
      ...EMPTY_PRODUCT,
      category_id: activeCat !== 'all' && activeCat !== '__none' ? activeCat : '',
    })
  }
  function openEditProduct(p: Product) {
    setError(null)
    setProductModal({
      id: p.id,
      name: p.name,
      category_id: p.category_id ?? '',
      price: String(p.price),
      sort_order: String(p.sort_order),
      active: p.active,
    })
  }

  function saveProduct() {
    if (!productModal) return
    const fd = new FormData()
    fd.set('name', productModal.name.trim())
    fd.set('category_id', productModal.category_id)
    fd.set('price', productModal.price)
    fd.set('sort_order', productModal.sort_order)
    if (productModal.active) fd.set('active', 'on')
    if (!fd.get('name')) {
      setError('Ürün adı boş olamaz')
      return
    }
    if (Number(productModal.price) < 0 || isNaN(Number(productModal.price))) {
      setError('Geçerli bir fiyat gir')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        if (productModal.id) {
          fd.set('id', productModal.id)
          await updateProduct(fd)
        } else {
          await createProduct(fd)
        }
        setProductModal(null)
      } catch (e: any) {
        setError(e?.message ?? 'Bilinmeyen hata')
      }
    })
  }

  function pasifProduct(id: string) {
    if (!confirm('Bu ürünü pasifleştir? Sipariş geçmişi korunur.')) return
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      await deleteProduct(fd)
      setProductModal(null)
    })
  }

  function saveCategory() {
    if (!categoryModal) return
    const fd = new FormData()
    fd.set('name', categoryModal.name.trim())
    fd.set('sort_order', categoryModal.sort_order)
    if (!fd.get('name')) {
      setError('Kategori adı boş olamaz')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        if (categoryModal.id) {
          fd.set('id', categoryModal.id)
          await updateCategory(fd)
        } else {
          await createCategory(fd)
        }
        setCategoryModal(null)
      } catch (e: any) {
        setError(e?.message ?? 'Bilinmeyen hata')
      }
    })
  }

  function silCategory(id: string) {
    if (!confirm('Kategori silinsin mi? Bu kategorideki ürünler "kategorisiz" olur.')) return
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      await deleteCategory(fd)
      setCategoryModal(null)
    })
  }

  return (
    <div>
      {/* Hero header */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Menü</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {activeProductCount} aktif ürün · {categories.length} kategori
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" onClick={() => setCategoryModal(EMPTY_CATEGORY)}>
              <span className="text-base leading-none">+</span> Kategori
            </Button>
            <Button variant="primary" size="md" onClick={openNewProduct}>
              <span className="text-base leading-none">+</span> Yeni Ürün
            </Button>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-3 space-y-1">
          <CatChip
            label="Tümü"
            count={products.length}
            active={activeCat === 'all'}
            onClick={() => setActiveCat('all')}
          />
          {categories.map((c) => (
            <CatChip
              key={c.id}
              label={c.name}
              count={countByCat.get(c.id) ?? 0}
              active={activeCat === c.id}
              onClick={() => setActiveCat(c.id)}
              onEdit={() =>
                setCategoryModal({ id: c.id, name: c.name, sort_order: String(c.sort_order) })
              }
            />
          ))}
          {(countByCat.get('__none') ?? 0) > 0 && (
            <CatChip
              label="Kategorisiz"
              count={countByCat.get('__none') ?? 0}
              active={activeCat === '__none'}
              onClick={() => setActiveCat('__none')}
              muted
            />
          )}
        </aside>

        {/* Grid */}
        <section className="col-span-12 md:col-span-9">
          {visibleProducts.length === 0 ? (
            <EmptyState
              title={products.length === 0 ? 'Henüz ürün yok' : 'Bu kategoride ürün yok'}
              description={
                products.length === 0
                  ? 'İlk ürününü ekleyerek menüyü oluşturmaya başla.'
                  : 'Bu kategoriye ürün ekleyebilir veya başka kategoriye geçebilirsin.'
              }
              cta={
                <Button variant="primary" onClick={openNewProduct}>
                  + Yeni Ürün
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleProducts.map((p) => {
                const cat = categories.find((c) => c.id === p.category_id)
                return (
                  <button
                    key={p.id}
                    onClick={() => openEditProduct(p)}
                    className={cn(
                      'group text-left bg-white rounded-2xl border border-zinc-200 p-4',
                      'hover:border-brand-300 hover:shadow-md hover:-translate-y-0.5 transition-all',
                      'flex flex-col gap-2',
                      !p.active && 'opacity-60',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-zinc-900 leading-tight">{p.name}</div>
                      {!p.active && (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                          Pasif
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-brand-700 tabular-nums">
                      {formatTRY(p.price)}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-zinc-500">
                        {cat?.name ?? <span className="italic">Kategorisiz</span>}
                      </span>
                      <span className="text-xs text-brand-600 opacity-0 group-hover:opacity-100 transition">
                        Düzenle →
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* Product modal */}
      <Modal
        open={!!productModal}
        onClose={() => setProductModal(null)}
        title={productModal?.id ? 'Ürünü düzenle' : 'Yeni ürün'}
        description={productModal?.id ? 'Değişiklikleri kaydet veya pasifleştir.' : undefined}
      >
        {productModal && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              saveProduct()
            }}
            className="space-y-4"
          >
            <Input
              label="Ad"
              autoFocus
              value={productModal.name}
              onChange={(e) => setProductModal({ ...productModal, name: e.target.value })}
              placeholder="Örn. Çikolatalı Pasta"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Fiyat (₺)"
                type="number"
                step="0.01"
                min="0"
                value={productModal.price}
                onChange={(e) => setProductModal({ ...productModal, price: e.target.value })}
                placeholder="0,00"
                required
              />
              <Input
                label="Sıra"
                type="number"
                value={productModal.sort_order}
                onChange={(e) =>
                  setProductModal({ ...productModal, sort_order: e.target.value })
                }
              />
            </div>
            <Select
              label="Kategori"
              value={productModal.category_id}
              onChange={(e) =>
                setProductModal({ ...productModal, category_id: e.target.value })
              }
            >
              <option value="">— Kategorisiz —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {productModal.id && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={productModal.active}
                  onChange={(e) =>
                    setProductModal({ ...productModal, active: e.target.checked })
                  }
                  className="w-4 h-4 accent-brand-600"
                />
                <span className="text-zinc-700">Aktif (menüde gösterilsin)</span>
              </label>
            )}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}
            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" variant="primary" disabled={pending} className="flex-1">
                {pending ? 'Kaydediliyor...' : productModal.id ? 'Kaydet' : 'Ürün Ekle'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setProductModal(null)}
                disabled={pending}
              >
                Vazgeç
              </Button>
            </div>
            {productModal.id && (
              <div className="pt-3 mt-2 border-t border-zinc-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => pasifProduct(productModal.id!)}
                  disabled={pending}
                  className="text-xs text-red-600 hover:text-red-700 hover:underline"
                >
                  Ürünü pasifleştir
                </button>
              </div>
            )}
          </form>
        )}
      </Modal>

      {/* Category modal */}
      <Modal
        open={!!categoryModal}
        onClose={() => setCategoryModal(null)}
        title={categoryModal?.id ? 'Kategoriyi düzenle' : 'Yeni kategori'}
        size="sm"
      >
        {categoryModal && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              saveCategory()
            }}
            className="space-y-4"
          >
            <Input
              label="Ad"
              autoFocus
              value={categoryModal.name}
              onChange={(e) => setCategoryModal({ ...categoryModal, name: e.target.value })}
              placeholder="Örn. Tatlılar"
              required
            />
            <Input
              label="Sıralama"
              type="number"
              value={categoryModal.sort_order}
              onChange={(e) =>
                setCategoryModal({ ...categoryModal, sort_order: e.target.value })
              }
              hint="Küçük sayı önce gelir"
            />
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}
            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" variant="primary" disabled={pending} className="flex-1">
                {pending ? 'Kaydediliyor...' : categoryModal.id ? 'Kaydet' : 'Kategori Ekle'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCategoryModal(null)}
                disabled={pending}
              >
                Vazgeç
              </Button>
            </div>
            {categoryModal.id && (
              <div className="pt-3 mt-2 border-t border-zinc-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => silCategory(categoryModal.id!)}
                  disabled={pending}
                  className="text-xs text-red-600 hover:text-red-700 hover:underline"
                >
                  Kategoriyi sil
                </button>
              </div>
            )}
          </form>
        )}
      </Modal>
    </div>
  )
}

function CatChip({
  label,
  count,
  active,
  onClick,
  onEdit,
  muted,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  onEdit?: () => void
  muted?: boolean
}) {
  return (
    <div
      className={cn(
        'group flex items-center rounded-xl transition-all',
        active ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-zinc-50',
      )}
    >
      <button
        onClick={onClick}
        className={cn(
          'flex-1 flex items-center justify-between px-3.5 py-2.5 text-left',
          active ? 'text-brand-800' : muted ? 'text-zinc-500' : 'text-zinc-700',
        )}
      >
        <span className="font-medium">{label}</span>
        <span
          className={cn(
            'text-xs tabular-nums font-semibold px-2 py-0.5 rounded-full',
            active ? 'bg-brand-200 text-brand-900' : 'bg-zinc-100 text-zinc-600',
          )}
        >
          {count}
        </span>
      </button>
      {onEdit && (
        <button
          onClick={onEdit}
          aria-label="Düzenle"
          className="opacity-0 group-hover:opacity-100 transition px-2 text-zinc-400 hover:text-brand-600"
        >
          ✎
        </button>
      )}
    </div>
  )
}

function EmptyState({
  title,
  description,
  cta,
}: {
  title: string
  description: string
  cta: React.ReactNode
}) {
  return (
    <div className="bg-white border-2 border-dashed border-zinc-200 rounded-2xl py-16 px-6 text-center">
      <div className="text-5xl mb-4">🧁</div>
      <h3 className="text-lg font-bold text-zinc-900">{title}</h3>
      <p className="text-sm text-zinc-500 mt-1 mb-6 max-w-sm mx-auto">{description}</p>
      {cta}
    </div>
  )
}
