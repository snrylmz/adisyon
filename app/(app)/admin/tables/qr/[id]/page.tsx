import { notFound, redirect } from 'next/navigation'
import { headers } from 'next/headers'
import QRCode from 'qrcode'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import PrintButton from '@/app/(app)/z-reports/[seq]/print-button'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function TableQRPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/tables')

  const { id } = await params
  const sb = supabaseAdmin()
  const { data: table } = await sb.from('tables').select('id, name').eq('id', id).maybeSingle()
  if (!table) notFound()

  // Public URL — host'tan otomatik üret
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  const url = `${proto}://${host}/m/${id}`

  // SVG QR — yüksek hata düzeltme (ortadaki logo için)
  const qrSvg = await QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    width: 320,
    errorCorrectionLevel: 'H',
    color: { dark: '#18181b', light: '#ffffff' },
  })

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <Link
        href="/admin/tables"
        className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-white border border-zinc-300 hover:bg-zinc-50 text-sm font-semibold text-zinc-700 shadow-sm transition print:hidden"
      >
        <span className="text-base leading-none">←</span> Masa Düzeni
      </Link>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <div className="p-8 text-center bg-gradient-to-br from-brand-50 to-white border-b border-zinc-200">
          <div className="text-xs uppercase tracking-wider font-bold text-brand-700">
            🧁 Adisyon · Menü ve Sipariş
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 mt-2">
            {(table as any).name}
          </h1>
        </div>

        <div className="p-8 flex justify-center">
          <div className="relative inline-block bg-white p-3 border border-zinc-200 rounded-2xl">
            <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white rounded-2xl p-1.5 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/icon-192.png" alt="" className="w-16 h-16 rounded-xl" />
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 pb-8 text-center space-y-2">
          <p className="text-sm font-semibold text-zinc-900">
            Menüyü görmek ve sipariş vermek için QR kodu okutun
          </p>
          <p className="text-xs text-zinc-500">
            Garson onayladıktan sonra siparişiniz masanıza işlenir.
          </p>
          <code className="block mt-4 text-[10px] text-zinc-400 break-all font-mono">
            {url}
          </code>
        </div>
      </div>

      <div className="text-center print:hidden">
        <PrintButton />
      </div>
    </div>
  )
}
