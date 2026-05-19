import { listCategories, listProducts } from '@/lib/db/queries'
import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import QuickSaleClient from './quick-sale-client'

export const dynamic = 'force-dynamic'

export default async function QuickSalePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const [categories, products] = await Promise.all([
    listCategories(),
    listProducts({ onlyActive: true }),
  ])

  return <QuickSaleClient categories={categories} products={products} />
}
