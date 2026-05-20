'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import type { Table } from '@/lib/types'
import { createTable, deleteTable, updateTable } from '../actions'

type Draft = { id?: string; name: string; sort_order: string }

const EMPTY: Draft = { name: '', sort_order: '0' }

export default function TablesAdminClient({ tables }: { tables: Table[] }) {
  const [editing, setEditing] = useState<Draft | null>(null)
  const [bulk, setBulk] = useState<{ open: boolean; prefix: string; start: string; count: string }>({
    open: false,
    prefix: 'Masa',
    start: '1',
    count: '5',
  })
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function openNew() {
    setError(null)
    const nextSort = tables.length > 0 ? Math.max(...tables.map((t) => t.sort_order)) + 1 : 0
    setEditing({ ...EMPTY, sort_order: String(nextSort) })
  }
  function openEdit(t: Table) {
    setError(null)
    setEditing({ id: t.id, name: t.name, sort_order: String(t.sort_order) })
  }

  function save() {
    if (!editing) return
    const fd = new FormData()
    fd.set('name', editing.name.trim())
    fd.set('sort_order', editing.sort_order)
    if (!fd.get('name')) {
      setError('Masa adı boş olamaz')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        if (editing.id) {
          fd.set('id', editing.id)
          await updateTable(fd)
        } else {
          await createTable(fd)
        }
        setEditing(null)
      } catch (e: any) {
        setError(e?.message ?? 'Bilinmeyen hata')
      }
    })
  }

  function sil(id: string) {
    if (!confirm('Bu masa silinsin mi? Açık adisyonu varsa silinemez.')) return
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      try {
        await deleteTable(fd)
        setEditing(null)
      } catch (e: any) {
        setError(e?.message ?? 'Silme başarısız')
      }
    })
  }

  function doBulk() {
    const start = parseInt(bulk.start, 10)
    const count = parseInt(bulk.count, 10)
    const prefix = bulk.prefix.trim()
    if (!prefix || isNaN(start) || isNaN(count) || count <= 0 || count > 50) {
      setError('Geçerli prefix, başlangıç ve adet (1-50) gir')
      return
    }
    setError(null)
    const baseSort = tables.length > 0 ? Math.max(...tables.map((t) => t.sort_order)) + 1 : 0
    startTransition(async () => {
      try {
        for (let i = 0; i < count; i++) {
          const fd = new FormData()
          fd.set('name', `${prefix} ${start + i}`)
          fd.set('sort_order', String(baseSort + i))
          await createTable(fd)
        }
        setBulk({ ...bulk, open: false })
      } catch (e: any) {
        setError(e?.message ?? 'Toplu ekleme başarısız')
      }
    })
  }

  return (
    <div>
      {/* Hero */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Masa Düzeni</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {tables.length} masa · Sıra numarası küçük olan önce gelir
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/tables/qr"
              className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl bg-white border border-zinc-300 hover:bg-zinc-50 text-sm font-semibold text-zinc-700 shadow-sm transition"
            >
              ⊞ Toplu QR
            </Link>
            <Button variant="secondary" onClick={() => setBulk({ ...bulk, open: true })}>
              Toplu Ekle
            </Button>
            <Button variant="primary" onClick={openNew}>
              <span className="text-base leading-none">+</span> Yeni Masa
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {tables.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-zinc-200 rounded-2xl py-16 px-6 text-center">
            <div className="text-5xl mb-4">🪑</div>
            <h3 className="text-lg font-bold text-zinc-900">Henüz masa yok</h3>
            <p className="text-sm text-zinc-500 mt-1 mb-6 max-w-sm mx-auto">
              Pastanenin yerleşimine uygun şekilde masaları ekleyerek başla. İstersen tek tek
              veya toplu olarak.
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button variant="secondary" onClick={() => setBulk({ ...bulk, open: true })}>
                Toplu Ekle
              </Button>
              <Button variant="primary" onClick={openNew}>
                + Yeni Masa
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {tables.map((t, i) => (
              <TableTile key={t.id} table={t} index={i + 1} onEdit={() => openEdit(t)} />
            ))}
            <button
              onClick={openNew}
              className={cn(
                'rounded-2xl border-2 border-dashed border-zinc-300 hover:border-brand-400 hover:bg-brand-50/30',
                'min-h-[120px] flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-brand-600 transition-all active:scale-95',
              )}
            >
              <span className="text-3xl leading-none">+</span>
              <span className="text-xs font-semibold">Masa Ekle</span>
            </button>
          </div>
        )}
      </div>

      {/* Edit/Create modal */}
      <Modal
        open={!!editing}
        onClose={() => !pending && setEditing(null)}
        title={editing?.id ? 'Masayı düzenle' : 'Yeni masa'}
        size="sm"
      >
        {editing && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
            className="space-y-4"
          >
            <Input
              label="Masa adı"
              autoFocus
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="Örn. Masa 9, Teras 1, Bar 2"
              required
            />
            <Input
              label="Sıralama"
              type="number"
              value={editing.sort_order}
              onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })}
              hint="Küçük sayı önce gelir. Aynı sıra varsa isim sırasına göre dizilir."
            />
            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg font-medium">
                {error}
              </div>
            )}
            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" variant="primary" disabled={pending} className="flex-1">
                {pending ? 'Kaydediliyor...' : editing.id ? 'Kaydet' : 'Masa Ekle'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing(null)}
                disabled={pending}
              >
                Vazgeç
              </Button>
            </div>
            {editing.id && (
              <div className="pt-3 mt-2 border-t border-zinc-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => sil(editing.id!)}
                  disabled={pending}
                  className="text-xs text-red-600 hover:text-red-700 hover:underline"
                >
                  Masayı sil
                </button>
              </div>
            )}
          </form>
        )}
      </Modal>

      {/* Bulk add modal */}
      <Modal
        open={bulk.open}
        onClose={() => !pending && setBulk({ ...bulk, open: false })}
        title="Toplu masa ekle"
        description="İsim önekiyle ardışık masalar oluştur"
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            doBulk()
          }}
          className="space-y-4"
        >
          <Input
            label="İsim öneki"
            value={bulk.prefix}
            onChange={(e) => setBulk({ ...bulk, prefix: e.target.value })}
            placeholder="Masa"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Başlangıç"
              type="number"
              value={bulk.start}
              onChange={(e) => setBulk({ ...bulk, start: e.target.value })}
            />
            <Input
              label="Adet"
              type="number"
              min="1"
              max="50"
              value={bulk.count}
              onChange={(e) => setBulk({ ...bulk, count: e.target.value })}
            />
          </div>
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs text-zinc-600">
            Önizleme:{' '}
            <span className="font-semibold text-zinc-900">
              {bulk.prefix} {bulk.start}
            </span>
            ,{' '}
            <span className="font-semibold text-zinc-900">
              {bulk.prefix} {parseInt(bulk.start, 10) + 1 || '?'}
            </span>
            , ...{' '}
            <span className="font-semibold text-zinc-900">
              {bulk.prefix}{' '}
              {parseInt(bulk.start, 10) + (parseInt(bulk.count, 10) - 1) || '?'}
            </span>
          </div>
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg font-medium">
              {error}
            </div>
          )}
          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" variant="primary" disabled={pending} className="flex-1">
              {pending ? 'Ekleniyor...' : `${bulk.count || 0} masa ekle`}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setBulk({ ...bulk, open: false })}
              disabled={pending}
            >
              Vazgeç
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function TableTile({
  table,
  index,
  onEdit,
}: {
  table: Table
  index: number
  onEdit: () => void
}) {
  return (
    <div
      className={cn(
        'group relative bg-white rounded-2xl border border-zinc-200 hover:border-brand-300 hover:shadow-md',
        'transition-all min-h-[120px] p-4 flex flex-col justify-between',
      )}
    >
      <button onClick={onEdit} className="absolute inset-0 w-full h-full" aria-label="Düzenle" />
      <div className="flex items-start justify-between relative">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-100 text-zinc-500 text-xs font-bold tabular-nums">
          {index}
        </span>
        <Link
          href={`/admin/tables/qr/${table.id}`}
          onClick={(e) => e.stopPropagation()}
          className="relative inline-flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-100 hover:bg-brand-100 text-zinc-500 hover:text-brand-700 text-xs font-bold transition"
          title="QR Kodunu Göster"
        >
          ⊞
        </Link>
      </div>
      <div className="relative pointer-events-none">
        <div className="font-bold text-zinc-900 text-lg leading-tight tracking-tight">
          {table.name}
        </div>
        <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 mt-1">
          Sıra · {table.sort_order}
        </div>
      </div>
    </div>
  )
}
