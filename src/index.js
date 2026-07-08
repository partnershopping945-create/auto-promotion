/**
 * index.js — Orkestrator utama (dijalankan otomatis oleh GitHub Actions 3x sehari)
 *
 * Alur tiap kali jalan:
 *   1. Baca CSV produk -> hitung Priority Score -> pilih produk terbaik
 *      yang belum diposting dalam masa cooldown (rotasi otomatis)
 *   2. Generate gambar promo 1080x1920; kalau slot-nya REELS, render jadi video
 *   3. Commit & push file media ke repo (supaya punya URL publik via raw.githubusercontent.com)
 *   4. Publish ke Instagram lewat official Graph API (Reels/Story)
 *   5. Simpan state (produk sudah diposting) -> commit & push
 *
 * Mode:
 *   node src/index.js --dry-run          -> tanpa git & tanpa publish (tes lokal)
 *   node src/index.js --slot=pagi        -> paksa slot tertentu (pagi/siang/malam)
 *   SLOT=malam node src/index.js         -> slot via env (dipakai workflow)
 *
 * Env yang dibutuhkan saat publish sungguhan (diset sebagai GitHub Secrets):
 *   IG_USER_ID, IG_ACCESS_TOKEN
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { loadProducts, scoreProducts } from "./lib/products.js";
import { loadState, saveState, pickNextProduct, markPosted } from "./lib/state.js";
import { generateImage, generateReelVideo, categorizeProduct, pickMusic } from "./lib/media.js";
import { publish, postComment } from "./lib/instagram.js";

const config = JSON.parse(fs.readFileSync("config.json", "utf8"));
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

// === Tentukan slot posting (pagi/siang/malam, zona WIB / UTC+7) ===
function detectSlot() {
    const argSlot = args.find(a => a.startsWith("--slot="));
    if (argSlot) return argSlot.split("=")[1];
    if (process.env.SLOT) return process.env.SLOT;
    const wibHour = (new Date().getUTCHours() + 7) % 24;
    if (wibHour < 11) return "pagi";
    if (wibHour < 16) return "siang";
    return "malam";
}

function git(...cmd) {
    return execFileSync("git", cmd, { stdio: "pipe" }).toString().trim();
}

function gitCommitPush(paths, message) {
    git("add", ...paths);
    try {
        git("commit", "-m", message);
    } catch {
        console.log("   (tidak ada perubahan untuk di-commit)");
        return;
    }
    git("push");
}

// Hapus media lama supaya repo tidak membengkak
function cleanupOldOutputs(outputDir, keep) {
    if (!fs.existsSync(outputDir)) return [];
    const files = fs.readdirSync(outputDir)
        .filter(f => f.endsWith(".png") || f.endsWith(".mp4"))
        .map(f => path.join(outputDir, f))
        .sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);
    const toDelete = files.slice(0, Math.max(0, files.length - keep));
    toDelete.forEach(f => fs.rmSync(f));
    return toDelete;
}

// Pastikan raw.githubusercontent.com sudah bisa serve file yang baru dipush
async function waitForUrl(url, timeoutMs = 90_000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(url, { method: "HEAD" });
            if (res.ok) return;
        } catch { /* coba lagi */ }
        await new Promise(r => setTimeout(r, 5000));
    }
    throw new Error(`File media belum bisa diakses publik: ${url}`);
}

function buildCaption(product) {
    return config.captionTemplate
        .replaceAll("{teksPromosi}", product.teksPromosi || `Cek ${product.namaProduk} di Shopee!`)
        .replaceAll("{link}", product.linkAffiliate)
        .replaceAll("{namaProduk}", product.namaProduk)
        .replaceAll("{keywordTag}", product.keyword.replace(/[^a-z0-9]/g, ""));
}

