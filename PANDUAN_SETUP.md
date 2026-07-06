# 📖 Panduan Setup Sekali Jalan (±30–45 menit)

Setelah panduan ini selesai, sistem posting sendiri 3x sehari selamanya, gratis.
Kerjakan berurutan dari bagian 1 sampai 6. Bagian 7–9 opsional tapi disarankan.

---

## 1. Ubah akun Instagram jadi Professional (Business/Creator)

1. Buka app Instagram → **Profil → ☰ → Pengaturan → Jenis akun & alat**
   (Account type & tools) → **Beralih ke akun profesional**.
2. Pilih **Bisnis** (atau Kreator — dua-duanya bisa).
3. Gratis, tidak mengubah tampilan profil secara signifikan.

## 2. Hubungkan ke Facebook Page

Instagram Graph API mensyaratkan akun IG terhubung ke satu Facebook Page.

1. Buka https://www.facebook.com/pages/create → buat Page baru
   (nama bebas, misal sama dengan nama akun IG kamu). Gratis.
2. Di app Instagram: **Pengaturan → Pusat Akun → Akun → Tambah akun Facebook**,
   atau dari Page: **Settings → Linked accounts → Instagram → Connect**.
3. Pastikan yang terhubung adalah akun IG Business dari langkah 1.

## 3. Buat Meta App (gratis)

1. Buka https://developers.facebook.com → login pakai akun Facebook yang sama
   → **My Apps → Create App**.
2. Use case: pilih **Other** → tipe **Business** → beri nama app
   (misal `AutoPost Affiliate`) → Create.
3. Tidak perlu submit review — untuk posting ke akun SENDIRI, mode Development
   sudah cukup selama kamu admin app-nya.

## 4. Ambil IG_USER_ID dan Access Token

Cara paling cepat pakai **Graph API Explorer**:

1. Buka https://developers.facebook.com/tools/explorer
2. Kanan atas: pilih **Meta App** = app yang barusan dibuat.
3. Klik **User or Page → Get User Access Token**, centang permission:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
   - `business_management`
4. Klik **Generate Access Token** → login/izinkan → pilih Page + akun IG kamu.
5. Di kolom query, jalankan: `me/accounts` → catat **id** Page kamu.
6. Jalankan: `{PAGE_ID}?fields=instagram_business_account`
   → catat angka `instagram_business_account.id`
   → **INI NILAI `IG_USER_ID`** ✅

## 5. Bikin token yang tahan lama

Token dari Explorer cuma berlaku ±1 jam. Pilih salah satu:

### 5A. Long-lived token (60 hari) — cepat

1. Ambil **App ID** dan **App Secret** dari dashboard app
   (**Settings → Basic**).
2. Buka URL ini di browser (ganti nilai-nilainya):
   ```
   https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=TOKEN_DARI_EXPLORER
   ```
3. Hasil `access_token` = **nilai `IG_ACCESS_TOKEN`** ✅ (berlaku 60 hari)
4. Tiap ±50 hari, perpanjang dengan:
   `APP_ID=... APP_SECRET=... OLD_TOKEN=... npm run refresh-token`
   lalu update secret di GitHub.

### 5B. System User token (TIDAK PERNAH kedaluwarsa) — direkomendasikan

1. Buka https://business.facebook.com/settings → menu **Users → System users**
   → **Add** → beri nama (misal `autopost-bot`), role **Admin**.
2. **Add Assets** → Pages → pilih Page kamu → centang full control.
   Ulangi untuk **Instagram accounts** kalau muncul sebagai aset.
3. Klik **Generate New Token** → pilih app kamu → **Token expiration: Never**
   → centang permission yang sama seperti langkah 4 → Generate.
4. Token ini = **nilai `IG_ACCESS_TOKEN`** ✅ — sekali set, lupakan selamanya.

## 6. Upload ke GitHub & nyalakan

1. Buat akun https://github.com (gratis) kalau belum punya.
2. **New repository** → nama misal `auto-promotion` → **Public** ⚠️ (wajib,
   supaya Instagram bisa membaca file media) → Create.
