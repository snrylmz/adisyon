import { supabaseAdmin } from '@/lib/supabase/server'
import type { Order, OrderItem, Profile, Table } from '@/lib/types'
import { hourInTR, type DateRange } from '@/lib/dates'

export type ReportOrder = Order & {
  table_name: string | null
  opened_by_name: string | null
  closed_by_name: string | null
  items: OrderItem[]
}

export type ReportSummary = {
  range: DateRange
  revenue: number
  orderCount: number
  itemCount: number
  avgTicket: number
  cancelledCount: number
  cancelledAmount: number
  topProducts: { name: string; quantity: number; revenue: number }[]
  hourly: { hour: number; revenue: number; count: number }[]
  waiterSales: { id: string | null; name: string; revenue: number; orderCount: number }[]
  categoryShare: { name: string; revenue: number }[]
  paymentsByType: { type: string; label: string; revenue: number; count: number }[]
  discountTotal: number
  takeawayCount: number
  takeawayRevenue: number
  orders: ReportOrder[]
}

type Opts = {
  range: DateRange
  status?: 'closed' | 'cancelled' | 'all_closed'
}

async function loadOrders(range: DateRange) {
  const sb = supabaseAdmin()
  // closed + cancelled orders within range
  const { data, error } = await sb
    .from('orders')
    .select('*, order_items(*)')
    .in('status', ['closed', 'cancelled'])
    .gte('closed_at', range.fromISO)
    .lte('closed_at', range.toISO)
    .order('closed_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as any[]
}

async function loadDirectory() {
  const sb = supabaseAdmin()
  const [{ data: tables }, { data: profiles }, { data: products }] = await Promise.all([
    sb.from('tables').select('id,name'),
    sb.from('profiles').select('id,name,role'),
    sb.from('products').select('id,name,category_id'),
  ])
  return {
    tablesById: new Map((tables ?? []).map((t: any) => [t.id, t.name as string])),
    profilesById: new Map((profiles ?? []).map((p: any) => [p.id, p as Profile])),
    productsById: new Map((products ?? []).map((p: any) => [p.id, p as any])),
  }
}

async function loadCategories() {
  const sb = supabaseAdmin()
  const { data } = await sb.from('categories').select('id,name')
  return new Map((data ?? []).map((c: any) => [c.id as string, c.name as string]))
}

export async function buildReport(range: DateRange): Promise<ReportSummary> {
  const [rawOrders, dir, catsById] = await Promise.all([
    loadOrders(range),
    loadDirectory(),
    loadCategories(),
  ])

  const orders: ReportOrder[] = rawOrders.map((o) => ({
    id: o.id,
    table_id: o.table_id,
    status: o.status,
    opened_at: o.opened_at,
    closed_at: o.closed_at,
    opened_by: o.opened_by,
    closed_by: o.closed_by,
    subtotal: Number(o.subtotal ?? 0),
    discount: Number(o.discount ?? 0),
    discount_reason: o.discount_reason ?? null,
    payment_type: o.payment_type ?? null,
    total: Number(o.total),
    table_name: o.table_id ? dir.tablesById.get(o.table_id) ?? null : null,
    opened_by_name: o.opened_by ? dir.profilesById.get(o.opened_by)?.name ?? null : null,
    closed_by_name: o.closed_by ? dir.profilesById.get(o.closed_by)?.name ?? null : null,
    items: ((o.order_items ?? []) as any[]).map((it) => ({
      ...it,
      unit_price: Number(it.unit_price),
    })),
  }))

  const closedOrders = orders.filter((o) => o.status === 'closed')
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled')

  const revenue = closedOrders.reduce((s, o) => s + o.total, 0)
  const orderCount = closedOrders.length
  const cancelledCount = cancelledOrders.length
  const cancelledAmount = cancelledOrders.reduce((s, o) => s + o.total, 0)
  const itemCount = closedOrders.reduce(
    (s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0),
    0,
  )

  // Ödeme tipi kırılımı (sadece closed)
  const PAYMENT_LABELS: Record<string, string> = {
    cash: 'Nakit',
    card: 'Kart',
    transfer: 'Havale',
    other: 'Diğer',
    null: 'Belirsiz',
  }
  const payAgg = new Map<string, { type: string; label: string; revenue: number; count: number }>()
  for (const o of closedOrders) {
    const key = (o as any).payment_type ?? 'null'
    const cur = payAgg.get(key) ?? {
      type: key,
      label: PAYMENT_LABELS[key] ?? key,
      revenue: 0,
      count: 0,
    }
    cur.revenue += o.total
    cur.count += 1
    payAgg.set(key, cur)
  }

  // İskonto toplamı (sadece closed)
  const discountTotal = closedOrders.reduce(
    (s, o) => s + Number((o as any).discount ?? 0),
    0,
  )

  // Paket / takeaway kırılımı (table_id null)
  const takeawayOrders = closedOrders.filter((o) => !o.table_id)
  const takeawayCount = takeawayOrders.length
  const takeawayRevenue = takeawayOrders.reduce((s, o) => s + o.total, 0)

  // Top products
  const productAgg = new Map<string, { name: string; quantity: number; revenue: number }>()
  // Category share
  const categoryAgg = new Map<string, { name: string; revenue: number }>()
  // Hourly
  const hourlyAgg = new Map<number, { hour: number; revenue: number; count: number }>()
  for (let h = 0; h < 24; h++) hourlyAgg.set(h, { hour: h, revenue: 0, count: 0 })

  // Waiter sales (opened_by = who took the order)
  const waiterAgg = new Map<string | null, { id: string | null; name: string; revenue: number; orderCount: number }>()

  // Agregasyonlar SADECE kapanmış (gerçekleşmiş) adisyonlardan
  for (const o of closedOrders) {
    // hourly
    const hour = hourInTR(o.closed_at ?? o.opened_at)
    const h = hourlyAgg.get(hour)!
    h.revenue += o.total
    h.count += 1

    // waiter
    const key = o.opened_by ?? null
    const name = o.opened_by_name ?? 'Bilinmiyor'
    const w = waiterAgg.get(key) ?? { id: key, name, revenue: 0, orderCount: 0 }
    w.revenue += o.total
    w.orderCount += 1
    waiterAgg.set(key, w)

    for (const it of o.items) {
      const pKey = it.product_name
      const cur = productAgg.get(pKey) ?? { name: pKey, quantity: 0, revenue: 0 }
      cur.quantity += it.quantity
      cur.revenue += Number(it.unit_price) * it.quantity
      productAgg.set(pKey, cur)

      const prod = it.product_id ? dir.productsById.get(it.product_id) : null
      const catName = prod?.category_id ? catsById.get(prod.category_id) ?? null : null
      const catKey = catName ?? 'Kategorisiz'
      const c = categoryAgg.get(catKey) ?? { name: catKey, revenue: 0 }
      c.revenue += Number(it.unit_price) * it.quantity
      categoryAgg.set(catKey, c)
    }
  }

  return {
    range,
    revenue,
    orderCount,
    itemCount,
    avgTicket: orderCount > 0 ? revenue / orderCount : 0,
    cancelledCount,
    cancelledAmount,
    topProducts: Array.from(productAgg.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10),
    hourly: Array.from(hourlyAgg.values()),
    waiterSales: Array.from(waiterAgg.values()).sort((a, b) => b.revenue - a.revenue),
    categoryShare: Array.from(categoryAgg.values()).sort((a, b) => b.revenue - a.revenue),
    paymentsByType: Array.from(payAgg.values()).sort((a, b) => b.revenue - a.revenue),
    discountTotal,
    takeawayCount,
    takeawayRevenue,
    orders,
  }
}

// ---------- Geçmiş adisyonlar listesi (paginated) ----------

export async function listClosedOrders(opts: {
  range: DateRange
  page?: number
  pageSize?: number
  search?: string
}) {
  const sb = supabaseAdmin()
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = Math.min(100, opts.pageSize ?? 25)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let q = sb
    .from('orders')
    .select('*, order_items(id,quantity)', { count: 'exact' })
    .in('status', ['closed', 'cancelled'])
    .gte('closed_at', opts.range.fromISO)
    .lte('closed_at', opts.range.toISO)
    .order('closed_at', { ascending: false })
    .range(from, to)

  const { data, error, count } = await q
  if (error) throw error

  const dir = await loadDirectory()
  const items = (data ?? []).map((o: any) => ({
    id: o.id as string,
    table_id: (o.table_id ?? null) as string | null,
    table_name: o.table_id ? dir.tablesById.get(o.table_id) ?? '—' : null,
    is_takeaway: !o.table_id,
    status: o.status as string,
    opened_at: o.opened_at as string,
    closed_at: o.closed_at as string,
    total: Number(o.total),
    payment_type: (o.payment_type ?? null) as string | null,
    item_count: (o.order_items ?? []).reduce((s: number, i: any) => s + i.quantity, 0),
    closed_by_name: o.closed_by ? dir.profilesById.get(o.closed_by)?.name ?? null : null,
    opened_by_name: o.opened_by ? dir.profilesById.get(o.opened_by)?.name ?? null : null,
  }))

  return { items, total: count ?? 0, page, pageSize }
}

export async function getClosedOrderDetail(id: string) {
  const sb = supabaseAdmin()
  const { data: order } = await sb.from('orders').select('*').eq('id', id).maybeSingle()
  if (!order) return null
  const { data: items } = await sb
    .from('order_items')
    .select('*')
    .eq('order_id', id)
    .order('created_at')
  const dir = await loadDirectory()
  return {
    order: {
      ...order,
      total: Number((order as any).total),
      table_name: dir.tablesById.get((order as any).table_id) ?? '—',
      opened_by_name: (order as any).opened_by
        ? dir.profilesById.get((order as any).opened_by)?.name ?? null
        : null,
      closed_by_name: (order as any).closed_by
        ? dir.profilesById.get((order as any).closed_by)?.name ?? null
        : null,
    },
    items: ((items ?? []) as any[]).map((i) => ({ ...i, unit_price: Number(i.unit_price) })),
  }
}
