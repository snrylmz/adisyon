import { listTablesWithOpenOrders } from '@/lib/db/queries'
import { getCurrentUser } from '@/lib/auth/session'
import TablesGrid from './tables-grid'

export const dynamic = 'force-dynamic'

export default async function TablesPage() {
  const [tables, user] = await Promise.all([listTablesWithOpenOrders(), getCurrentUser()])
  return <TablesGrid initialTables={tables} role={user!.role} />
}
