/**
 * media.js — Generate gambar promo 1080x1920 (Story) + video Reel dari data CSV
 *
 * Gambar dibuat dari template SVG lalu dirender ke PNG memakai tool sistem:
 * rsvg-convert (diinstall workflow via apt) atau ImageMagick sebagai cadangan.
 * Video Reel dibuat dari PNG tersebut dengan ffmpeg (efek zoom pelan + audio senyap),
 * karena Instagram Reels wajib berupa video minimal 3 detik.
 *
 * TANPA dependency npm, tanpa Photoshop/Canva/AI berbayar — semua otomatis.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const W = 1080;
const H = 1920;

// Palet gradien — dipilih otomatis berdasarkan nama produk supaya feed tetap variatif
const PALETTES = [
    ["#EE4D2D", "#FF7337"], // Shopee orange
    ["#7C3AED", "#C084FC"], // ungu
    ["#0E7490", "#22D3EE"], // teal
    ["#BE185D", "#F472B6"], // pink
    ["#B45309", "#FBBF24"], // amber
    ["#166534", "#4ADE80"], // hijau
    ["#1E40AF", "#60A5FA"]  // biru
];

function hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h);
}

function esc(s) {
    return String(s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// Pecah nama produk jadi beberapa baris agar muat di kanvas
function wrapText(text, maxChars) {
    const words = text.split(/\s+/);
    const lines = [];
    let line = "";
    for (const w of words) {
        if ((line + " " + w).trim().length > maxChars && line) {
            lines.push(line.trim());
            line = w;
        } else {
            line = (line + " " + w).trim();
        }
    }
    if (line) lines.push(line.trim());
    return lines.slice(0, 4);
}

// Kata kunci pencarian foto stok per kategori (Pexels)
const STOCK_QUERIES = {
    upbeat: ["fashion outfit", "clothing boutique", "fashion model", "woman shopping fashion"],
    trendy: ["jewelry accessories", "fashion accessories", "wristwatch luxury", "handbag fashion"],
    soft: ["flower bouquet", "fresh flowers", "floral arrangement", "roses bunch"]
};

/**
 * Ambil foto stok gratis dari Pexels sesuai kategori produk.
 * Perlu env PEXELS_API_KEY (gratis). Return path file atau null kalau tidak ada
 * key / gagal (otomatis fallback ke desain gradien).
 */
