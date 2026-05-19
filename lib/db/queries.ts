import { supabaseAdmin } from '@/lib/supabase/server'
import type { Category, Order, OrderItem, Product, Profile, Table, TableWithOrder } from '@/lib/types'

// ---------- Profiles ----------

export async function findProfileByPin(pin: string): Promise<Profile | null> {
  const sb = supabaseAdmin()
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('pin', pin)
    .eq('active', true)
    .maybeSingle()
  if (error) throw error
  return data as Profile | null
}

export async function getProfile(id: string): Promise<Profile | null> {
  const sb = supabaseAdmin()
  const { data, error } = await sb.from('profiles').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as Profile | null
}

export async function listProfiles(): Promise<Profile[]> {
  const sb = supabaseAdmin()
  const { data, error } = await sb.from('profiles').select('*').order('created_at')
  if (error) throw error
  return (data ?? []) as Profile[]
}

// ---------- Categories & Products ----------

export async function listCategories(): Promise<Category[]> {
  const sb = supabaseAdmin()
  const { data, error } = await sb.from('categories').select('*').order('sort_order')
  if (error) throw error
  return (data ?? []) as Category[]
}

export async function listProducts(opts: { onlyActive?: boolean } = {}): Promise<Product[]> {
  const sb = supabaseAdmin()
  let q = sb.from('products').select('*').order('sort_order')
  if (opts.onlyActive) q = q.eq('active', true)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as Product[]
}

// ---------- Tables ----------

export async function listTables(): Promise<Table[]> {
  const sb = supabaseAdmin()
  const { data, error } = await sb.from('tables').select('*').order('sort_order')
  if (error) throw error
  return (data ?? []) as Table[]
}

export async function listTablesWithOpenOrders(): Promise<TableWithOrder[]> {
  const sb = supabaseAdmin()
  const { data: tables, error: tErr } = await sb.from('tables').select('*').order('sort_order')
  if (tErr) throw tErr
  const { data: orders, error: oErr } = await sb
    .from('orders')
    .select('*, order_items(id)')
    .eq('status', 'open')
  if (oErr) throw oErr
  const byTable = new Map<string, any>()
  for (const o of orders ?? []) byTable.set(o.table_id, o)
  return (tables ?? []).map((t: any) => {
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
}

// ---------- Orders ----------

export async function getOpenOrderForTable(tableId: string): Promise<{ order: Order; items: OrderItem[] } | null> {
  const sb = supabaseAdmin()
  const { data: order, error } = await sb
    .from('orders')
    .select('*')
    .eq('table_id', tableId)
    .eq('status', 'open')
    .maybeSingle()
  if (error) throw error
  if (!order) return null
  const { data: items, error: iErr } = await sb
    .from('order_items')
    .select('*')
    .eq('order_id', order.id)
    .order('created_at')
  if (iErr) throw iErr
  return { order: order as Order, items: (items ?? []) as OrderItem[] }
}

export async function getOrder(id: string): Promise<{ order: Order; items: OrderItem[] } | null> {
  const sb = supabaseAdmin()
  const { data: order, error } = await sb.from('orders').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!order) return null
  const { data: items, error: iErr } = await sb
    .from('order_items')
    .select('*')
    .eq('order_id', id)
    .order('created_at')
  if (iErr) throw iErr
  return { order: order as Order, items: (items ?? []) as OrderItem[] }
}
