-- ============================================================
-- Z Raporları: gün sonu dijital snapshot'ları
-- Bir Z basıldığında o ana kadar kapanan adisyonların dondurulmuş
-- toplamı, sıralı bir numarayla saklanır. Geriye dönük değişmez.
-- ============================================================

create table if not exists z_reports (
  id              uuid primary key default gen_random_uuid(),
  sequence_no     int not null unique,
  opened_at       timestamptz not null,  -- önceki Z'nin closed_at'i (yoksa ilk adisyonun zamanı)
  closed_at       timestamptz not null default now(),
  closed_by       uuid references profiles(id),

  -- Snapshot toplamları
  revenue          numeric(12,2) not null default 0,
  order_count      int not null default 0,
  item_count       int not null default 0,
  cancelled_count  int not null default 0,
  cancelled_amount numeric(12,2) not null default 0,
  avg_ticket       numeric(10,2) not null default 0,

  -- Detay kırılımları (JSON snapshot)
  top_products    jsonb,  -- [{name, quantity, revenue}, ...]
  waiter_sales    jsonb,  -- [{id, name, revenue, orderCount}, ...]
  category_share  jsonb,  -- [{name, revenue}, ...]
  hourly          jsonb,  -- [{hour, revenue, count}, ...]

  created_at      timestamptz not null default now()
);

create index if not exists z_reports_closed_at_idx on z_reports(closed_at desc);
create index if not exists z_reports_seq_idx on z_reports(sequence_no desc);

alter table z_reports enable row level security;

-- Anon okuyabilir (read-only); yazma sadece server üzerinden
drop policy if exists "read_z_reports_anon" on z_reports;
create policy "read_z_reports_anon" on z_reports for select to anon, authenticated using (true);
