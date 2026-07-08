/**
 * build-bio.js — Bangun halaman link-in-bio (docs/index.html) dari CSV.
 *
 * Jalankan manual kapan saja:
 *   node tools/build-bio.js
 * (Workflow juga otomatis membangun ulang halaman ini tiap kali posting.)
 */

import fs from "node:fs";
import { loadProducts, scoreProducts } from "../src/lib/products.js";
import { buildBioPage } from "../src/lib/bio.js";

const config = JSON.parse(fs.readFileSync("config.json", "utf8"));
const bio = config.bio || {};

const { products } = loadProducts(config.csvPath);
const scored = scoreProducts(products, config.extraCommissionMultiplier);

const updated = new Date().toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta"
});

const featCount = bio.featuredCount || 3;
const featured = products.slice(-featCount).reverse();

const out = buildBioPage(scored, bio.outPath || "docs/index.html", {
    shopName: bio.shopName,
    handle: bio.handle,
    tagline: bio.tagline,
    featured,
    updated
});

console.log(`✅ Halaman link-in-bio dibuat: ${out} (${scored.length} toko)`);
