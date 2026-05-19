'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { cn, formatTRY } from '@/lib/utils'
import type { Role, TableWithOrder } from '@/lib/types'

type Filter = 'all' | 'open' | 'free'

export default function TablesGrid({
  initialTables,
  role,
}: {
  initialTables: TableWithOrder[]
  role: Role
}) {
  const [tables, setTables] = useState<TableWithOrder[]>(initialTables)
  const [filter, setFilter] = useState<Filter>('all')
  const canSeeRevenue = role === 'admin' || role === 'cashier'

  useEffect(() => {
    const sb = supabaseBrowser()

    async function refresh() {
      const { data: rawTables } = await sb.from('tables').select('*').order('sort_order')
      const { data: orders } = await sb
        .from('orders')
        .select('*, order_items(id)')
        .eq('status', 'open')
      const byTable = new Map<string, any>()
      for (const o of (orders ?? []) as any[]) byTable.set(o.table_id, o)
      const next: TableWithOrder[] = (rawTables ?? []).map((t: any) => {
        const o = byTable.get(t.id)
        return {
          ...t,
          open_order: o
            ? {
                id: o.id,
                table_id: o.table_id,
                status: o.status,
                opened_at: o.opened_at,
                closed_at: o.closed_at,
                opened_by: o.opened_by,
                closed_by: o.closed_by,
                total: Number(o.total),
                items_count: (o.order_items ?? []).length,
              }
            : null,
        }
      })
      setTables(next)
    }

    const channel = sb
      .channel('tables-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, refresh)
      .subscribe()

    return () => {
      sb.removeChannel(channel)
    }
  }, [])

  const stats = useMemo(() => {
    let open = 0
    let total = 0
    for (const t of tables) {
      if (t.open_order) {
        open++
        total += Number(t.open_order.total)
      }
    }
    return { open, free: tables.length - open, total }
  }, [tables])

  const visible = useMemo(() => {
    if (filter === 'open') return tables.filter((t) => t.open_order)
    if (filter === 'free') return tables.filter((t) => !t.open_order)
    return tables
  }, [tables, filter])

  return (
    <div>
      {/* Hero */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Masalar</h1>
              <p className="text-sm text-zinc-500 mt-1">Açık adisyonu görmek için bir masaya dokun</p>
            </div>
            <div className="flex items-center gap-2">
              <StatCard label="Açık" value={stats.open} tone="red" />
              <StatCard label="Boş" value={stats.free} tone="green" />
              {canSeeRevenue && (
                <StatCard label="Anlık Ciro" value={formatTRY(stats.total)} tone="brand" wide />
              )}
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex gap-1 mt-5">
            <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
              Tümü <Badge>{tables.length}</Badge>
            </Chip>
            <Chip active={filter === 'open'} onClick={() => setFilter('open')}>
              Açık <Badge active={filter === 'open'}>{stats.open}</Badge>
            </Chip>
            <Chip active={filter === 'free'} onClick={() => setFilter('free')}>
              Boş <Badge active={filter === 'free'}>{stats.free}</Badge>
            </Chip>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {tables.length === 0 ? (
          <div className="text-center py-20 bg-white border-2 border-dashed border-zinc-200 rounded-2xl">
            <div className="text-5xl mb-4">🪑</div>
            <h3 className="text-lg font-bold text-zinc-900">Henüz masa yok</h3>
            <p className="text-sm text-zinc-500 mt-1 mb-6">İlk masanı oluşturarak başla</p>
            <Link
              href="/admin/tables"
              className="inline-flex items-center h-11 px-5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold shadow-sm shadow-brand-600/20"
            >
              Masa ekle →
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-zinc-400">Bu filtrede masa yok</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {visible.map((t) => (
              <TableCard key={t.id} table={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TableCard({ table }: { table: TableWithOrder }) {
  const occupied = !!table.open_order
  return (
    <Link
      href={`/tables/${table.id}`}
      className={cn(
        'group relative rounded-2xl border p-4 min-h-[130px] flex flex-col justify-between transition-all',
        'hover:-translate-y-0.5 active:scale-[0.98]',
        occupied
          ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200 hover:shadow-lg hover:shadow-red-200/50'
          : 'bg-white border-zinc-200 hover:border-emerald-300 hover:shadow-md',
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            'text-lg font-bold tracking-tight',
            occupied ? 'text-red-900' : 'text-zinc-900',
          )}
        >
          {table.name}
        </div>
        <div
          className={cn(
            'w-2.5 h-2.5 rounded-full',
            occupied ? 'bg-red-500 ring-4 ring-red-200' : 'bg-emerald-400 ring-4 ring-emerald-100',
          )}
        />
      </div>
      <div>
        {occupied ? (
          <>
            <div className="text-2xl font-bold text-red-900 tabular-nums leading-none">
              {formatTRY(table.open_order!.total)}
            </div>
            <div className="text-xs text-red-700/80 mt-1.5 flex items-center gap-2">
              <span className="font-medium">{table.open_order!.items_count} ürün</span>
              <span className="opacity-50">·</span>
              <Elapsed iso={table.open_order!.opened_at} />
            </div>
          </>
        ) : (
          <div className="text-sm text-zinc-500 group-hover:text-emerald-700 transition">
            Sipariş için dokun
          </div>
        )}
      </div>
    </Link>
  )
}

function Elapsed({ iso }: { iso: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])
  const mins = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000))
  const text = mins < 60 ? `${mins} dk` : `${Math.floor(mins / 60)}sa ${mins % 60}dk`
  return <span>{text}</span>
}

function StatCard({
  label,
  value,
  tone,
  wide,
}: {
  label: string
  value: number | string
  tone: 'red' | 'green' | 'brand'
  wide?: boolean
}) {
  const tones = {
    red: 'bg-red-50 text-red-900 ring-red-200',
    green: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
    brand: 'bg-brand-50 text-brand-900 ring-brand-200',
  }
  return (
    <div
      className={cn(
        'rounded-xl ring-1 px-4 py-2.5',
        tones[tone],
        wide ? 'min-w-[140px]' : 'min-w-[80px]',
      )}
    >
      <div className="text-[10px] uppercase tracking-wider font-bold opacity-70">{label}</div>
      <div className="text-xl font-bold tabular-nums leading-tight">{value}</div>
    </div>
  )
}

function Chip({
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
        'h-9 px-3.5 rounded-full text-sm font-semibold transition flex items-center gap-2',
        active
          ? 'bg-zinc-900 text-white'
          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
      )}
    >
      {children}
    </button>
  )
}

function Badge({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'text-[11px] tabular-nums font-bold px-1.5 py-0.5 rounded-full',
        active ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700',
      )}
    >
      {children}
    </span>
  )
}
