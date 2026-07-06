/**
 * state.js — Ingat produk mana yang sudah diposting (rotasi + cooldown)
 *
 * Menggantikan: kolom "Status = Terkirim ke Make" di Airtable.
 * State disimpan sebagai JSON di repo dan di-commit balik oleh GitHub Actions,
 * jadi riwayat posting tersimpan permanen tanpa database.
 */

import fs from "node:fs";
import path from "node:path";

export function loadState(statePath) {
    try {
        return JSON.parse(fs.readFileSync(statePath, "utf8"));
    } catch {
        return { posted: {}, history: [] };
    }
}

export function saveState(statePath, state) {
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

/**
 * Pilih produk berikutnya:
 * 1. Kandidat utama = skor tertinggi yang BELUM diposting dalam `cooldownDays` terakhir.
 * 2. Kalau semua produk masih dalam cooldown, pilih yang paling lama tidak diposting
 *    (supaya rotasi tetap jalan dan tidak pernah macet).
 */
export function pickNextProduct(scoredProducts, state, cooldownDays, now = new Date()) {
    if (scoredProducts.length === 0) return null;
    const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;

    const fresh = scoredProducts.filter(p => {
        const last = state.posted[p.id];
        if (!last) return true;
        return now.getTime() - new Date(last).getTime() > cooldownMs;
    });

    if (fresh.length > 0) return fresh[0]; // sudah terurut by priorityScore

    // Semua dalam cooldown -> ambil yang paling lama tidak diposting
    return [...scoredProducts].sort((a, b) => {
        const ta = new Date(state.posted[a.id] || 0).getTime();
        const tb = new Date(state.posted[b.id] || 0).getTime();
        return ta - tb;
    })[0];
}

export function markPosted(state, product, mediaType, permalink, now = new Date()) {
    state.posted[product.id] = now.toISOString();
    state.history.push({
        tanggal: now.toISOString(),
        namaProduk: product.namaProduk,
        keyword: product.keyword,
        komisiPersen: product.komisiPersen,
        priorityScore: product.priorityScore,
        mediaType,
        permalink: permalink || null
    });
    // Batasi riwayat 500 entri terakhir supaya file tidak membengkak
    if (state.history.length > 500) state.history = state.history.slice(-500);
    return state;
}
