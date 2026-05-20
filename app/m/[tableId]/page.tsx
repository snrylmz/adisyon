import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/server'
import { listCategories, listProducts } from '@/lib/db/queries'
import CustomerOrder from './customer-order'

export const dynamic = 'force-dynamic'

// Son 30 günün en çok satan ilk N ürün id'si (popüler rozeti için)
async function getPopularProductIds(limit = 5): Promise<Set<string>> {
  const sb = supabaseAdmin()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await sb
    .from('order_items')
    .select('product_id, quantity, orders!inner(status, closed_at)')
    .eq('orders.status', 'closed')
    .gte('orders.closed_at', since)
  const agg = new Map<string, number>()
  for (const row of (data ?? []) as any[]) {
    if (!row.product_id) continue
    agg.set(row.product_id, (agg.get(row.product_id) ?? 0) + row.quantity)
  }
  const top = Array.from(agg.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)
  return new Set(top)
}

async function getCampaign(): Promise<string | null> {
  const sb = supabaseAdmin()
  const { data } = await sb
    .from('settings')
    .select('key, value')
    .in('key', ['campaign_text', 'campaign_active'])
  const map = new Map((data ?? []).map((r: any) => [r.key, r.value]))
  if (map.get('campaign_active') !== 'true') return null
  const text = (map.get('campaign_text') ?? '').trim()
  return text || null
}

export default async function CustomerMenuPage({
  params,
}: {
  params: Promise<{ tableId: string }>
}) {
  const { tableId } = await params

  const sb = supabaseAdmin()
  const { data: table } = await sb.from('tables').select('id, name').eq('id', tableId).maybeSingle()
  if (!table) notFound()

  const [categories, products, popularIds, campaign] = await Promise.all([
    listCategories(),
    listProducts({ onlyActive: true }),
    getPopularProductIds(),
    getCampaign(),
  ])

  return (
    <CustomerOrder
      table={table as any}
      categories={categories}
      products={products}
      popularIds={Array.from(popularIds)}
      campaign={campaign}
    />
  )
}
