'use client'

import { createClient } from '@supabase/supabase-js'

// Browser client — sadece anon key. RLS read-only policy'leri sayesinde
// realtime subscription'ları için kullanılır. Yazma server actions üzerinden.
let _client: ReturnType<typeof createClient> | null = null

export function supabaseBrowser() {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  _client = createClient(url, key, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 10 } },
  })
  return _client
}
