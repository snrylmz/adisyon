'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/session'
import type { PaymentType } from '@/lib/types'

type QuickSaleInput = {
  items: { productId: string; quantity: number; note?: string }[]
  paymentType: PaymentType
}

export async function createQuickSale(input: QuickSaleInput) {
  const user = await requireUser()
  const sb = supabaseAdmin()

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error('Sepet boş')
  }
  if (!['cash', 'card', 'transfer', 'other'].includes(input.paymentType)) {
    throw new Error('Geçersiz ödeme tipi')
  }

  // Ürünleri tek query'de çek
  const productIds = Array.from(new Set(input.items.map((i) => i.productId)))
  const { data: products, error: pErr } = await sb
    .from('products')
    .select('id, name, price, active')
    .in('id', productIds)
  if (pErr) throw pErr
  const productMap = new Map((products ?? []).map((p: any) => [p.id, p]))

  // Sipariş + kalemleri hazırla
  const orderItems: any[] = []
  for (const it of input.items) {
    const p = productMap.get(it.productId) as any
    if (!p || !p.active) throw new Error(`Ürün bulunamadı veya pasif`)
    const qty = Math.max(1, Math.floor(it.quantity))
    orderItems.push({
      product_id: p.id,
      product_name: p.name,
      unit_price: Number(p.price),
      quantity: qty,
      note: it.note ?? null,
      created_by: user.id,
    })
  }

  // 1. Sipariş oluştur (table_id = null, paket)
  const now = new Date().toISOString()
  const { data: order, error: oErr } = await sb
    .from('orders')
    .insert({
      table_id: null,
      status: 'open',
      opened_by: user.id,
      opened_at: now,
    })
    .select('id')
    .single()
  if (oErr) throw oErr
  const orderId = (order as any).id as string

  // 2. Kalemleri ekle
  const { error: iErr } = await sb
    .from('order_items')
    .insert(orderItems.map((it) => ({ ...it, order_id: orderId })))
  if (iErr) {
    // Rollback: siparişi sil
    await sb.from('orders').delete().eq('id', orderId)
    throw iErr
  }

  // 3. Hesabı kapat
  const { error: cErr } = await sb
    .from('orders')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_by: user.id,
      payment_type: input.paymentType,
    })
    .eq('id', orderId)
  if (cErr) throw cErr

  revalidatePath('/quick-sale')
  revalidatePath('/reports')
  revalidatePath('/orders')

  redirect(`/orders/${orderId}`)
}
