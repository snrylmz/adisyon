-- ============================================================
-- 006: Ürün görselleri + ayarlar (kampanya banner) + storage
-- ============================================================

-- Ürünlere görsel URL'i
alter table products add column if not exists image_url text;

-- Basit key/value ayar tablosu (kampanya banner vb.)
create table if not exists settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

alter table settings enable row level security;

-- Anon okuyabilir (müşteri menüsünde kampanya banner için)
drop policy if exists "read_settings_anon" on settings;
create policy "read_settings_anon" on settings
  for select to anon, authenticated using (true);

-- Varsayılan kampanya satırları
insert into settings (key, value) values
  ('campaign_text', ''),
  ('campaign_active', 'false')
on conflict (key) do nothing;

-- ============================================================
-- Storage bucket: ürün görselleri (public read)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Public okuma policy'si
drop policy if exists "Public read product-images" on storage.objects;
create policy "Public read product-images"
  on storage.objects for select
  to public
  using (bucket_id = 'product-images');

-- Yazma sadece service_role ile (server action) yapılacak — ek policy gerekmez.
