/**
 * prepare.js — MODE SEMI-MANUAL
 *
 * Sama seperti index.js TAPI tidak publish ke Instagram. Gunanya:
 *   - pilih produk terbaik (priority + rotasi cooldown)
 *   - generate gambar promo + video Reel (dengan musik sesuai kategori)
 *   - tulis caption siap-copy ke output/caption.txt
 *   - simpan hasil ke folder outbox/ (reel + caption)
 *
 * Kamu tinggal buka file-nya, upload ke Instagram, tempel caption. Selesai.
 * Tanpa API, tanpa Facebook, tanpa token.
 *
 * Jalankan:
 *   node src/prepare.js                 -> deteksi slot dari jam (Reels/Story)
 *   node src/prepare.js --slot=pagi     -> paksa slot tertentu
 *   node src/prepare.js --no-state      -> jangan tandai produk sebagai sudah dipakai
 */

import fs from "node:fs";
import path from "node:path";
import { loadProducts, scoreProducts } from "./lib/products.js";
import { loadState, saveState, pickNextProduct, markPosted } from "./lib/state.js";
import { generateImage, generateReelVideo, categorizeProduct, pickMusic } from "./lib/media.js";

const config = JSON.parse(fs.readFileSync("config.json", "utf8"));
const args = process.argv.slice(2);
const NO_STATE = args.includes("--no-state");

function detectSlot() {
    const a = args.find(x => x.startsWith("--slot="));
    if (a) return a.split("=")[1];
    if (process.env.SLOT) return process.env.SLOT;
    const wibHour = (new Date().getUTCHours() + 7) % 24;
    if (wibHour < 11) return "pagi";
    if (wibHour < 16) return "siang";
    return "malam";
}

function buildCaption(product) {
    return config.captionTemplate
        .replaceAll("{teksPromosi}", product.teksPromosi || `Cek ${product.namaProduk} di Shopee!`)
        .replaceAll("{link}", product.linkAffiliate)
        .replaceAll("{namaProduk}", product.namaProduk)
        .replaceAll("{keywordTag}", product.keyword.replace(/[^a-z0-9]/g, ""));
}

const slot = detectSlot();
const mediaType = config.slots[slot] || "REELS";

const { products, problems } = loadProducts(config.csvPath);
problems.forEach(p => console.warn(`⚠️  ${p}`));
if (products.length === 0) throw new Error("Tidak ada produk valid di CSV.");

const scored = scoreProducts(products, config.extraCommissionMultiplier);
const state = loadState(config.statePath);
const product = pickNextProduct(scored, state, config.cooldownDays);

console.log(`🕐 Slot: ${slot} -> ${mediaType}`);
console.log(`🏆 Produk: ${product.namaProduk} (komisi ${product.komisiPersen}%, rank #${product.priorityRank})`);

// Generate media
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outbox = "outbox";
fs.mkdirSync(outbox, { recursive: true });

const imagePath = path.join(config.outputDir, `${stamp}.png`);
await generateImage(product, imagePath, state.history.length);

let mediaPath = imagePath;
let ext = "png";
if (mediaType === "REELS") {
    const mood = categorizeProduct(product);
    const music = pickMusic(config.musicDir || "assets/music", mood, state.history.length);
    if (music) console.log(`🎵 Musik (${mood}): ${path.basename(music)}`);
    mediaPath = path.join(config.outputDir, `${stamp}.mp4`);
    generateReelVideo(imagePath, mediaPath, config.reelDurationSeconds, music);
    ext = "mp4";
}

const caption = buildCaption(product);

// Simpan ke outbox: file bertanggal + "latest" biar gampang dicari
const datedMedia = path.join(outbox, `${stamp}-${slot}.${ext}`);
const datedCaption = path.join(outbox, `${stamp}-${slot}.txt`);
const latestMedia = path.join(outbox, `latest.${ext}`);
const latestCaption = path.join(outbox, `latest_caption.txt`);
fs.copyFileSync(mediaPath, datedMedia);
fs.copyFileSync(mediaPath, latestMedia);
fs.writeFileSync(datedCaption, caption);
fs.writeFileSync(latestCaption, caption);
fs.writeFileSync(path.join(config.outputDir, "caption.txt"), caption);

console.log(`\n📄 Caption (sudah disimpan ke ${datedCaption}):\n`);
console.log(caption);
console.log(`\n🎬 Media siap posting: ${datedMedia}`);

if (!NO_STATE) {
    markPosted(state, product, mediaType, null);
    saveState(config.statePath, state);
    console.log("\n💾 Produk ditandai sudah dipakai (rotasi maju).");
}
