'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { createZReportAction } from './actions'

export default function ZNewButton({ openOrdersCount }: { openOrdersCount: number }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const blocked = openOrdersCount > 0

  function run() {
    setError(null)
    startTransition(async () => {
      const res = await createZReportAction()
      if (res?.error) setError(res.error)
      // başarı: server action redirect eder
    })
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <span className="text-base leading-none">📑</span> Yeni Z Bas
      </Button>

      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Gün sonu Z raporu bas"
        size="sm"
      >
        {blocked ? (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">⚠️</div>
                <div>
                  <div className="font-semibold text-amber-900">
                    {openOrdersCount} açık adisyon var
                  </div>
                  <div className="text-sm text-amber-800/80 mt-1">
                    Z basmadan önce tüm açık adisyonların kapatılması veya iptal edilmesi
                    gerekiyor. Aksi halde gün sonu toplamı eksik olur.
                  </div>
                </div>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => setOpen(false)}
              className="w-full"
            >
              Tamam, kapatayım
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600">
              Son Z'den (veya başlangıçtan) bu ana kadar kapanmış tüm adisyonlar dondurulmuş
              bir snapshot olarak kaydedilecek. Bu işlem{' '}
              <span className="font-semibold text-zinc-900">geri alınamaz</span> — Z numarası
              ardışık verilir.
            </p>
            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg font-medium">
                {error}
              </div>
            )}
            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Vazgeç
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={run}
                disabled={pending}
                className="flex-1"
              >
                {pending ? 'Bastırılıyor...' : 'Evet, Z bas'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
