# 🛒 Shopee Affiliate Auto-Post ke Instagram — 100% Gratis

Sistem otomatis untuk share link affiliate Shopee ke Instagram (Reels + Story),
**tanpa Airtable, tanpa Make.com, tanpa ManyChat, tanpa biaya bulanan**.

Data produk diisi manual lewat file CSV (sesuai prosedur — kita tidak scraping
Shopee), sisanya jalan sendiri 3x sehari.

## Arsitektur

```
┌─────────────────────┐
│  data/products.csv  │  ← SATU-SATUNYA yang kamu edit manual
│  (link dari Shopee) │    (di GitHub web / HP / laptop)
└─────────┬───────────┘
          │  jadwal cron: 08:00, 12:30, 19:00 WIB
          ▼
┌─────────────────────────────────────────────┐
│  GITHUB ACTIONS (gratis selamanya)          │
│                                             │
│  1. Baca CSV → hitung Priority Score        │
│     (komisi × 2 kalau Extra Commission      │
│      masih berlaku, sama seperti sistem     │
│      Airtable lama)                         │
│  2. Pilih produk terbaik yang belum         │
│     diposting 7 hari terakhir (rotasi)      │
│  3. Generate gambar promo 1080×1920 (SVG)   │
│     + render video Reel 9 detik (ffmpeg)    │
│     + soundtrack cocok kategori produk      │
│  4. Commit media ke repo → dapat URL publik │
│  5. Publish via OFFICIAL Instagram Graph    │
│     API (Reels pagi & malam, Story siang)   │
│  6. Simpan riwayat ke state/state.json      │
└─────────┬───────────────────────────────────┘
          ▼
   📱 Instagram kamu (Reels + Story otomatis)
```

## Perbandingan dengan sistem lama

| Sistem lama (semalam) | Masalah | Sistem baru |
|---|---|---|
| Airtable "Run a script" | Berbayar (plan Team) | File CSV di repo + script Node |
| Make.com webhook + router | Limit 1.000 ops/bulan | GitHub Actions (2.000 menit/bulan gratis, kita pakai ±90) |
| ManyChat auto-DM | Fitur IG butuh Pro | Caption + link di bio (bisa ditambah auto-DM resmi nanti) |
| Webhook server Railway | Railway tidak gratis lagi | Tidak butuh server sama sekali |

## Struktur file

```
├── data/products.csv        ← daftar produk (edit di sini!)
├── config.json              ← jadwal slot, template caption, cooldown
├── assets/music/            ← soundtrack Reel (upbeat/trendy/soft), ganti sesukamu
├── state/state.json         ← riwayat posting (diisi otomatis oleh bot)
├── output/                  ← media hasil generate (otomatis, max 12 file)
├── src/
│   ├── index.js             ← orkestrator utama
│   ├── rank.js              ← lihat ranking prioritas (npm run rank)
│   ├── refresh-token.js     ← perpanjang token 60-harian (opsional)
│   └── lib/
│       ├── csv.js           ← parser CSV (tanpa dependency)
│       ├── products.js      ← baca CSV + priority score
│       ├── state.js         ← rotasi & cooldown
│       ├── media.js         ← generate gambar + video Reel
│       └── instagram.js     ← Instagram Graph API (official)
└── .github/workflows/autopost.yml  ← jadwal otomatis 3x sehari
```

## Cara pakai harian (setelah setup sekali)

1. Dapat link affiliate baru dari Shopee → buka `data/products.csv` di GitHub
   (bisa dari HP lewat github.com) → klik ✏️ Edit → tambah baris → Commit.
2. Selesai. Bot posting sendiri sesuai jadwal.
3. Produk tidak mau dipromosikan lagi? Ganti kolom `Status` jadi `Skip`.

Format kolom CSV **sama persis** dengan file lama:
`Nama Produk, Link Affiliate, Keyword, Teks Promosi, Status, Komisi (%), Extra Commission, Penawaran Berakhir`

## Setup pertama kali

Ikuti **PANDUAN_SETUP.md** (±30–45 menit, sekali saja):
akun IG Business → Meta app gratis → token → repo GitHub → secrets → aktif!

## Tes di laptop (opsional)

```bash
node src/index.js --dry-run        # generate media tanpa posting
npm run rank                       # lihat ranking prioritas produk
```

Butuh Node.js 20+ dan salah satu dari: `rsvg-convert`, Chrome, atau ImageMagick
(untuk render gambar), plus `ffmpeg` untuk video. Di GitHub Actions semuanya
sudah diurus otomatis oleh workflow.

## Batasan yang perlu diketahui

- **Repo harus public** supaya file media punya URL yang bisa dibaca Instagram.
  (Link affiliate memang untuk disebar publik, jadi aman.)
- Instagram Graph API membatasi **50 post per 24 jam** — kita cuma pakai 3.
- Link di caption Instagram **tidak bisa diklik** (aturan Instagram, bukan bot).
  Solusi: CTA "link di bio" + update link bio berkala, lihat panduan bagian 7.
- Token akses berlaku 60 hari (kalau pakai cara cepat) — jalankan
  `npm run refresh-token` sebulan sekali, ATAU pakai System User token yang
  **tidak pernah kedaluwarsa** (panduan bagian 5B, direkomendasikan).
