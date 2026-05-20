-- ============================================================
-- TEST VERİSİ TEMİZLİĞİ
-- Sadece işlem verisini siler: adisyonlar, sipariş kalemleri,
-- Z raporları, bekleyen siparişler.
--
-- KORUNUR: kategoriler, ürünler, masalar, personel, push aboneliği
--
-- ⚠️ GERİ ALINAMAZ. Çalıştırmadan önce emin ol.
-- Supabase → SQL Editor → New query → yapıştır → Run
-- ============================================================

begin;

-- Sipariş kalemleri (orders cascade ile de silinir ama açıkça yazıyoruz)
delete from order_items;

-- Adisyonlar (açık + kapalı + iptal)
delete from orders;

-- Z raporları (gün sonu snapshot'ları) — numara tekrar 1'den başlar
delete from z_reports;

-- Müşteri bekleyen sipariş talepleri
delete from pending_orders;

commit;

-- ---- Doğrulama (opsiyonel — çalıştırınca 0 dönmeli) ----
-- select
--   (select count(*) from orders)         as orders,
--   (select count(*) from order_items)    as order_items,
--   (select count(*) from z_reports)      as z_reports,
--   (select count(*) from pending_orders) as pending_orders;
