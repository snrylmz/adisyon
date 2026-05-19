import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/server'
import { listCategories, listProducts } from '@/lib/db/queries'
import CustomerOrder from './customer-order'

export const dynamic = 'force-dynamic'

export default async function CustomerMenuPage({
  params,
}: {
  params: Promise<{ tableId: string }>
}) {
  const { tableId } = await params

  const sb = supabaseAdmin()
  const { data: table } = await sb.from('tables').select('id, name').eq('id', tableId).maybeSingle()
  if (!table) notFound()

  const [categories, products] = await Promise.all([
    listCategories(),
    listProducts({ onlyActive: true }),
  ])

  return (
    <CustomerOrder
      table={table as any}
      categories={categories}
      products={products}
    />
  )
}
