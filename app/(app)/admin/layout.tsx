import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/tables')
  return <>{children}</>
}
