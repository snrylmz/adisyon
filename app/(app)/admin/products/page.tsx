import { listCategories, listProducts } from '@/lib/db/queries'
import { supabaseAdmin } from '@/lib/supabase/server'
import ProductsClient from './products-client'

export const dynamic = 'force-dynamic'

async function getCampaign() {
  const sb = supabaseAdmin()
  const { data } = await sb
    .from('settings')
    .select('key, value')
    .in('key', ['campaign_text', 'campaign_active'])
  const map = new Map((data ?? []).map((r: any) => [r.key, r.value]))
  return {
    text: map.get('campaign_text') ?? '',
    active: map.get('campaign_active') === 'true',
  }
}

export default async function ProductsAdminPage() {
  const [categories, products, campaign] = await Promise.all([
    listCategories(),
    listProducts(),
    getCampaign(),
  ])
  return <ProductsClient categories={categories} products={products} campaign={campaign} />
}
