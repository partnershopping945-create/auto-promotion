/**
 * bio.js — Generator halaman "link in bio" (GitHub Pages)
 *
 * Instagram TIDAK membuat link di caption/komentar bisa diklik. Satu-satunya
 * link yang bisa diklik adalah link di BIO. File ini membangun satu halaman
 * statis (docs/index.html) berisi SEMUA toko + tombol "Belanja di Shopee" yang
 * bisa diklik. Halaman di-host GRATIS di GitHub Pages, dan di-refresh otomatis
 * tiap kali workflow jalan (jadi produk baru di CSV langsung muncul).
 *
 * Pembeli TIDAK melihat komisi — hanya nama toko + tombol beli.
 */

import fs from "node:fs";
import path from "node:path";

// Kategori yang dilihat pembeli (untuk filter chip di halaman)
function buyerCategory(keyword = "") {
    const k = keyword.toLowerCase();
    if (/flower|bunga/.test(k)) return "Bunga";
    if (/aksesor|accessor|accesor/.test(k)) return "Aksesoris";
    if (/fashion|baju|dress|cloth/.test(k)) return "Fashion";
    return "Lainnya";
}

const CATEGORY_EMOJI = { Bunga: "🌸", Aksesoris: "💍", Fashion: "👗", Lainnya: "🛍️" };

