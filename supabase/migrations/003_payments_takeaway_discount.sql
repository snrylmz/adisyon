-- ============================================================
-- 003: Ödeme tipi + iskonto/ikram + paket (takeaway) desteği
-- ============================================================

-- ---------- orders tablosu güncellemeleri ----------
alter table orders add column if not exists payment_type text
  check (payment_type in ('cash','card','transfer','other'));

alter table orders add column if not exists subtotal numeric(10,2) not null default 0;
alter table orders add column if not exists discount numeric(10,2) not null default 0;
alter table orders add column if not exists discount_reason text;

-- Paket sipariş için masa nullable
alter table orders alter column table_id drop not null;

-- Mevcut kayıtlarda subtotal = mevcut total (geriye dönük tutarlı kalsın)
update orders set subtotal = total where subtotal = 0 and total > 0;

-- ---------- Trigger güncellemeleri ----------
-- Eski trigger total'i hesaplıyordu. Yeni mantıkta subtotal'i hesaplıyoruz;
-- total'i ayrı BEFORE UPDATE trigger ile subtotal - discount olarak türetiyoruz.

create or replace function recalc_order_subtotal() returns trigger as $$
declare
  oid uuid := coalesce(new.order_id, old.order_id);
  s numeric;
begin
  select coalesce(sum(unit_price * quantity), 0) into s
    from order_items where order_id = oid;
  update orders set subtotal = s where id = oid;
  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_recalc_total_ins on order_items;
drop trigger if exists trg_recalc_total_upd on order_items;
drop trigger if exists trg_recalc_total_del on order_items;

create trigger trg_recalc_subtotal_ins after insert on order_items
  for each row execute function recalc_order_subtotal();
create trigger trg_recalc_subtotal_upd after update on order_items
  for each row execute function recalc_order_subtotal();
create trigger trg_recalc_subtotal_del after delete on order_items
  for each row execute function recalc_order_subtotal();

-- Orders'da subtotal veya discount değiştiğinde total = subtotal - discount
create or replace function compute_order_total() returns trigger as $$
begin
  new.total := new.subtotal - coalesce(new.discount, 0);
  if new.total < 0 then new.total := 0; end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_compute_total on orders;
create trigger trg_compute_total before insert or update on orders
  for each row execute function compute_order_total();

-- Mevcut kayıtların total'lerini bir kez yeniden hesapla (tetikleyici tetiklensin)
update orders set discount = discount;

-- ---------- z_reports tablosuna yeni alanlar ----------
alter table z_reports add column if not exists payments_by_type jsonb;
  -- {cash: 1240.50, card: 850.00, transfer: 200.00, other: 0}

alter table z_reports add column if not exists discount_total numeric(12,2) not null default 0;
  -- O Z'deki toplam iskonto/ikram tutarı

alter table z_reports add column if not exists takeaway_count int not null default 0;
alter table z_reports add column if not exists takeaway_revenue numeric(12,2) not null default 0;
