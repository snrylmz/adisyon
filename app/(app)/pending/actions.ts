'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/session'

export async function approvePending(pendingId: string) {
  const user = await requireUser()
  const sb = supabaseAdmin()

  const { data: pending, error: gErr } = await sb
    .from('pending_orders')
    .select('*')
    .eq('id', pendingId)
    .maybeSingle()
  if (gErr) throw gErr
  if (!pending) throw new Error('Sipariş bulunamadı')
  const p = pending as any
  if (p.status !== 'pending') throw new Error('Bu sipariş zaten işlenmiş')

  // Expired mi?
  if (new Date(p.expires_at).getTime() < Date.now()) {
    await sb.from('pending_orders').update({ status: 'expired' }).eq('id', pendingId)
    throw new Error('Süresi dolmuş')
  }

  // Açık adisyon var mı? Yoksa aç
  const { data: existing } = await sb
    .from('orders')
    .select('id')
    .eq('table_id', p.table_id)
    .eq('status', 'open')
    .maybeSingle()

  let orderId: string
  if (existing) {
    orderId = (existing as any).id
  } else {
    const { data: created, error: cErr } = await sb
      .from('orders')
      .insert({ table_id: p.table_id, opened_by: user.id })
      .select('id')
      .single()
    if (cErr) throw cErr
    orderId = (created as any).id
  }

  // Kalemleri ekle
  const items = (p.items as any[]).map((it) => ({
    order_id: orderId,
    product_id: it.product_id,
    product_name: it.product_name,
    unit_price: Number(it.unit_price),
    quantity: it.quantity,
    note: it.note ?? null,
    created_by: user.id,
  }))
  const { error: iErr } = await sb.from('order_items').insert(items)
  if (iErr) throw iErr

  // Pending'i approved işaretle
  await sb
    .from('pending_orders')
    .update({
      status: 'approved',
      decided_by: user.id,
      decided_at: new Date().toISOString(),
      approved_order_id: orderId,
    })
    .eq('id', pendingId)

  revalidatePath('/pending')
  revalidatePath('/tables')
  revalidatePath(`/tables/${p.table_id}`)
}

export async function rejectPending(pendingId: string) {
  const user = await requireUser()
  const sb = supabaseAdmin()

  const { error } = await sb
    .from('pending_orders')
    .update({
      status: 'rejected',
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq('id', pendingId)
    .eq('status', 'pending')
  if (error) throw error

  revalidatePath('/pending')
}
