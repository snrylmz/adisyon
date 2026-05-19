import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth/session'
import { logoutAction } from '../(auth)/login/actions'
import { NavLinks } from './nav'

const ROLE_LABEL: Record<string, string> = {
  admin: 'Yönetici',
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

  const items = [
    { href: '/tables', label: 'Masalar' },
    ...(user.role === 'admin' || user.role === 'cashier'
      ? [
          { href: '/reports', label: 'Rapor' },
          { href: '/orders', label: 'Geçmiş' },
        ]
      : []),
    ...(user.role === 'admin'
      ? [
          { href: '/admin/products', label: 'Menü' },
          { href: '/admin/tables', label: 'Masa Düzeni' },
          { href: '/admin/staff', label: 'Personel' },
        ]
      : []),
  ]

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-20">
        <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Link href="/tables" className="flex items-center gap-2 font-bold tracking-tight">
              <span className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center text-base shadow-sm shadow-brand-600/30">
                🧁
              </span>
              <span className="text-zinc-900">Adisyon</span>
            </Link>
            <div className="w-px h-6 bg-zinc-200" />
            <NavLinks items={items} />
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  ROLE_TONE[user.role] ?? ''
                }`}
              >
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
              <span className="text-sm font-medium text-zinc-700">{user.name}</span>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="h-9 px-3 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition"
              >
                Çıkış
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
