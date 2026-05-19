import { listTables } from '@/lib/db/queries'
import TablesAdminClient from './tables-client'

export const dynamic = 'force-dynamic'

export default async function TablesAdminPage() {
  const tables = await listTables()
  return <TablesAdminClient tables={tables} />
}
