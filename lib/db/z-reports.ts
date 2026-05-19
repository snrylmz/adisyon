import { supabaseAdmin } from '@/lib/supabase/server'
import { buildReport } from '@/lib/db/reports'
import type { DateRange } from '@/lib/dates'

export type ZReportRow = {
  id: string
  sequence_no: number
  opened_at: string
  closed_at: string
  closed_by: string | null
  revenue: number
  order_count: number
  item_count: number
  cancelled_count: number
  cancelled_amount: number
  avg_ticket: number
  top_products: { name: string; quantity: number; revenue: number }[] | null
  waiter_sales: { id: string | null; name: string; revenue: number; orderCount: number }[] | null
  category_share: { name: string; revenue: number }[] | null
  hourly: { hour: number; revenue: number; count: number }[] | null
  created_at: string
  closed_by_name?: string | null
}

function rangeFromISOs(fromISO: string, toISO: string): DateRange {
  return { key: 'custom', fromISO, toISO, fromYmd: '', toYmd: '', label: '' }
}

export async function listZReports(opts: { limit?: number } = {}): Promise<ZReportRow[]> {
  const sb = supabaseAdmin()
  const { data, error } = await sb
    .from('z_reports')
    .select('*')
    .order('sequence_no', { ascending: false })
    .limit(opts.limit ?? 100)
  if (error) throw error

  const rows = (data ?? []) as any[]
  // Profile lookup for closed_by_name
  const ids = Array.from(new Set(rows.map((r) => r.closed_by).filter(Boolean)))
  let profileMap = new Map<string, string>()
  if (ids.length > 0) {
    const { data: profiles } = await sb.from('profiles').select('id,name').in('id', ids)
    profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p.name as string]))
  }

  return rows.map((r) => ({
    ...r,
    revenue: Number(r.revenue),
    cancelled_amount: Number(r.cancelled_amount),
    avg_ticket: Number(r.avg_ticket),
    closed_by_name: r.closed_by ? profileMap.get(r.closed_by) ?? null : null,
  }))
}

export async function getZReportBySequence(seq: number): Promise<ZReportRow | null> {
  const sb = supabaseAdmin()
  const { data, error } = await sb
    .from('z_reports')
    .select('*')
    .eq('sequence_no', seq)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as any
  let closed_by_name: string | null = null
  if (row.closed_by) {
    const { data: p } = await sb.from('profiles').select('name').eq('id', row.closed_by).maybeSingle()
    closed_by_name = (p as any)?.name ?? null
  }
  return {
    ...row,
    revenue: Number(row.revenue),
    cancelled_amount: Number(row.cancelled_amount),
    avg_ticket: Number(row.avg_ticket),
    closed_by_name,
  }
}

/**
 * Yeni Z raporu oluşturur. Açık adisyon varsa hata fırlatır.
 * Önceki Z'nin closed_at'i (yoksa ilk adisyon zamanı) → şimdi aralığını snapshot olarak yazar.
 */
export async function createZReport(closedBy: string): Promise<ZReportRow> {
  const sb = supabaseAdmin()

  // 1. Açık adisyon kontrolü
  const { data: openOrders, error: oeErr } = await sb
    .from('orders')
    .select('id, table_id')
    .eq('status', 'open')
  if (oeErr) throw oeErr
  if (openOrders && openOrders.length > 0) {
    const e: any = new Error(`${openOrders.length} açık adisyon var, önce hepsini kapat`)
    e.code = 'OPEN_ORDERS_EXIST'
    e.count = openOrders.length
    throw e
  }

  // 2. Son Z'yi bul → opened_at + sequence_no
  const { data: lastZ } = await sb
    .from('z_reports')
    .select('sequence_no, closed_at')
    .order('sequence_no', { ascending: false })
    .limit(1)
    .maybeSingle()

  let opened_at: string
  if (lastZ) {
    opened_at = (lastZ as any).closed_at
  } else {
    // İlk Z: en eski kapanmış adisyondan başla (yoksa now)
    const { data: firstOrder } = await sb
      .from('orders')
      .select('closed_at, opened_at')
      .in('status', ['closed', 'cancelled'])
      .order('closed_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    opened_at = (firstOrder as any)?.closed_at ?? new Date(0).toISOString()
  }
  const sequence_no = ((lastZ as any)?.sequence_no ?? 0) + 1
  const closed_at = new Date().toISOString()

  // 3. Rapor hesabı (mevcut buildReport reused)
  const report = await buildReport(rangeFromISOs(opened_at, closed_at))

  // 4. Snapshot insert
  const { data: inserted, error: iErr } = await sb
    .from('z_reports')
    .insert({
      sequence_no,
      opened_at,
      closed_at,
      closed_by: closedBy,
      revenue: report.revenue,
      order_count: report.orderCount,
      item_count: report.itemCount,
      cancelled_count: report.cancelledCount,
      cancelled_amount: report.cancelledAmount,
      avg_ticket: report.avgTicket,
      top_products: report.topProducts,
      waiter_sales: report.waiterSales,
      category_share: report.categoryShare,
      hourly: report.hourly,
    })
    .select('*')
    .single()
  if (iErr) throw iErr

  return {
    ...(inserted as any),
    revenue: Number((inserted as any).revenue),
    cancelled_amount: Number((inserted as any).cancelled_amount),
    avg_ticket: Number((inserted as any).avg_ticket),
  }
}

export async function countOpenOrders(): Promise<number> {
  const sb = supabaseAdmin()
  const { count, error } = await sb
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open')
  if (error) throw error
  return count ?? 0
}
