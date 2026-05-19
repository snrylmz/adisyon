-- ============================================================
-- Adisyon: Pastane sipariş & hesap yönetimi
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Profiles (PIN ile giriş yapan personel) ----------
create table if not exists profiles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  role        text not null check (role in ('admin','waiter','cashier')),
  pin         text not null unique,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------- Kategoriler ----------
create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------- Ürünler ----------
create table if not exists products (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid references categories(id) on delete set null,
  name         text not null,
  price        numeric(10,2) not null check (price >= 0),
  active       boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists products_category_idx on products(category_id);

-- ---------- Masalar ----------
create table if not exists tables (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------- Siparişler (Adisyonlar) ----------
create table if not exists orders (
  id          uuid primary key default gen_random_uuid(),
  table_id    uuid not null references tables(id) on delete restrict,
  status      text not null default 'open' check (status in ('open','closed','cancelled')),
  opened_at   timestamptz not null default now(),
  closed_at   timestamptz,
  opened_by   uuid references profiles(id),
  closed_by   uuid references profiles(id),
  total       numeric(10,2) not null default 0
);
create index if not exists orders_table_status_idx on orders(table_id, status);
create index if not exists orders_status_idx on orders(status);

-- Bir masada aynı anda yalnızca bir "open" sipariş olabilir
create unique index if not exists orders_one_open_per_table
  on orders(table_id) where status = 'open';

-- ---------- Sipariş kalemleri ----------
create table if not exists order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  product_id    uuid references products(id) on delete set null,
  product_name  text not null,
  unit_price    numeric(10,2) not null,
  quantity      int not null check (quantity > 0),
  note          text,
  created_at    timestamptz not null default now(),
  created_by    uuid references profiles(id)
);
create index if not exists order_items_order_idx on order_items(order_id);

-- ---------- Total'i otomatik güncelle ----------
create or replace function recalc_order_total() returns trigger as $$
begin
  update orders o
    set total = coalesce((
      select sum(unit_price * quantity) from order_items where order_id = o.id
    ), 0)
  where o.id = coalesce(new.order_id, old.order_id);
  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_recalc_total_ins on order_items;
drop trigger if exists trg_recalc_total_upd on order_items;
drop trigger if exists trg_recalc_total_del on order_items;

create trigger trg_recalc_total_ins after insert on order_items
  for each row execute function recalc_order_total();
create trigger trg_recalc_total_upd after update on order_items
  for each row execute function recalc_order_total();
create trigger trg_recalc_total_del after delete on order_items
  for each row execute function recalc_order_total();

-- ============================================================
-- RLS: client doğrudan erişmiyor (her şey server actions ile
-- service_role anahtarı üzerinden gidiyor). Yine de açıyoruz
-- ki anon anahtar yanlışlıkla sızsa bile read/write olmasın.
-- ============================================================
alter table profiles    enable row level security;
alter table categories  enable row level security;
alter table products    enable row level security;
alter table tables      enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;

-- Realtime için anon read'e ihtiyaç var (orders + order_items + tables)
-- Yine de yazma yasak.
drop policy if exists "read_orders_anon" on orders;
create policy "read_orders_anon" on orders for select to anon, authenticated using (true);

drop policy if exists "read_order_items_anon" on order_items;
create policy "read_order_items_anon" on order_items for select to anon, authenticated using (true);

drop policy if exists "read_tables_anon" on tables;
create policy "read_tables_anon" on tables for select to anon, authenticated using (true);

drop policy if exists "read_products_anon" on products;
create policy "read_products_anon" on products for select to anon, authenticated using (true);

drop policy if exists "read_categories_anon" on categories;
create policy "read_categories_anon" on categories for select to anon, authenticated using (true);

-- ============================================================
-- Realtime publication
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end$$;

alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;
alter publication supabase_realtime add table tables;

-- ============================================================
-- Seed (demo): bir admin + 8 masa + 2 kategori + 6 ürün
-- ============================================================
insert into profiles (name, role, pin) values
  ('Admin',  'admin',   '1234'),
  ('Garson', 'waiter',  '1111'),
  ('Kasa',   'cashier', '9999')
on conflict (pin) do nothing;

insert into categories (name, sort_order) values
  ('Tatlılar', 1),
  ('İçecekler', 2)
on conflict do nothing;

with c as (select id, name from categories)
insert into products (category_id, name, price, sort_order)
select c.id, p.name, p.price, p.sort_order from c join (values
  ('Tatlılar','Çikolatalı Pasta (Dilim)', 120.00, 1),
  ('Tatlılar','Tiramisu', 110.00, 2),
  ('Tatlılar','Cheesecake', 130.00, 3),
  ('İçecekler','Türk Kahvesi', 60.00, 1),
  ('İçecekler','Çay', 25.00, 2),
  ('İçecekler','Filtre Kahve', 80.00, 3)
) as p(cname, name, price, sort_order) on c.name = p.cname
on conflict do nothing;

insert into tables (name, sort_order) values
  ('Masa 1', 1), ('Masa 2', 2), ('Masa 3', 3), ('Masa 4', 4),
  ('Masa 5', 5), ('Masa 6', 6), ('Masa 7', 7), ('Masa 8', 8)
on conflict (name) do nothing;
