import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/server'
import {
  listCategories,
  listProducts,
  getOpenOrderForTable,
  listTablesWithOpenOrders,
} from '@/lib/db/queries'
import { getCurrentUser } from '@/lib/auth/session'
import TableOrder from './table-order'

export const dynamic = 'force-dynamic'

export default async function TablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()

  const sb = supabaseAdmin()
  const { data: table } = await sb.from('tables').select('*').eq('id', id).maybeSingle()
  if (!table) notFound()

  const [categories, products, openOrder, allTables] = await Promise.all([
    listCategories(),
    listProducts({ onlyActive: true }),
    getOpenOrderForTable(id),
    listTablesWithOpenOrders(),
  ])

  return (
    <TableOrder
      table={table as any}
      categories={categories}
      products={products}
      initialOrder={openOrder}
      role={user!.role}
      allTables={allTables}
    />
  )
}