export async function fetchStockPhoto(category, seed, outPath) {
    const key = process.env.PEXELS_API_KEY;
    if (!key) return null;
    const queries = STOCK_QUERIES[category] || STOCK_QUERIES.upbeat;
    const query = queries[Math.abs(seed) % queries.length];
    try {
        const res = await fetch(
            `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=portrait&size=large&per_page=30`,
            { headers: { Authorization: key } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        const photos = data.photos || [];
        if (!photos.length) return null;
        const photo = photos[Math.abs(seed * 7 + 3) % photos.length];
        const url = photo.src && (photo.src.portrait || photo.src.large2x || photo.src.large);
        if (!url) return null;
        const imgRes = await fetch(url);
        if (!imgRes.ok) return null;
        fs.writeFileSync(outPath, Buffer.from(await imgRes.arrayBuffer()));
        console.log(`📸 Foto stok "${query}" diambil dari Pexels.`);
        return outPath;
    } catch {
        return null;
    }
}

function imageToDataUri(imgPath) {
    const buf = fs.readFileSync(imgPath);
    const ext = path.extname(imgPath).toLowerCase();
    const mime = ext === ".png" ? "image/png" : "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
}

function featuredBadgeSvg(product, y) {
    if (!product.extraMasihBerlaku) return "";
    return `<g transform="translate(540 ${y})">
        <rect x="-360" y="-62" width="720" height="124" rx="62" fill="#FFD700"/>
        <text x="0" y="16" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif"
              font-size="52" font-weight="bold" fill="#7A1F00">★ PILIHAN HARI INI ★</text>
      </g>`;
}

// Desain gradien (fallback kalau tidak ada foto stok)
function buildGradientSvg(product) {
    const [c1] = PALETTES[hashCode(product.namaProduk) % PALETTES.length];
    const c2 = PALETTES[hashCode(product.namaProduk) % PALETTES.length][1];
    const nameLines = wrapText(product.namaProduk, 16);
    const nameSize = nameLines.length >= 3 ? 88 : 104;
    const nameStartYHero = 980 - (nameLines.length - 1) * (nameSize * 0.575);
    const nameTspans = nameLines
        .map((l, i) => `<tspan x="540" dy="${i === 0 ? 0 : nameSize * 1.15}">${esc(l)}</tspan>`)
        .join("");

    return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.35" r="0.8">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <circle cx="80" cy="180" r="200" fill="#ffffff" opacity="0.08"/>
  <circle cx="1020" cy="1750" r="260" fill="#ffffff" opacity="0.08"/>
  <circle cx="980" cy="300" r="90" fill="#ffffff" opacity="0.10"/>
  <text x="540" y="250" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif"
        font-size="46" font-weight="bold" fill="#ffffff" opacity="0.9" letter-spacing="8">PROMO SHOPEE HARI INI</text>
  ${featuredBadgeSvg(product, 430)}
  <text x="540" y="${nameStartYHero}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif"
        font-size="${nameSize}" font-weight="bold" fill="#ffffff">${nameTspans}</text>
  <text x="540" y="1250" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif"
        font-size="52" fill="#ffffff" opacity="0.95">Buruan diserbu sebelum kehabisan! ✨</text>
  <g transform="translate(540 1520)">
    <rect x="-440" y="-78" width="880" height="156" rx="78" fill="#ffffff"/>
    <text x="0" y="20" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif"
          font-size="56" font-weight="bold" fill="${c1}">➜ LINK ADA DI BIO</text>
  </g>
  <text x="540" y="1810" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif"
        font-size="38" fill="#ffffff" opacity="0.85">Ketuk foto profil di atas, klik link di BIO</text>
</svg>`;
}

// Desain foto: foto stok full-bleed + scrim gelap + teks di bawah
function buildPhotoSvg(product, photoDataUri) {
    const [c1] = PALETTES[hashCode(product.namaProduk) % PALETTES.length];
    const nameLines = wrapText(product.namaProduk, 18);
    const nameSize = nameLines.length >= 3 ? 82 : 96;
    const nameBottomY = 1440;
    const nameStartY = nameBottomY - (nameLines.length - 1) * (nameSize * 1.12);
    const nameTspans = nameLines
        .map((l, i) => `<tspan x="540" dy="${i === 0 ? 0 : nameSize * 1.12}">${esc(l)}</tspan>`)
        .join("");

    return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="scrimTop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="scrimBottom" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="45%" stop-color="#000000" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.9"/>
    </linearGradient>
  </defs>
  <image xlink:href="${photoDataUri}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>
  <rect x="0" y="0" width="${W}" height="520" fill="url(#scrimTop)"/>
  <rect x="0" y="820" width="${W}" height="1100" fill="url(#scrimBottom)"/>

  <text x="540" y="150" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif"
        font-size="44" font-weight="bold" fill="#ffffff" letter-spacing="7">PROMO SHOPEE HARI INI</text>
  ${featuredBadgeSvg(product, 300)}

  <text x="540" y="${nameStartY}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif"
        font-size="${nameSize}" font-weight="bold" fill="#ffffff">${nameTspans}</text>
  <text x="540" y="1540" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif"
        font-size="46" fill="#ffffff" opacity="0.95">Buruan diserbu sebelum kehabisan! ✨</text>

  <g transform="translate(540 1690)">
    <rect x="-430" y="-72" width="860" height="144" rx="72" fill="#ffffff"/>
    <text x="0" y="18" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif"
          font-size="52" font-weight="bold" fill="${c1}">➜ LINK ADA DI BIO</text>
  </g>
  <text x="540" y="1850" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif"
        font-size="34" fill="#ffffff" opacity="0.8">Ketuk foto profil di atas, klik link di BIO</text>
</svg>`;
}

function buildSvg(product, photoDataUri = null) {
    return photoDataUri ? buildPhotoSvg(product, photoDataUri) : buildGradientSvg(product);
}

function hasCommand(cmd) {
    try {
        execFileSync("which", [cmd], { stdio: "pipe" });
        return true;
    } catch {
        return false;
    }
}

function findChrome() {
    const candidates = [
        process.env.CHROME_PATH,
        "google-chrome", "chromium", "chromium-browser"
    ].filter(Boolean);
    for (const c of candidates) {
        if (c.includes("/") ? fs.existsSync(c) : hasCommand(c)) return c;
    }
    return null;
}

export async function generateImage(product, outPath, seed = 0) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    // Coba ambil foto stok sesuai kategori. Kalau ada -> foto jadi background.
    // Kalau tidak (no API key / gagal) -> otomatis pakai desain gradien.
    const category = categorizeProduct(product);
    const photoPath = outPath.replace(/\.png$/, ".bg.jpg");
    let photoDataUri = null;
    const gotPhoto = await fetchStockPhoto(category, seed, photoPath);
    if (gotPhoto) {
        photoDataUri = imageToDataUri(photoPath);
    } else {
        console.log("🎨 Tidak ada foto stok (PEXELS_API_KEY belum diset / gagal) -> pakai desain gradien.");
    }

    const svg = buildSvg(product, photoDataUri);
    const svgPath = outPath.replace(/\.png$/, ".svg");
    fs.writeFileSync(svgPath, svg);

    const chrome = findChrome();
    if (hasCommand("rsvg-convert")) {
        // Renderer utama — diinstall otomatis oleh workflow GitHub Actions
        execFileSync("rsvg-convert", ["-w", String(W), "-h", String(H), "-o", outPath, svgPath], { stdio: "pipe" });
    } else if (chrome) {
        // Cadangan: screenshot headless Chrome (untuk tes di laptop/PC biasa)
        execFileSync(chrome, [
            "--headless", "--no-sandbox", "--disable-gpu",
            "--hide-scrollbars", "--force-device-scale-factor=1",
            `--window-size=${W},${H}`,
            `--screenshot=${path.resolve(outPath)}`,
            `file://${path.resolve(svgPath)}`
        ], { stdio: "pipe" });
    } else if (hasCommand("convert")) {
        // Cadangan terakhir: ImageMagick (kualitas render SVG bervariasi)
        execFileSync("convert", ["-background", "none", "-size", `${W}x${H}`, svgPath, outPath], { stdio: "pipe" });
    } else {
        throw new Error("Tidak ada renderer SVG (rsvg-convert / Chrome / ImageMagick). Di GitHub Actions, workflow sudah menginstallnya otomatis.");
    }

    fs.rmSync(svgPath); // file svg sementara tidak perlu di-commit
    if (photoDataUri && fs.existsSync(photoPath)) fs.rmSync(photoPath); // hapus foto bg sementara
    return outPath;
}

/**
 * Kategorikan produk berdasarkan keyword -> "mood" musik yang cocok.
 * Dipakai untuk memilih folder soundtrack yang match dengan jenis produk.
 */
export function categorizeProduct(product) {
    const k = (product.keyword + " " + product.namaProduk).toLowerCase();
    if (/(bunga|flower|floral)/.test(k)) return "soft";       // bunga -> lembut/aesthetic
    if (/(fashion|baju|dress|cloth|wear|hijab)/.test(k)) return "upbeat"; // fashion -> upbeat/catchy
    if (/(akses|asesor|accessor|jewel|gaming|mobil|macbook)/.test(k)) return "trendy"; // aksesoris/aksessoris -> trendy/beat
    return "upbeat"; // default
}

/**
 * Pilih file musik dari folder assets/music/<mood>/ (atau assets/music/ langsung).
 * Return null kalau tidak ada file -> video akan pakai audio senyap (tetap valid di IG).
 *
 * @param {string} musicDir  root folder musik (mis. "assets/music")
 * @param {string} mood      hasil categorizeProduct()
 * @param {number} seed      angka untuk memilih track secara berputar (rotasi)
 */
export function pickMusic(musicDir, mood, seed = 0) {
    // Satu lagu tetap untuk SEMUA reel: kalau ada assets/music/soundtrack.mp3, selalu pakai itu.
    const fixed = path.join(musicDir, "soundtrack.mp3");
    if (fs.existsSync(fixed)) return fixed;
    const exts = /\.(mp3|m4a|aac|wav|ogg)$/i;
    const candidates = [];

    const moodDir = path.join(musicDir, mood);
    if (fs.existsSync(moodDir)) {
        for (const f of fs.readdirSync(moodDir)) if (exts.test(f)) candidates.push(path.join(moodDir, f));
    }
    // Kalau folder mood kosong, ambil dari root assets/music/
    if (candidates.length === 0 && fs.existsSync(musicDir)) {
        for (const f of fs.readdirSync(musicDir)) if (exts.test(f)) candidates.push(path.join(musicDir, f));
    }
    if (candidates.length === 0) return null;

    candidates.sort();
    return candidates[Math.abs(seed) % candidates.length];
}

/**
 * Buat video Reel dari gambar: efek zoom-in pelan (Ken Burns) + soundtrack.
 *
 * Kalau `musicPath` ada -> musik di-loop/potong sepanjang video, diberi
 * fade-in 0.4s + fade-out 1s, lalu di-normalisasi volumenya.
 * Kalau null -> pakai audio senyap (Instagram tetap menolak video TANPA
 * audio track, jadi minimal harus ada track kosong).
 */
export function generateReelVideo(imagePath, outPath, durationSeconds = 9, musicPath = null) {
    const fps = 30;
    const frames = durationSeconds * fps;
    const fadeOutStart = Math.max(0, durationSeconds - 1);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    const videoFilter =
        `scale=1620:2880,zoompan=z='min(zoom+0.0006,1.10)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${fps},format=yuv420p`;

    const args = ["-y", "-loop", "1", "-i", imagePath];

    if (musicPath && fs.existsSync(musicPath)) {
        // Loop musik tanpa henti (dipotong -shortest sesuai durasi video)
        args.push("-stream_loop", "-1", "-i", musicPath);
        args.push(
            "-vf", videoFilter,
            "-af", `afade=t=in:st=0:d=0.4,afade=t=out:st=${fadeOutStart}:d=1,loudnorm=I=-16:TP=-1.5:LRA=11`,
            "-map", "0:v:0", "-map", "1:a:0"
        );
    } else {
        // Fallback: audio senyap
        args.push("-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100");
        args.push("-vf", videoFilter, "-map", "0:v:0", "-map", "1:a:0");
    }

    args.push(
        "-t", String(durationSeconds),
        "-c:v", "libx264",
        "-profile:v", "high",
        "-preset", "medium",
        "-b:v", "4M",
        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "44100",
        "-shortest",
        "-movflags", "+faststart",
        outPath
    );

    execFileSync("ffmpeg", args, { stdio: "pipe" });
    return outPath;
}
