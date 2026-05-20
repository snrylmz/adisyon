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
  saveCampaign,
  updateCategory,
  updateProduct,
  uploadProductImage,
} from '../actions'

type Props = {
  categories: Category[]
  products: Product[]
  campaign: { text: string; active: boolean }
}

type ProductDraft = {
  id?: string
  name: string
  category_id: string
  price: string
  sort_order: string
  active: boolean
  image_url: string | null
}

type CategoryDraft = { id?: string; name: string; sort_order: string }

const EMPTY_PRODUCT: ProductDraft = {
  name: '',
  category_id: '',
  price: '',
  sort_order: '0',
  active: true,
  image_url: null,
}

// Görseli tarayıcıda küçült (max 800px genişlik, jpeg %82) → upload boyutu düşer
async function resizeImage(file: File, maxW = 800): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxW / bitmap.width)
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Görsel işlenemedi'))),
      'image/jpeg',
      0.82,
    ),
  )
}
const EMPTY_CATEGORY: CategoryDraft = { name: '', sort_order: '0' }

export default function ProductsClient({ categories, products, campaign }: Props) {
  const [activeCat, setActiveCat] = useState<string | 'all'>('all')
  const [productModal, setProductModal] = useState<ProductDraft | null>(null)
  const [categoryModal, setCategoryModal] = useState<CategoryDraft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [imageUploading, setImageUploading] = useState(false)
  const [campaignText, setCampaignText] = useState(campaign.text)
  const [campaignActive, setCampaignActive] = useState(campaign.active)
  const [campaignSaved, setCampaignSaved] = useState(false)

  function saveCampaignSettings() {
    const fd = new FormData()
    fd.set('text', campaignText)
    if (campaignActive) fd.set('active', 'on')
    startTransition(async () => {
      await saveCampaign(fd)
      setCampaignSaved(true)
      setTimeout(() => setCampaignSaved(false), 2000)
    })
  }

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
      image_url: p.image_url,
    })
  }

  async function handleImagePick(file: File) {
    if (!productModal) return
    setError(null)
    setImageUploading(true)
    try {
      const blob = await resizeImage(file)
      const fd = new FormData()
      fd.set('file', new File([blob], 'product.jpg', { type: 'image/jpeg' }))
      const url = await uploadProductImage(fd)
      setProductModal((prev) => (prev ? { ...prev, image_url: url } : prev))
    } catch (e: any) {
      setError(e?.message ?? 'Görsel yüklenemedi')
    } finally {
      setImageUploading(false)
    }
  }

  function saveProduct() {
    if (!productModal) return
    const fd = new FormData()
    fd.set('name', productModal.name.trim())
    fd.set('category_id', productModal.category_id)
    fd.set('price', productModal.price)
    fd.set('sort_order', productModal.sort_order)
    if (productModal.active) fd.set('active', 'on')
    fd.set('image_url', productModal.image_url ?? '')
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

      {/* Kampanya banner ayarı */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <div className="bg-white rounded-2xl border border-zinc-200 p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">📣</span>
              <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-600">
                Müşteri Menüsü Duyurusu
              </h2>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={campaignActive}
                onChange={(e) => setCampaignActive(e.target.checked)}
                className="w-4 h-4 accent-brand-600"
              />
              <span className="text-zinc-700">Yayında</span>
            </label>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={campaignText}
              onChange={(e) => setCampaignText(e.target.value)}
              maxLength={200}
              placeholder="Örn. Bugün taze çilekli tart! 🍓"
              className="flex-1 h-11 px-3.5 rounded-xl bg-white border border-zinc-300 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <Button variant="primary" onClick={saveCampaignSettings} disabled={pending}>
              {campaignSaved ? '✓ Kaydedildi' : 'Kaydet'}
            </Button>
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            QR menüde en üstte gösterilir. "Yayında" kapalıysa müşteri görmez.
          </p>
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
                      'flex gap-3',
                      !p.active && 'opacity-60',
                    )}
                  >
                    <div className="w-16 h-16 rounded-xl bg-zinc-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl opacity-30">🍰</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-zinc-900 leading-tight">{p.name}</div>
                        {!p.active && (
                          <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded shrink-0">
                            Pasif
                          </span>
                        )}
                      </div>
                      <div className="text-xl font-bold text-brand-700 tabular-nums">
                        {formatTRY(p.price)}
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-xs text-zinc-500 truncate">
                          {cat?.name ?? <span className="italic">Kategorisiz</span>}
                        </span>
                        <span className="text-xs text-brand-600 opacity-0 group-hover:opacity-100 transition shrink-0">
                          Düzenle →
                        </span>
                      </div>
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
            {/* Görsel */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1.5">
                Görsel
              </div>
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center shrink-0">
                  {productModal.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={productModal.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl opacity-30">🍰</span>
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-white border border-zinc-300 hover:bg-zinc-50 text-sm font-semibold text-zinc-700 cursor-pointer transition">
                    {imageUploading ? 'Yükleniyor...' : productModal.image_url ? 'Değiştir' : 'Foto Yükle'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={imageUploading}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleImagePick(f)
                        e.target.value = ''
                      }}
                    />
                  </label>
                  {productModal.image_url && (
                    <button
                      type="button"
                      onClick={() => setProductModal({ ...productModal, image_url: null })}
                      className="block text-xs text-red-600 hover:underline"
                    >
                      Görseli kaldır
                    </button>
                  )}
                </div>
              </div>
            </div>

            <Input
              label="Ad"
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
