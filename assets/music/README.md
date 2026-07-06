# 🎵 Folder Soundtrack

Bot memilih 1 lagu dari folder ini untuk tiap Reel, otomatis dicocokkan dengan
jenis produk:

| Folder | Dipakai untuk produk | Nuansa |
|---|---|---|
| `upbeat/` | Fashion / baju / dress | ceria, catchy |
| `trendy/` | Aksesoris / gaming / jewelry | beat, kekinian |
| `soft/`   | Bunga / flower | lembut, aesthetic |

Cara kerja: lagu di-loop/potong sepanjang video, diberi fade-in & fade-out,
lalu volume dinormalisasi. Kalau ada beberapa lagu di satu folder, bot berputar
pakai lagu berbeda tiap posting supaya feed tidak monoton.

## Sudah ada bawaan

Ada 3 jingle bawaan yang ceria (`jingle_upbeat_01.mp3`, `jingle_trendy_01.mp3`,
`jingle_soft_01.mp3`) — ada melodi + bass + drum, bukan dengungan. 100% bebas
copyright (disintesis sendiri), aman selamanya.

Mau versi lain? Jalankan `python3 tools/generate_music.py` untuk membuat ulang,
atau lebih baik tambahkan lagu bebas royalti favoritmu (lihat di bawah). Kalau
kamu menaruh lagu sendiri di folder yang sama, bot akan berputar memakai
keduanya bergantian tiap posting.

## Menambah lagu sendiri (disarankan)

Taruh file `.mp3` / `.m4a` / `.wav` ke folder yang sesuai (`upbeat/`, `trendy/`,
`soft/`), commit ke GitHub. Selesai — otomatis kepakai.

### ⚠️ Penting soal "lagu viral" (baca ini)

Kamu tadi minta "soundtrack viral". Perlu diketahui:

- **Lagu viral TikTok/IG (yang berhak cipta) TIDAK bisa ditempel otomatis lewat
  API.** Instagram hanya mengizinkan musik berlisensi dari library-nya kalau
  video dibuat LANGSUNG di dalam app Instagram — bukan lewat auto-post seperti
  sistem kita. Kalau kita paksa tempel lagu berhak cipta lewat API, Instagram
  akan **membisukan (mute) atau menghapus** video, dan akun bisa kena strike.
- Jadi supaya **tetap otomatis + gratis + aman**, pakai musik **bebas royalti**
  (royalty-free). Banyak yang bergaya "viral/upbeat" tapi legal.

### Sumber musik bebas royalti gratis (legal)

- **Pixabay Music** — https://pixabay.com/music/ (gratis, tanpa atribusi)
- **YouTube Audio Library** — https://studio.youtube.com → Audio Library
  (filter "No attribution required")
- **Facebook/Meta Sound Collection** — https://business.facebook.com/creatorstudio
  → Sound Collection (aman khusus untuk Meta/Instagram!)
- **Chosic**, **Uppbeat**, **Bensound** — cek lisensi "free / no attribution"

Cari kata kunci: `upbeat pop`, `shopping`, `fashion background`, `aesthetic lofi`.
Download → rename bebas → taruh di folder mood yang cocok.

### Kalau MAU pakai lagu viral asli untuk post tertentu

Biarkan bot posting Reel-nya dulu (dengan musik bebas royalti), lalu buka post
itu di app Instagram → **Edit / Remix / tambahkan Audio** dari library IG secara
manual. Ini satu-satunya cara legal memakai lagu berlisensi IG. Tapi ini manual,
tidak otomatis.

## Menghapus musik (kembali senyap)

Kosongkan folder-folder ini. Kalau tidak ada file musik sama sekali, Reel tetap
dibuat tapi dengan audio senyap (Instagram butuh minimal track audio kosong).
