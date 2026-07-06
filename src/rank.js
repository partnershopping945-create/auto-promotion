/**
 * rank.js — Lihat ranking prioritas semua produk (pengganti 3_priority_ranking_script.js)
 *
 * Jalankan manual kapan saja:  npm run rank
 * Menampilkan tabel: rank, nama produk, komisi, extra masih berlaku, skor,
 * dan kapan terakhir diposting (dari state.json).
 */

import fs from "node:fs";
import { loadProducts, scoreProducts } from "./lib/products.js";
import { loadState } from "./lib/state.js";

const config = JSON.parse(fs.readFileSync("config.json", "utf8"));

const { products, problems } = loadProducts(config.csvPath);
problems.forEach(p => console.warn(`⚠️  ${p}`));

const scored = scoreProducts(products, config.extraCommissionMultiplier);
const state = loadState(config.statePath);

console.log(`\n📊 Ranking ${scored.length} produk (skor = komisi × ${config.extraCommissionMultiplier} jika extra commission masih berlaku)\n`);

const rows = scored.map(p => ({
    Rank: p.priorityRank,
    Produk: p.namaProduk.slice(0, 32),
    "Komisi %": p.komisiPersen,
    Extra: p.extraMasihBerlaku ? "✔" : "-",
    Skor: p.priorityScore,
    "Terakhir Diposting": state.posted[p.id]
        ? new Date(state.posted[p.id]).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
        : "belum pernah"
}));

console.table(rows.slice(0, 30));
if (rows.length > 30) console.log(`...dan ${rows.length - 30} produk lainnya.`);

console.log("\n🏆 Top 3 kandidat posting berikutnya:");
rows.slice(0, 3).forEach(r => console.log(`  ${r.Rank}. ${r.Produk} (skor ${r.Skor})`));
