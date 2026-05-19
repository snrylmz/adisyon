import { listCategories, listProducts } from '@/lib/db/queries'
import ProductsClient from './products-client'

export const dynamic = 'force-dynamic'

export default async function ProductsAdminPage() {
  const [categories, products] = await Promise.all([listCategories(), listProducts()])
  return <ProductsClient categories={categories} products={products} />
}
