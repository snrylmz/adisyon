-- ============================================================
-- 004: Müşteri telefonundan sipariş (QR menu) için bekleyen
-- sipariş talepleri tablosu. Müşteri QR'ı okutup sipariş gönderir,
-- garson/kasa onaylayana kadar pending'de kalır. 5 dk'da otomatik
-- expires.
-- ============================================================

create table if not exists pending_orders (
  id              uuid primary key default gen_random_uuid(),
  table_id        uuid not null references tables(id) on delete cascade,
  session_id      text not null,         -- müşteri tarafında localStorage'da tutulan random key
  items           jsonb not null,        -- [{product_id, product_name, unit_price, quantity, note}]
  subtotal        numeric(10,2) not null default 0,
  status          text not null default 'pending'
                  check (status in ('pending','approved','rejected','expired')),
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null,
  approved_order_id uuid references orders(id) on delete set null,
  decided_by      uuid references profiles(id),
  decided_at      timestamptz
);

create index if not exists pending_orders_status_idx on pending_orders(status, created_at desc);
create index if not exists pending_orders_table_idx on pending_orders(table_id);
create index if not exists pending_orders_session_idx on pending_orders(session_id);

alter table pending_orders enable row level security;

-- Anon read: müşteri kendi siparişinin durumunu görebilsin (status değişimi için realtime)
drop policy if exists "read_pending_orders_anon" on pending_orders;
create policy "read_pending_orders_anon" on pending_orders
  for select to anon, authenticated using (true);

-- Anon insert: müşteri sipariş gönderebilsin. Sadece yeni satır,
-- diğer alanlar default ile, items + table_id + session_id + expires_at + subtotal
drop policy if exists "insert_pending_orders_anon" on pending_orders;
create policy "insert_pending_orders_anon" on pending_orders
  for insert to anon, authenticated
  with check (status = 'pending');

-- Realtime publication
do $$
begin
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'pending_orders') then
    alter publication supabase_realtime add table pending_orders;
  end if;
end$$;
