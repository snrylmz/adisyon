import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import QRCode from 'qrcode'
import { listTables } from '@/lib/db/queries'
import { getCurrentUser } from '@/lib/auth/session'
import PrintButton from '@/app/(app)/z-reports/[seq]/print-button'

export const dynamic = 'force-dynamic'

export default async function BulkQRPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/tables')

  const tables = await listTables()

  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  const base = `${proto}://${host}`

  // Her masa için QR SVG üret (yüksek hata düzeltme — ortadaki logo için)
  const qrByTable = await Promise.all(
    tables.map(async (t) => {
      const svg = await QRCode.toString(`${base}/m/${t.id}`, {
        type: 'svg',
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 260,
        color: { dark: '#18181b', light: '#ffffff' },
      })
      return { table: t, svg }
    }),
  )

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 print:max-w-none print:p-0">
      {/* Toolbar — yazdırmada gizli */}
      <div className="flex items-center justify-between gap-3 mb-6 print:hidden">
        <Link
          href="/admin/tables"
          className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-white border border-zinc-300 hover:bg-zinc-50 text-sm font-semibold text-zinc-700 shadow-sm transition"
        >
          <span className="text-base leading-none">←</span> Masa Düzeni
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">{tables.length} masa</span>
          <PrintButton />
        </div>
      </div>

      {tables.length === 0 ? (
        <div className="text-center py-20 text-zinc-400 print:hidden">
          Henüz masa yok.{' '}
          <Link href="/admin/tables" className="text-brand-600 underline">
            Masa ekle
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 print:grid-cols-2 print:gap-4">
          {qrByTable.map(({ table, svg }) => (
            <div
              key={table.id}
              className="break-inside-avoid rounded-2xl border-2 border-dashed border-zinc-300 bg-white p-3 flex flex-col items-center text-center"
            >
              <div className="text-2xl print:text-xl font-bold tracking-tight text-zinc-900 mb-2 print:mb-1">
                {table.name}
              </div>

              {/* QR + ortada logo. Print'te kompakt (max 64mm) → sayfa başına 6 kart */}
              <div className="relative w-full print:max-w-[64mm] mx-auto">
                <div
                  className="w-full [&>svg]:w-full [&>svg]:h-auto [&>svg]:block"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white rounded-2xl print:rounded-lg p-1.5 print:p-1 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/icons/icon-192.png"
                      alt=""
                      className="w-20 h-20 print:w-11 print:h-11 rounded-xl print:rounded-md"
                    />
                  </div>
                </div>
              </div>

              <p className="text-sm print:text-xs text-zinc-600 mt-2 print:mt-1 leading-snug">
                Menüyü görmek ve sipariş vermek için QR kodu okutun
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
