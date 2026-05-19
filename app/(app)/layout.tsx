import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth/session'
import { logoutAction } from '../(auth)/login/actions'
import { AdminMenu, NavLinks } from './nav'
import PendingBell from './pending-bell'
import PushInit from './push-init'

const ROLE_LABEL: Record<string, string> = {
  admin: 'Yön.',
  waiter: 'Garson',
  cashier: 'Kasa',
}
const ROLE_TONE: Record<string, string> = {
  admin: 'bg-violet-100 text-violet-700',
  waiter: 'bg-sky-100 text-sky-700',
  cashier: 'bg-amber-100 text-amber-700',
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const mainItems = [
    { href: '/tables', label: 'Masalar' },
    { href: '/quick-sale', label: 'Hızlı Satış' },
    ...(user.role === 'admin' || user.role === 'cashier'
      ? [
          { href: '/reports', label: 'Rapor' },
          { href: '/orders', label: 'Geçmiş' },
          { href: '/z-reports', label: 'Z' },
        ]
      : []),
  ]

  const adminItems =
    user.role === 'admin'
      ? [
          { href: '/admin/products', label: 'Menü' },
          { href: '/admin/tables', label: 'Masa Düzeni' },
          { href: '/admin/staff', label: 'Personel' },
        ]
      : []

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-20">
        <div className="px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link href="/tables" className="flex items-center gap-2 font-bold tracking-tight shrink-0">
              <span className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center text-base shadow-sm shadow-brand-600/30">
                🧁
              </span>
              <span className="text-zinc-900 hidden md:inline">Adisyon</span>
            </Link>
            <div className="w-px h-6 bg-zinc-200 shrink-0" />
            <NavLinks items={mainItems} />
            {adminItems.length > 0 && <AdminMenu items={adminItems} />}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <PendingBell />
            <div className="hidden lg:flex items-center gap-1.5 px-2">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  ROLE_TONE[user.role] ?? ''
                }`}
              >
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
              <span className="text-sm font-medium text-zinc-700 max-w-[80px] truncate">
                {user.name}
              </span>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                title="Çıkış"
                className="h-9 px-2.5 rounded-lg text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition"
              >
                ⎋
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <PushInit />
    </div>
  )
}
