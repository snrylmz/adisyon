-- ============================================================
-- 005: Web Push subscription'ları — tabletlerin push endpoint'leri
-- ============================================================

create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);

create index if not exists push_subs_user_idx on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

-- Sadece service_role yazabilir (server actions üzerinden).
-- Anon erişim yok — gizli endpoint'leri kimse okumamalı.
