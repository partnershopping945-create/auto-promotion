/**
 * refresh-token.js — Perpanjang long-lived access token Meta (berlaku 60 hari)
 *
 * Long-lived token kedaluwarsa tiap ±60 hari. Jalankan script ini SEBELUM habis
 * untuk mendapat token baru, lalu update secret IG_ACCESS_TOKEN di GitHub.
 *
 * Cara pakai (lokal, sekali sebulan cukup):
 *   APP_ID=xxx APP_SECRET=yyy OLD_TOKEN=zzz node src/refresh-token.js
 *
 * TIPS: kalau tidak mau repot sama sekali, pakai "System User token" dari
 * Meta Business Suite — token itu TIDAK PERNAH kedaluwarsa
 * (lihat PANDUAN_SETUP.md bagian 5B). Script ini jadi tidak diperlukan.
 */

const { APP_ID, APP_SECRET, OLD_TOKEN } = process.env;

if (!APP_ID || !APP_SECRET || !OLD_TOKEN) {
    console.error("Set env dulu: APP_ID=... APP_SECRET=... OLD_TOKEN=... node src/refresh-token.js");
    process.exit(1);
}

const url = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
url.searchParams.set("grant_type", "fb_exchange_token");
url.searchParams.set("client_id", APP_ID);
url.searchParams.set("client_secret", APP_SECRET);
url.searchParams.set("fb_exchange_token", OLD_TOKEN);

const res = await fetch(url);
const data = await res.json();

if (data.error) {
    console.error("❌ Gagal:", data.error.message);
    process.exit(1);
}

console.log("✅ Token baru (berlaku ±60 hari):\n");
console.log(data.access_token);
console.log("\n➡️  Update secret IG_ACCESS_TOKEN di GitHub: Settings > Secrets and variables > Actions");
