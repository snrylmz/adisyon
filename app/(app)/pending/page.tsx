import { supabaseAdmin } from '@/lib/supabase/server'
import PendingList from './pending-list'

export const dynamic = 'force-dynamic'

export default async function PendingPage() {
  const sb = supabaseAdmin()
  // Sadece henüz expired olmamış pending'leri al
  const { data: pending } = await sb
    .from('pending_orders')
    .select('*, tables(name)')
    .eq('status', 'pending')
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true })

  const initial = (pending ?? []).map((p: any) => ({
    id: p.id,
    table_id: p.table_id,
    table_name: p.tables?.name ?? '—',
    items: p.items,
    subtotal: Number(p.subtotal),
    created_at: p.created_at,
    expires_at: p.expires_at,
  }))

  return <PendingList initial={initial} />
}