async function main() {
    const slot = detectSlot();
    const mediaType = config.slots[slot] || "REELS";
    console.log(`🕐 Slot: ${slot} -> tipe posting: ${mediaType}${DRY_RUN ? " (DRY RUN)" : ""}`);

    // 1. Pilih produk
    const { products, problems } = loadProducts(config.csvPath);
    problems.forEach(p => console.warn(`⚠️  ${p}`));
    if (products.length === 0) throw new Error("Tidak ada produk valid di CSV.");

    const scored = scoreProducts(products, config.extraCommissionMultiplier);
    const state = loadState(config.statePath);
    const product = pickNextProduct(scored, state, config.cooldownDays);
    console.log(`🏆 Produk terpilih: ${product.namaProduk} (komisi ${product.komisiPersen}%, skor ${product.priorityScore}, rank #${product.priorityRank})`);

    // 2. Generate media
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const baseName = `post-${stamp}`;
    const imagePath = path.join(config.outputDir, `${baseName}.png`);
    await generateImage(product, imagePath, state.history.length);
    console.log(`🖼️  Gambar dibuat: ${imagePath}`);

    let mediaPath = imagePath;
    if (mediaType === "REELS") {
        mediaPath = path.join(config.outputDir, `${baseName}.mp4`);
        // Pilih soundtrack yang cocok dengan kategori produk (fashion/aksesoris/bunga)
        const mood = categorizeProduct(product);
        const musicSeed = state.history.length; // berputar tiap posting -> lagu bervariasi
        const musicPath = pickMusic(config.musicDir || "assets/music", mood, musicSeed);
        if (musicPath) console.log(`🎵 Soundtrack (${mood}): ${path.basename(musicPath)}`);
        else console.log("🔇 Belum ada file musik di assets/music/ -> Reel pakai audio senyap. (Lihat assets/music/README.md)");
        generateReelVideo(imagePath, mediaPath, config.reelDurationSeconds, musicPath);
        console.log(`🎬 Video Reel dibuat: ${mediaPath}`);
    }

    const caption = buildCaption(product);
    console.log(`📝 Caption:\n${caption}\n`);

    if (DRY_RUN) {
        console.log("✅ DRY RUN selesai — tidak ada yang dipublish. Cek folder output/.");
        return;
    }

    // 3. Push media ke repo agar dapat URL publik
    const repo = process.env.GITHUB_REPOSITORY;
    if (!repo) throw new Error("GITHUB_REPOSITORY tidak ada — jalankan lewat GitHub Actions, atau pakai --dry-run untuk tes lokal.");
    const branch = process.env.GITHUB_REF_NAME || "main";

    const deleted = cleanupOldOutputs(config.outputDir, config.keepLastOutputs);
    if (deleted.length) console.log(`🧹 Hapus ${deleted.length} media lama.`);
    gitCommitPush([config.outputDir], `media: ${product.namaProduk} (${slot}/${mediaType})`);

    const mediaUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${mediaPath.replace(/\\/g, "/")}`;
    console.log(`🔗 URL media publik: ${mediaUrl}`);
    await waitForUrl(mediaUrl);

    // 4. Publish ke Instagram
    const igUserId = process.env.IG_USER_ID;
    const accessToken = process.env.IG_ACCESS_TOKEN;
    if (!igUserId || !accessToken) throw new Error("Secret IG_USER_ID / IG_ACCESS_TOKEN belum diset di GitHub repo.");

    const { mediaId, permalink } = await publish({
        igUserId,
        accessToken,
        mediaType,
        mediaUrl,
        caption: mediaType === "REELS" ? caption : undefined
    });
    console.log(`✅ TAYANG! media id: ${mediaId}${permalink ? ` -> ${permalink}` : ""}`);

    // 4b. (Opsional) Tulis link affiliate sebagai komentar di post sendiri
    if (config.linkInComment) {
        try {
            const commentMsg = (config.commentTemplate || "🛒 Link produk: {link}")
                .replaceAll("{link}", product.linkAffiliate)
                .replaceAll("{namaProduk}", product.namaProduk);
            const commentId = await postComment({ mediaId, accessToken, message: commentMsg });
            console.log(`💬 Komentar link ditambahkan (id: ${commentId})`);
        } catch (err) {
            console.log(`⚠️  Gagal menambahkan komentar (posting utama tetap sukses): ${err.message}`);
        }
    }

    // 5. Simpan state
    markPosted(state, product, mediaType, permalink);
    saveState(config.statePath, state);
    gitCommitPush([config.statePath], `state: posted ${product.namaProduk} (${mediaType})`);
    console.log("💾 State tersimpan. Selesai.");
}

main().catch(err => {
    console.error(`❌ Gagal: ${err.message}`);
    process.exit(1);
});
