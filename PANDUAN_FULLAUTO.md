# 🔒 Panduan Full-Auto (Metode Instagram Login, TANPA Facebook Page)

Panduan ini kamu kerjakan **SENDIRI, dengan tangan, pelan-pelan** di browser
biasa kamu (HP atau laptop). **JANGAN pakai automation/bot** untuk langkah Meta —
itulah yang bikin akun kena kunci kemarin. Anggap ini seperti login manusia biasa.

## ⚠️ Aturan aman biar tidak kena flag Meta lagi
- Kerjakan di **device kamu sendiri** yang biasa dipakai (HP lebih aman).
- Pakai **browser normal** (Chrome/Safari biasa), bukan alat otomatis.
- **Jangan buru-buru.** Kasih jeda beberapa detik tiap langkah, seperti manusia.
- Kalau diminta verifikasi (kode SMS/foto), lakukan dengan sabar. **Jangan
  retry login berkali-kali** kalau gagal — tunggu, lalu coba sekali lagi.
- Gunakan **akun Facebook lama** yang sudah mapan (bukan yang baru).

---

## LANGKAH 0: Pulihkan akun yang kena kunci (kalau masih terkunci)
Sebelum apa pun: buka facebook.com di HP kamu, ikuti "Konfirmasi ini kamu" /
security check. Tunggu sampai bisa masuk normal. **Jangan lanjut ke bawah
sampai akun benar-benar sudah pulih dan bisa login tenang.**

## LANGKAH 1: Akun Instagram — sudah beres ✅
@part.nershopping sudah tipe Professional (ada tab insight). Tidak perlu apa-apa.
Pastikan akun IG-nya **publik** (Settings → Account privacy → bukan private).

## LANGKAH 2: Daftar Meta Developer (akun FB lama)
1. Di browser HP, login Facebook (akun lama) dulu sampai masuk normal.
2. Buka **developers.facebook.com** → klik **Get Started / Mulai**.
3. Setujui terms → verifikasi **nomor HP** (kode SMS) → isi email.
   - Kalau email ditolak "tidak bisa digunakan", pakai email lain yang belum
     pernah dipakai untuk developer Meta.
4. Selesai sampai lihat dashboard developer.

## LANGKAH 3: Buat App Instagram
1. Di dashboard → **Create App / Buat Aplikasi**.
2. Pilih use case: **Other** → tipe **Business** → beri nama (misal `AutoPost`).
3. Di app, buka menu **Add products** → cari **Instagram** →
   pilih **"API setup with Instagram login"** (BUKAN "Facebook login").

## LANGKAH 4: Generate token (ini inti-nya)
1. Di **Instagram → API setup with Instagram login**, cari bagian
   **"1. Generate access tokens"**.
2. Klik **Add account** → login/izinkan pakai **Instagram @part.nershopping**
   (popup Instagram, bukan Facebook).
3. Centang izin: **instagram_business_basic** dan
   **instagram_business_content_publish**.
4. Setelah terhubung, klik **Generate token** → **SALIN token panjang** itu.
   → Ini nilai **IG_ACCESS_TOKEN**. (Berlaku ~60 hari.)

## LANGKAH 5: Ambil Instagram User ID
Buka URL ini di browser (ganti `TOKEN_KAMU` dengan token dari Langkah 4):
```
https://graph.instagram.com/v21.0/me?fields=user_id,username&access_token=TOKEN_KAMU
```
Akan muncul JSON berisi `"user_id": "1784xxxxxxxxx"`.
→ Angka `user_id` itu nilai **IG_USER_ID**.

## LANGKAH 6: Masukkan 2 secret ke GitHub
Repo: github.com/partnershopping945-create/auto-promotion
→ **Settings → Secrets and variables → Actions → New repository secret**
- Name: `IG_USER_ID`      → value: angka dari Langkah 5
- Name: `IG_ACCESS_TOKEN` → value: token dari Langkah 4

(Beri tahu aku kalau dua secret sudah masuk — aku akan push update kode
`graph.instagram.com` ke repo, lalu kita test.)

## LANGKAH 7: Test & nyalakan
1. Tab **Actions → Auto Post Instagram → Run workflow** → centang **dry_run** →
   Run. Tunggu hijau ✅.
2. Run sekali lagi TANPA dry_run → cek Instagram → Reel tayang! 🎉
3. Mulai jalan sendiri 3×/hari.

## Perpanjang token (sebulan sekali)
Token berlaku ~60 hari. Sebelum habis, di komputer:
```
OLD_TOKEN=token_lama node src/refresh-token.js
```
Salin token baru → update secret `IG_ACCESS_TOKEN` di GitHub. Selesai.

---

### Kalau macet di langkah mana pun
Foto/screenshot layarnya dan tanya aku. Aku pandu lewat teks — **tanpa**
mengendalikan browser Meta kamu, biar akun aman.
