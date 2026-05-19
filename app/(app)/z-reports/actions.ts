'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/session'
import { createZReport } from '@/lib/db/z-reports'

export async function createZReportAction(): Promise<{ error?: string; openOrders?: number }> {
  const user = await requireUser()
  if (user.role !== 'admin' && user.role !== 'cashier') {
    return { error: 'Sadece yönetici veya kasa Z basabilir' }
  }
  try {
    const z = await createZReport(user.id)
    revalidatePath('/z-reports')
    revalidatePath('/reports')
    redirect(`/z-reports/${z.sequence_no}`)
  } catch (e: any) {
    if (e?.code === 'OPEN_ORDERS_EXIST') {
      return { error: e.message, openOrders: e.count }
    }
    if (e?.message?.includes('NEXT_REDIRECT')) throw e // Next.js redirect throws — propagate
    return { error: e?.message ?? 'Bilinmeyen hata' }
  }
}
