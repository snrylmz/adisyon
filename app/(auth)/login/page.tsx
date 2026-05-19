import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import LoginForm from './login-form'

export default async function LoginPage() {
  const u = await getCurrentUser()
  if (u) redirect('/tables')

  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-50 to-amber-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-lg border border-zinc-200/50 p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-brand-600 text-white items-center justify-center text-3xl mb-4 shadow-lg shadow-brand-600/30">
              🧁
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Adisyon</h1>
            <p className="text-sm text-zinc-500 mt-1.5">PIN'inizi girerek devam edin</p>
          </div>
          <LoginForm />
        </div>
        <p className="text-center text-xs text-zinc-400 mt-6">
          Pastane sipariş ve hesap sistemi
        </p>
      </div>
    </main>
  )
}
