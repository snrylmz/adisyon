'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/session'

async function ensureOpenOrder(tableId: string, userId: string): Promise<string> {
  const sb = supabaseAdmin()
  const { data: existing, error: e1 } = await sb
    .from('orders')
    .select('id')
    .eq('table_id', tableId)
    .eq('status', 'open')
    .maybeSingle()
  if (e1) throw e1
  if (existing) return (existing as any).id

  const { data, error } = await sb
    .from('orders')
    .insert({ table_id: tableId, opened_by: userId })
    .select('id')
    .single()
  if (error) throw error
  return (data as any).id
}

export async function addOrderItem(input: {
  tableId: string
  productId: string
  quantity?: number
  note?: string
}) {
  const user = await requireUser()
  const sb = supabaseAdmin()

  const { data: product, error: pErr } = await sb
    .from('products')
    .select('*')
    .eq('id', input.productId)
    .eq('active', true)
    .maybeSingle()
  if (pErr) throw pErr
  if (!product) throw new Error('Ürün bulunamadı veya pasif')

  const orderId = await ensureOpenOrder(input.tableId, user.id)
  const qty = Math.max(1, Math.floor(input.quantity ?? 1))

  const { error } = await sb.from('order_items').insert({
    order_id: orderId,
    product_id: (product as any).id,
    product_name: (product as any).name,
    unit_price: (product as any).price,
    quantity: qty,
    note: input.note ?? null,
    created_by: user.id,
  })
  if (error) throw error

  revalidatePath(`/tables/${input.tableId}`)
  revalidatePath('/tables')
}

export async function changeItemQuantity(input: { tableId: string; itemId: string; delta: number }) {
  await requireUser()
  const sb = supabaseAdmin()

  const { data: item, error: gErr } = await sb
    .from('order_items')
    .select('id, quantity')
    .eq('id', input.itemId)
    .maybeSingle()
  if (gErr) throw gErr
  if (!item) throw new Error('Kalem bulunamadı')

  const next = (item as any).quantity + input.delta
  if (next <= 0) {
    const { error } = await sb.from('order_items').delete().eq('id', input.itemId)
    if (error) throw error
  } else {
    const { error } = await sb.from('order_items').update({ quantity: next }).eq('id', input.itemId)
    if (error) throw error
  }

  revalidatePath(`/tables/${input.tableId}`)
  revalidatePath('/tables')
}

export async function removeOrderItem(input: { tableId: string; itemId: string }) {
  await requireUser()
  const sb = supabaseAdmin()
  const { error } = await sb.from('order_items').delete().eq('id', input.itemId)
  if (error) throw error
  revalidatePath(`/tables/${input.tableId}`)
  revalidatePath('/tables')
}

export async function closeOrder(input: {
  tableId: string
  orderId: string
  paymentType: 'cash' | 'card' | 'transfer' | 'other'
}) {
  const user = await requireUser()
  const sb = supabaseAdmin()

  if (!['cash', 'card', 'transfer', 'other'].includes(input.paymentType)) {
    throw new Error('Geçersiz ödeme tipi')
  }

  const { data: order, error: gErr } = await sb
    .from('orders')
    .select('id, status, total')
    .eq('id', input.orderId)
    .maybeSingle()
  if (gErr) throw gErr
  if (!order) throw new Error('Sipariş bulunamadı')
  if ((order as any).status !== 'open') throw new Error('Sipariş zaten kapalı')

  const { error } = await sb
    .from('orders')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_by: user.id,
      payment_type: input.paymentType,
    })
    .eq('id', input.orderId)
  if (error) throw error

  revalidatePath(`/tables/${input.tableId}`)
  revalidatePath('/tables')
  redirect('/tables')
}

export async function moveOrderToTable(input: { orderId: string; targetTableId: string }) {
  await requireUser()
  const sb = supabaseAdmin()

  const { data: order, error: gErr } = await sb
    .from('orders')
    .select('id, status, table_id')
    .eq('id', input.orderId)
    .maybeSingle()
  if (gErr) throw gErr
  if (!order) throw new Error('Adisyon bulunamadı')
  if ((order as any).status !== 'open') throw new Error('Sadece açık adisyon taşınabilir')

  const oldTableId = (order as any).table_id as string

  if (oldTableId === input.targetTableId) {
    throw new Error('Aynı masaya taşınamaz')
  }

  // Hedef masada açık adisyon var mı? (Unique partial index zaten engelliyor
  // ama önce kontrol edip daha düzgün hata verelim.)
  const { data: existing } = await sb
    .from('orders')
    .select('id')
    .eq('table_id', input.targetTableId)
    .eq('status', 'open')
    .maybeSingle()
  if (existing) throw new Error('Hedef masada zaten açık adisyon var')

  const { error } = await sb
    .from('orders')
    .update({ table_id: input.targetTableId })
    .eq('id', input.orderId)
    .eq('status', 'open')
  if (error) {
    if ((error as any).code === '23505') {
      throw new Error('Hedef masa az önce dolduruldu, tekrar dene')
    }
    throw error
  }

  revalidatePath(`/tables/${oldTableId}`)
  revalidatePath(`/tables/${input.targetTableId}`)
  revalidatePath('/tables')

  redirect(`/tables/${input.targetTableId}`)
}

export async function cancelOrder(input: { tableId: string; orderId: string }) {
  const user = await requireUser()
  if (user.role !== 'admin' && user.role !== 'cashier') {
    throw new Error('Sadece yönetici veya kasa adisyonu iptal edebilir')
  }
  const sb = supabaseAdmin()
  const { error } = await sb
    .from('orders')
    .update({ status: 'cancelled', closed_at: new Date().toISOString(), closed_by: user.id })
    .eq('id', input.orderId)
    .eq('status', 'open')
  if (error) throw error
  revalidatePath(`/tables/${input.tableId}`)
  revalidatePath('/tables')
  redirect('/tables')
}