function escapeHtml(s = "") {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * @param {Array} products  hasil loadProducts (boleh sudah di-score/sort)
 * @param {string} outPath  mis. "docs/index.html"
 * @param {object} meta     { shopName, handle, tagline, updated }
 */
export function buildBioPage(products, outPath, meta = {}) {
    const shopName = meta.shopName || "Partner Shopping";
    const handle = meta.handle || "";
    const tagline = meta.tagline || "Kumpulan toko pilihan di Shopee — tinggal klik & belanja! 🛒";
    const updated = meta.updated || "";

    const items = products.map(p => ({
        nama: p.namaProduk,
        link: p.linkAffiliate,
        cat: buyerCategory(p.keyword)
    }));

    // Produk terbaru (di-highlight di atas). meta.featured = array produk terbaru.
    const featured = (meta.featured || []).map(p => ({
        nama: p.namaProduk,
        link: p.linkAffiliate,
        cat: buyerCategory(p.keyword)
    }));
    const featuredHtml = featured.length ? `
  <div class="fresh">
    <div class="fresh-h">✨ Baru ditambahkan</div>
    ${featured.map(it => `<a class="fcard" href="${it.link}" target="_blank" rel="noopener nofollow">
      <span class="fic">${CATEGORY_EMOJI[it.cat] || "🛍️"}</span>
      <span class="fnm">${escapeHtml(it.nama)}</span>
      <span class="fbuy">Belanja →</span>
    </a>`).join("")}
  </div>` : "";

    // Data ditanam sebagai JSON supaya pencarian/filter jalan di sisi klien
    const dataJson = JSON.stringify(items);
    const cats = ["Semua", "Fashion", "Aksesoris", "Bunga", "Lainnya"]
        .filter(c => c === "Semua" || items.some(it => it.cat === c));

    const chipHtml = cats.map((c, i) =>
        `<button class="chip${i === 0 ? " active" : ""}" data-cat="${c}">${c}</button>`
    ).join("");

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>${escapeHtml(shopName)} — Link Belanja Shopee</title>
<meta name="description" content="${escapeHtml(tagline)}">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  :root { --shopee:#ee4d2d; --shopee2:#ff7337; --bg:#fff5f2; --ink:#2b2b2b; --muted:#8a8a8a; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; background:var(--bg); color:var(--ink); line-height:1.45; }
  .wrap { max-width:560px; margin:0 auto; padding:0 16px 48px; }
  header { text-align:center; padding:34px 16px 22px; background:linear-gradient(135deg,var(--shopee),var(--shopee2)); color:#fff; border-radius:0 0 26px 26px; box-shadow:0 6px 20px rgba(238,77,45,.28); }
  .avatar { width:76px; height:76px; border-radius:50%; background:#fff; margin:0 auto 12px; display:flex; align-items:center; justify-content:center; font-size:38px; box-shadow:0 4px 12px rgba(0,0,0,.15); }
  header h1 { font-size:22px; font-weight:800; letter-spacing:.2px; }
  header .handle { opacity:.92; font-size:14px; margin-top:2px; }
  header p.tag { font-size:13.5px; opacity:.95; margin:10px auto 0; max-width:340px; }
  .search { margin:18px 0 12px; position:sticky; top:8px; z-index:5; }
  .search input { width:100%; padding:13px 16px; border:2px solid #ffd9cd; border-radius:14px; font-size:15px; background:#fff; outline:none; transition:border-color .15s; }
  .search input:focus { border-color:var(--shopee); }
  .chips { display:flex; gap:8px; overflow-x:auto; padding:4px 0 12px; scrollbar-width:none; }
  .chips::-webkit-scrollbar { display:none; }
  .chip { flex:0 0 auto; padding:8px 16px; border:none; border-radius:999px; background:#fff; color:var(--ink); font-size:13.5px; font-weight:600; box-shadow:0 1px 4px rgba(0,0,0,.06); cursor:pointer; }
  .chip.active { background:var(--shopee); color:#fff; }
  .count { font-size:12.5px; color:var(--muted); margin:2px 2px 12px; }
  .card { display:flex; align-items:center; gap:13px; background:#fff; border-radius:16px; padding:13px 14px; margin-bottom:11px; box-shadow:0 2px 8px rgba(0,0,0,.05); transition:transform .12s; }
  .card:active { transform:scale(.985); }
  .ic { flex:0 0 auto; width:46px; height:46px; border-radius:12px; background:var(--bg); display:flex; align-items:center; justify-content:center; font-size:24px; }
  .info { flex:1 1 auto; min-width:0; }
  .info .nm { font-weight:700; font-size:14.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .info .ct { font-size:12px; color:var(--muted); margin-top:1px; }
  .buy { flex:0 0 auto; background:linear-gradient(135deg,var(--shopee),var(--shopee2)); color:#fff; text-decoration:none; font-weight:700; font-size:13px; padding:9px 15px; border-radius:11px; box-shadow:0 3px 8px rgba(238,77,45,.3); white-space:nowrap; }
  .empty { text-align:center; color:var(--muted); padding:40px 0; font-size:14px; }
  .fresh { margin:18px 0 6px; background:linear-gradient(135deg,#fff3ee,#ffe6dc); border:2px solid #ffd0bf; border-radius:18px; padding:14px 13px 6px; }
  .fresh-h { font-weight:800; font-size:14px; color:var(--shopee); margin:0 2px 10px; }
  .fcard { display:flex; align-items:center; gap:11px; background:#fff; border-radius:13px; padding:11px 12px; margin-bottom:9px; text-decoration:none; color:var(--ink); box-shadow:0 2px 6px rgba(238,77,45,.10); }
  .fcard .fic { flex:0 0 auto; width:38px; height:38px; border-radius:10px; background:var(--bg); display:flex; align-items:center; justify-content:center; font-size:20px; }
  .fcard .fnm { flex:1 1 auto; min-width:0; font-weight:700; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .fcard .fbuy { flex:0 0 auto; color:var(--shopee); font-weight:800; font-size:12.5px; }
  footer { text-align:center; color:var(--muted); font-size:11.5px; margin-top:26px; line-height:1.7; }
  footer a { color:var(--shopee); }
</style>
</head>
<body>
<header>
  <div class="avatar">🛍️</div>
  <h1>${escapeHtml(shopName)}</h1>
  ${handle ? `<div class="handle">@${escapeHtml(handle.replace(/^@/, ""))}</div>` : ""}
  <p class="tag">${escapeHtml(tagline)}</p>
</header>
<div class="wrap">
  ${featuredHtml}
  <div class="search"><input id="q" type="search" placeholder="🔍 Cari toko..." autocomplete="off"></div>
  <div class="chips">${chipHtml}</div>
  <div class="count" id="count"></div>
  <div id="list"></div>
  <div class="empty" id="empty" style="display:none">Toko tidak ditemukan 🙈</div>
</div>
<footer>
  Semua tombol langsung menuju Shopee. Belanja aman lewat aplikasi Shopee.<br>
  ${updated ? `Diperbarui: ${escapeHtml(updated)} · ` : ""}${items.length} toko
</footer>
<script>
  const DATA = ${dataJson};
  const EMOJI = ${JSON.stringify(CATEGORY_EMOJI)};
  const listEl = document.getElementById('list');
  const emptyEl = document.getElementById('empty');
  const countEl = document.getElementById('count');
  let cat = 'Semua', q = '';
  function render() {
    const ql = q.trim().toLowerCase();
    const rows = DATA.filter(it =>
      (cat === 'Semua' || it.cat === cat) &&
      (!ql || it.nama.toLowerCase().includes(ql))
    );
    countEl.textContent = rows.length + ' toko';
    emptyEl.style.display = rows.length ? 'none' : 'block';
    listEl.innerHTML = rows.map(it =>
      '<div class="card">' +
        '<div class="ic">' + (EMOJI[it.cat] || '🛍️') + '</div>' +
        '<div class="info"><div class="nm">' + it.nama.replace(/</g,'&lt;') + '</div>' +
        '<div class="ct">' + it.cat + '</div></div>' +
        '<a class="buy" href="' + it.link + '" target="_blank" rel="noopener nofollow">Belanja →</a>' +
      '</div>'
    ).join('');
  }
  document.getElementById('q').addEventListener('input', e => { q = e.target.value; render(); });
  document.querySelectorAll('.chip').forEach(ch => ch.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    ch.classList.add('active'); cat = ch.dataset.cat; render();
  }));
  render();
</script>
</body>
</html>`;

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, html);
    return outPath;
}
