'use server'

import { supabaseAdmin } from '@/lib/supabase/server'

type Item = { productId: string; quantity: number; note?: string }

export async function submitPendingOrder(input: {
  tableId: string
  sessionId: string
  items: Item[]
}): Promise<{ ok: true; pendingId: string } | { ok: false; error: string }> {
  if (!input.items || input.items.length === 0) {
    return { ok: false, error: 'Sepet boş' }
  }
  if (!input.sessionId || input.sessionId.length < 6) {
    return { ok: false, error: 'Geçersiz oturum' }
  }

  const sb = supabaseAdmin()

  // Masa kontrolü
  const { data: table, error: tErr } = await sb
    .from('tables')
    .select('id, name')
    .eq('id', input.tableId)
    .maybeSingle()
  if (tErr) return { ok: false, error: tErr.message }
  if (!table) return { ok: false, error: 'Masa bulunamadı' }

  // Ürünleri çek
  const productIds = Array.from(new Set(input.items.map((i) => i.productId)))
  const { data: products, error: pErr } = await sb
    .from('products')
    .select('id, name, price, active')
    .in('id', productIds)
  if (pErr) return { ok: false, error: pErr.message }
  const productMap = new Map((products ?? []).map((p: any) => [p.id, p]))

  // Sepet item snapshot
  const items: any[] = []
  let subtotal = 0
  for (const it of input.items) {
    const p = productMap.get(it.productId) as any
    if (!p || !p.active) return { ok: false, error: 'Ürün bulunamadı veya pasif' }
    const qty = Math.max(1, Math.floor(it.quantity))
    const unitPrice = Number(p.price)
    items.push({
      product_id: p.id,
      product_name: p.name,
      unit_price: unitPrice,
      quantity: qty,
      note: (it.note ?? '').slice(0, 120) || null,
    })
    subtotal += unitPrice * qty
  }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  const { data: inserted, error: iErr } = await sb
    .from('pending_orders')
    .insert({
      table_id: input.tableId,
      session_id: input.sessionId,
      items,
      subtotal,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select('id')
    .single()
  if (iErr) return { ok: false, error: iErr.message }

  return { ok: true, pendingId: (inserted as any).id }
}
