# Adisyon — Pastane Sipariş & Hesap Yönetimi

Tablet üzerinden çalışan, gerçek zamanlı çoklu cihaz senkronizasyonlu, web tabanlı (PWA) bir adisyon sistemi.

## Özellikler (v1)

- 🔐 PIN ile giriş (numpad)
- 🪑 Renkli masa ızgarası (yeşil=boş, kırmızı=dolu) — **gerçek zamanlı**
- 🧁 Kategorili ürün/menü yönetimi
- 📝 Sipariş alma (kategori sekme + ürün grid + +/- miktar)
- 💰 Hesap kapatma (kasiyer)
- 👥 Personel + rol yönetimi (admin / garson / kasa)
- 📱 PWA — tablette "Ana ekrana ekle" → uygulama gibi

## Teknoloji

- **Next.js 14** (App Router, Server Actions) + TypeScript
- **Supabase** — PostgreSQL + Realtime + (custom PIN auth)
- **Tailwind CSS**
- **Vercel** ile deploy (ücretsiz)

---

## Kurulum

### 1. Supabase projesi oluştur

1. <https://supabase.com> → yeni proje (ücretsiz tier yeterli)
2. Sol menü **SQL Editor** → `supabase/migrations/001_init.sql` içeriğini yapıştır → **Run**
   - Tabloları + RLS + tetikleyicileri + seed verisini oluşturur
   - Seed PIN'leri: `1234` (admin), `1111` (garson), `9999` (kasa) — **canlıya çıkmadan değiştir**
3. **Settings → API** sayfasından şu üç değeri kopyala:
   - `Project URL`
   - `anon` public key
   - `service_role` secret key

### 2. Yerel kurulum

```bash
cp .env.local.example .env.local
# .env.local içine yukarıdaki 3 değeri + 32+ karakterli SESSION_SECRET yaz

npm install
npm run dev
```

<http://localhost:3000> → PIN `1234` ile admin olarak gir.

### 3. Tablete kurma (PWA)

1. Uygulamayı Vercel'e deploy et (aşağı bak)
2. Tabletteki tarayıcıda (Chrome/Safari) site URL'ini aç
3. **Paylaş** → **Ana Ekrana Ekle** (iPad: Safari) veya **Menü → Uygulamayı Yükle** (Chrome)
4. İkon, uygulama gibi tam ekran açılır

### 4. Vercel deploy

1. Bu klasörü GitHub'a push et
2. <https://vercel.com> → **Import** → repo'yu seç
3. Environment Variables: `.env.local` içindeki **4 değişkeni** ekle
4. Deploy → tablette URL'i aç

---

## Mimari Notlar

- **Yazma işlemleri** sadece server actions ile (service_role anahtarı server'da kalır)
- **Okuma + Realtime** browser'dan anon key ile (RLS read-only policy'leri açık)
- **Masa-başına-tek-açık-sipariş** kuralı PostgreSQL'de unique partial index ile garanti
- **Adisyon toplamı** `order_items` değişince tetikleyici ile otomatik recalc edilir
- **Ürün ismi/fiyatı** sipariş kalemine snapshot olarak yazılır → ürün silinse de geçmiş bozulmaz
- **Personel pasifleştirilir, silinmez** → tarihsel referanslar korunur
- **Cookie session** HMAC-SHA256 ile imzalı (SESSION_SECRET)

## Veri akışı (sipariş)

```
Garson tableti                 Supabase                Kasa tableti
─────────────                  ────────               ──────────────
+ Çikolatalı Pasta  ───────►  insert order_item
                              trigger recalc total
                              realtime broadcast  ──►  Masa 3: 120 TL (yeşil→kırmızı)
```

## v2+ Yol Haritası

- 🖨️ Termal yazıcı (mutfak fişi + müşteri fişi) — Bluetooth/Web Print
- 📊 Gün sonu raporu / ciro
- 📦 Stok takibi
- 💳 POS / kart entegrasyonu
- 👨‍🍳 Mutfak ekranı (KDS)
- 📝 Sipariş kalemine not / pişirme tercihi

## Sorun giderme

- **"Supabase env vars missing"** → `.env.local` doğru yerde mi, `npm run dev` yeniden başlat
- **Realtime çalışmıyor** → Supabase Dashboard → Database → Replication → `orders`/`order_items`/`tables` tablolarının yayında (publication) olduğunu kontrol et (migration otomatik ekliyor)
- **Login sonrası /tables'a yönlenmiyor** → `SESSION_SECRET` 16 karakterden uzun mu
- **Tablete kurunca beyaz ekran** → `public/icons/` altında 192/512 PNG dosyaları var mı

## Lisans

Özel kullanım için. Pastane sahibi: senin.
