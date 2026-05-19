'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/session'

// ---------- Categories ----------

export async function createCategory(formData: FormData) {
  await requireAdmin()
  const name = String(formData.get('name') ?? '').trim()
  const sort = Number(formData.get('sort_order') ?? 0) || 0
  if (!name) throw new Error('İsim gerekli')
  const sb = supabaseAdmin()
  const { error } = await sb.from('categories').insert({ name, sort_order: sort })
  if (error) throw error
  revalidatePath('/admin/products')
}

export async function updateCategory(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const sort = Number(formData.get('sort_order') ?? 0) || 0
  if (!id || !name) throw new Error('Eksik bilgi')
  const sb = supabaseAdmin()
  const { error } = await sb.from('categories').update({ name, sort_order: sort }).eq('id', id)
  if (error) throw error
  revalidatePath('/admin/products')
}

export async function deleteCategory(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('id eksik')
  const sb = supabaseAdmin()
  const { error } = await sb.from('categories').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/admin/products')
}

// ---------- Products ----------

export async function createProduct(formData: FormData) {
  await requireAdmin()
  const name = String(formData.get('name') ?? '').trim()
  const category_id = String(formData.get('category_id') ?? '') || null
  const price = Number(formData.get('price') ?? 0)
  const sort = Number(formData.get('sort_order') ?? 0) || 0
  if (!name || !(price >= 0)) throw new Error('Geçersiz ürün')
  const sb = supabaseAdmin()
  const { error } = await sb.from('products').insert({
    name,
    category_id,
    price,
    sort_order: sort,
  })
  if (error) throw error
  revalidatePath('/admin/products')
}

export async function updateProduct(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const category_id = String(formData.get('category_id') ?? '') || null
  const price = Number(formData.get('price') ?? 0)
  const sort = Number(formData.get('sort_order') ?? 0) || 0
  const active = formData.get('active') === 'on'
  if (!id || !name) throw new Error('Eksik bilgi')
  const sb = supabaseAdmin()
  const { error } = await sb
    .from('products')
    .update({ name, category_id, price, sort_order: sort, active })
    .eq('id', id)
  if (error) throw error
  revalidatePath('/admin/products')
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('id eksik')
  const sb = supabaseAdmin()
  // Adisyondaki snapshot sayesinde silinebilir; ama yine de soft-delete (pasifleştir) güvenli.
  const { error } = await sb.from('products').update({ active: false }).eq('id', id)
  if (error) throw error
  revalidatePath('/admin/products')
}

// ---------- Tables ----------

export async function createTable(formData: FormData) {
  await requireAdmin()
  const name = String(formData.get('name') ?? '').trim()
  const sort = Number(formData.get('sort_order') ?? 0) || 0
  if (!name) throw new Error('İsim gerekli')
  const sb = supabaseAdmin()
  const { error } = await sb.from('tables').insert({ name, sort_order: sort })
  if (error) throw error
  revalidatePath('/admin/tables')
  revalidatePath('/tables')
}

export async function updateTable(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const sort = Number(formData.get('sort_order') ?? 0) || 0
  if (!id || !name) throw new Error('Eksik bilgi')
  const sb = supabaseAdmin()
  const { error } = await sb.from('tables').update({ name, sort_order: sort }).eq('id', id)
  if (error) throw error
  revalidatePath('/admin/tables')
  revalidatePath('/tables')
}

export async function deleteTable(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('id eksik')
  const sb = supabaseAdmin()

  // Açık sipariş varsa silme
  const { data: open } = await sb
    .from('orders')
    .select('id')
    .eq('table_id', id)
    .eq('status', 'open')
    .maybeSingle()
  if (open) throw new Error('Bu masada açık adisyon var, önce kapat')

  const { error } = await sb.from('tables').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/admin/tables')
  revalidatePath('/tables')
}

// ---------- Staff ----------

export async function createStaff(formData: FormData) {
  await requireAdmin()
  const name = String(formData.get('name') ?? '').trim()
  const pin = String(formData.get('pin') ?? '').trim()
  const role = String(formData.get('role') ?? 'waiter') as 'admin' | 'waiter' | 'cashier'
  if (!name || !/^\d{4,8}$/.test(pin)) throw new Error('İsim ve 4-8 haneli PIN gerekli')
  if (!['admin', 'waiter', 'cashier'].includes(role)) throw new Error('Geçersiz rol')
  const sb = supabaseAdmin()
  const { error } = await sb.from('profiles').insert({ name, pin, role })
  if (error) {
    if ((error as any).code === '23505') throw new Error('Bu PIN zaten kullanımda')
    throw error
  }
  revalidatePath('/admin/staff')
}

export async function updateStaff(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const pin = String(formData.get('pin') ?? '').trim()
  const role = String(formData.get('role') ?? 'waiter') as 'admin' | 'waiter' | 'cashier'
  const active = formData.get('active') === 'on'
  if (!id || !name || !/^\d{4,8}$/.test(pin)) throw new Error('Eksik bilgi')
  const sb = supabaseAdmin()
  const { error } = await sb.from('profiles').update({ name, pin, role, active }).eq('id', id)
  if (error) {
    if ((error as any).code === '23505') throw new Error('Bu PIN zaten kullanımda')
    throw error
  }
  revalidatePath('/admin/staff')
}

export async function deleteStaff(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('id eksik')
  const sb = supabaseAdmin()
  // Pasifleştir (silmek yerine), çünkü sipariş kayıtlarında referans var
  const { error } = await sb.from('profiles').update({ active: false }).eq('id', id)
  if (error) throw error
  revalidatePath('/admin/staff')
}
