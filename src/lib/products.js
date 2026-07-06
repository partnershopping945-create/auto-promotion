/**
 * products.js — Baca CSV produk + hitung Priority Score
 *
 * Menggantikan: Airtable ("Produk Affiliate" table) + script priority ranking.
 * Sumber data satu-satunya adalah file CSV di repo (diedit manual sesuai prosedur).
 *
 * Kolom CSV (sama persis dengan file lama, tidak perlu diubah):
 *   Nama Produk, Link Affiliate, Keyword, Teks Promosi, Status,
 *   Komisi (%), Extra Commission, Penawaran Berakhir
 *
 * Aturan:
 * - Baris dengan Status "Skip", "Nonaktif", atau "Selesai" TIDAK akan diposting.
 *   Status lain (Draft/Ready/kosong) dianggap layak posting.
 * - Priority Score = Komisi (%) × 2 jika Extra Commission masih berlaku
 *   (checkbox TRUE dan tanggal "Penawaran Berakhir" belum lewat / kosong).
 */

import fs from "node:fs";
import { parseCsv } from "./csv.js";

const SKIP_STATUSES = new Set(["skip", "nonaktif", "selesai", "done", "off"]);

export function loadProducts(csvPath, now = new Date()) {
    const raw = fs.readFileSync(csvPath, "utf8");
    const rows = parseCsv(raw);

    const products = [];
    const problems = [];

    rows.forEach((row, i) => {
        const nama = (row["Nama Produk"] || "").trim();
        const link = (row["Link Affiliate"] || "").trim();
        const keyword = (row["Keyword"] || "").trim();
        const teks = (row["Teks Promosi"] || "").trim();
        const status = (row["Status"] || "").trim();
        const komisi = parseFloat(row["Komisi (%)"]) || 0;
        const extraRaw = (row["Extra Commission"] || "").toString().trim().toLowerCase();
        const extra = extraRaw === "true" || extraRaw === "1" || extraRaw === "yes" || extraRaw === "ya";
        const berakhirRaw = (row["Penawaran Berakhir"] || "").trim();

        // Validasi field wajib (sama seperti script Airtable lama)
        const missing = [];
        if (!nama) missing.push("Nama Produk");
        if (!link) missing.push("Link Affiliate");
        if (!keyword) missing.push("Keyword");
        if (missing.length > 0) {
            problems.push(`Baris ${i + 2}: field kosong -> ${missing.join(", ")}`);
            return;
        }

        if (SKIP_STATUSES.has(status.toLowerCase())) return;

        // Cek periode penawaran — kalau sudah lewat, Extra Commission dianggap tidak berlaku
        let extraMasihBerlaku = extra;
        let penawaranBerakhir = null;
        if (berakhirRaw) {
            const d = new Date(berakhirRaw);
            if (!isNaN(d.getTime())) {
                penawaranBerakhir = d;
                if (extra && now > d) extraMasihBerlaku = false;
            }
        }

        products.push({
            id: link, // link affiliate unik per toko -> dipakai sebagai ID
            namaProduk: nama,
            linkAffiliate: link,
            keyword: keyword.toLowerCase(),
            teksPromosi: teks,
            status,
            komisiPersen: komisi,
            extraCommission: extra,
            extraMasihBerlaku,
            penawaranBerakhir
        });
    });

    return { products, problems };
}

export function scoreProducts(products, multiplier = 2) {
    const scored = products.map(p => ({
        ...p,
        priorityScore: p.komisiPersen * (p.extraMasihBerlaku ? multiplier : 1)
    }));
    scored.sort((a, b) => b.priorityScore - a.priorityScore);
    scored.forEach((p, i) => (p.priorityRank = i + 1));
    return scored;
}
