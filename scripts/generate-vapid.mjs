// Web Push için VAPID anahtarları üretir. Bir kez çalıştır,
// çıktıyı .env.local'a ve Vercel env'e yapıştır.
//
// Çalıştır: node scripts/generate-vapid.mjs

import webpush from 'web-push'

const keys = webpush.generateVAPIDKeys()

console.log('\n========================================')
console.log('VAPID anahtarları üretildi')
console.log('========================================\n')
console.log('Bu değerleri .env.local ve Vercel Project Settings → Environment Variables\'a ekle:\n')
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
console.log(`VAPID_SUBJECT=mailto:your-email@example.com  # kendi mail adresinle değiştir`)
console.log('\n⚠️  Private key gizli! Asla repo\'ya commit etme, kimseyle paylaşma.')
console.log('   Kaybedersen tüm push subscription\'lar geçersizleşir.\n')