3. Upload SEMUA file folder ini: **Add file → Upload files** → drag semua
   (termasuk folder `.github` — kalau upload lewat web tidak bisa bawa folder,
   buat file `.github/workflows/autopost.yml` manual lewat **Add file →
   Create new file** dan paste isinya).
4. **Settings → Secrets and variables → Actions → New repository secret**:
   - Name: `IG_USER_ID` → value dari langkah 4.6
   - Name: `IG_ACCESS_TOKEN` → value dari langkah 5
5. Tab **Actions** → pilih **Auto Post Instagram** → **Run workflow** →
   centang **dry_run** → Run. Tunggu ±2 menit → hijau ✅? Lanjut.
6. **Run workflow** lagi TANPA dry_run → cek Instagram kamu → Reel tayang! 🎉
7. Selesai. Mulai sekarang bot jalan sendiri jam 08:00, 12:30, 19:00 WIB.

---

## 7. (Disarankan) Link di bio

Link di caption IG tidak bisa diklik — itu aturan Instagram. Supaya konversi
bagus:

- Taruh link landing gratis di bio: **beacons.ai** / **lnk.bio** / **linktr.ee**
  (semua punya plan gratis), isi dengan link-link affiliate terbaikmu; atau
- Buat halaman GitHub Pages gratis dari repo ini berisi daftar semua link
  (tinggal minta Claude buatkan `docs/index.html` + aktifkan Pages).

## 7B. (Disarankan) Ganti musik Reel

Reel sudah otomatis dapat soundtrack — bot memilih lagu dari `assets/music/`
sesuai jenis produk (fashion → upbeat, aksesoris → trendy, bunga → soft).
Ada 3 lagu bawaan sederhana; ganti dengan lagu bebas royalti yang lebih menarik
dengan menaruh file `.mp3` ke folder mood yang sesuai.

> ⚠️ **Lagu viral TikTok/IG berhak cipta TIDAK bisa ditempel otomatis lewat API**
> — Instagram akan mute/hapus videonya. Pakai musik bebas royalti (banyak yang
> bergaya viral). Detail + sumber gratis: lihat `assets/music/README.md`.

## 8. Mengatur jadwal & gaya

Semua di `config.json`:

- `slots` — tipe konten per slot: `"pagi": "REELS"`, `"siang": "STORIES"`, dst.
- `cooldownDays` — berapa hari sebelum produk yang sama boleh diposting lagi.
- `captionTemplate` — template caption; placeholder: `{teksPromosi}`, `{link}`,
  `{namaProduk}`, `{keywordTag}`.
- Jam posting: edit bagian `cron` di `.github/workflows/autopost.yml`
  (ingat: pakai UTC, WIB minus 7 jam).

## 9. Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| Workflow merah, log "Secret ... belum diset" | Ulangi langkah 6.4, nama secret harus persis `IG_USER_ID` / `IG_ACCESS_TOKEN` |
| Error `OAuthException ... expired` | Token 60 hari habis → langkah 5A.4, atau pindah ke 5B sekalian |
| Error `media belum bisa diakses publik` | Repo masih Private → ubah ke Public (Settings → Danger Zone → Change visibility) |
| Error `(#10) Application does not have permission` | Permission token kurang → ulangi langkah 4–5, pastikan `instagram_content_publish` tercentang |
| Container `ERROR` saat proses video | Jarang terjadi; coba Run workflow ulang. Kalau terus, cek video di folder `output/` masih valid |
| Tidak posting sesuai jam | GitHub cron kadang telat 5–15 menit saat trafik tinggi — normal |
| Mau ganti produk yang diposting | `npm run rank` (lokal) untuk lihat antrian, atau atur `Status`/`Komisi (%)` di CSV |

## Biaya total: Rp 0

- GitHub Actions free tier: 2.000 menit/bulan — sistem ini pakai ±90 menit.
- Instagram Graph API: gratis.
- Meta app: gratis.
- Tidak ada server, tidak ada langganan.
