/**
 * tiktok-post.js — Auto-post satu video promo ke TikTok (@partnershopping).
 *
 * TERPISAH dari Instagram: punya workflow sendiri (.github/workflows/tiktok.yml),
 * secret sendiri, dan rotasi produk sendiri (state/tiktok-state.json) supaya
 * tidak bentrok dengan jadwal Instagram.
 *
 * Menjalankan:
 *   node src/tiktok-post.js               -> generate video + posting ke TikTok
 *   node src/tiktok-post.js --dry-run     -> generate video SAJA (tanpa posting)
 *   node src/tiktok-post.js --slot=pagi   -> paksa slot tertentu
 *
 * Secret / env yang dibutuhkan (untuk posting; tidak untuk --dry-run):
 *   TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REFRESH_TOKEN
 *   TIKTOK_PRIVACY   (opsional; default "SELF_ONLY". Ganti "PUBLIC_TO_EVERYONE" setelah audit lolos)
 */

import fs from "node:fs";
import path from "node:path";
import { loadProducts, scoreProducts } from "./lib/products.js";
import { loadState, saveState, pickNextProduct, markPosted } from "./lib/state.js";
import { generateImage, generateReelVideo, categorizeProduct, pickMusic } from "./lib/media.js";
import { refreshAccessToken, queryCreatorInfo, postVideo } from "./lib/tiktok.js";

const config = JSON.parse(fs.readFileSync("config.json", "utf8"));
const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const NO_STATE = args.includes("--no-state");

const TIKTOK_STATE = config.tiktokStatePath || "state/tiktok-state.json";

function detectSlot() {
    const a = args.find((x) => x.startsWith("--slot="));
    if (a) return a.split("=")[1];
    if (process.env.SLOT) return process.env.SLOT;
    const wibHour = (new Date().getUTCHours() + 7) % 24;
    if (wibHour < 11) return "pagi";
    if (wibHour < 16) return "siang";
    return "malam";
}

function buildTikTokCaption(product, seed = 0) {
    const variants = config.captionVariants || [];
    let teks = product.teksPromosi || `Cek ${product.namaProduk} di Shopee!`;
    if (variants.length) {
        teks = variants[seed % variants.length].replaceAll("{namaProduk}", product.namaProduk);
    }
    const tag = (product.keyword || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
    const hashtags = [
        "#shopeefinds", "#shopeehaul", "#racunshopee", "#fyp", "#tiktokshop",
        "#promoshopee", tag ? `#${tag}` : "",
    ].filter(Boolean).join(" ");
    return `${teks}\n\n🛒 Cek semua tokonya di bio ya!\n${hashtags}`;
}

async function main() {
    const slot = detectSlot();
    console.log(`🎬 TikTok auto-post — slot: ${slot}`);

    const { products, problems } = loadProducts(config.csvPath);
    problems.forEach((p) => console.warn(`⚠️  ${p}`));
    if (products.length === 0) throw new Error("Tidak ada produk valid di CSV.");

    const scored = scoreProducts(products, config.extraCommissionMultiplier);
    const state = loadState(TIKTOK_STATE);
    const product = pickNextProduct(scored, state, config.cooldownDays);
    console.log(`🏆 Produk: ${product.namaProduk} (komisi ${product.komisiPersen}%, rank #${product.priorityRank})`);

    // --- Generate media (gambar 1080x1920 -> video Reel/TikTok) ---
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const imagePath = path.join(config.outputDir, `tt-${stamp}.png`);
    await generateImage(product, imagePath, state.history.length);

    const mood = categorizeProduct(product);
    // Utamakan lagu kamu (assets/music/soundtrack.mp3) kalau ada; kalau tidak, pakai jingle sesuai mood.
    const musicDir = config.musicDir || "assets/music";
    const fixedSong = path.join(musicDir, "soundtrack.mp3");
    const music = fs.existsSync(fixedSong) ? fixedSong : pickMusic(musicDir, mood, state.history.length);
    if (music) console.log(`🎵 Musik: ${path.basename(music)}`);
    const videoPath = path.join(config.outputDir, `tt-${stamp}.mp4`);
    generateReelVideo(imagePath, videoPath, config.reelDurationSeconds, music);
    console.log(`🎥 Video siap: ${videoPath}`);

    const caption = buildTikTokCaption(product, state.history.length);
    console.log(`\n📝 Caption:\n${caption}\n`);

    if (DRY) {
        console.log("🧪 DRY RUN — video dibuat, TIDAK diposting ke TikTok.");
        return;
    }

    // --- Posting ke TikTok ---
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    const refreshToken = process.env.TIKTOK_REFRESH_TOKEN;
    if (!clientKey || !clientSecret || !refreshToken) {
        throw new Error("Secret TikTok belum lengkap (TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET / TIKTOK_REFRESH_TOKEN).");
    }
    const privacy = process.env.TIKTOK_PRIVACY || "SELF_ONLY";
    console.log(`🔒 Privacy level: ${privacy}${privacy === "SELF_ONLY" ? " (privat — normal selama app belum lolos audit)" : ""}`);

    console.log("🔄 Menyegarkan access token...");
    const tok = await refreshAccessToken({ clientKey, clientSecret, refreshToken });
    const accessToken = tok.access_token;

    try {
        const info = await queryCreatorInfo(accessToken);
        if (info.creator_username) console.log(`👤 Akun: @${info.creator_username}`);
        if (Array.isArray(info.privacy_level_options)) {
            console.log(`   Opsi privacy tersedia: ${info.privacy_level_options.join(", ")}`);
        }
    } catch (e) {
        console.warn(`   (creator info: ${e.message})`);
    }

    const { publishId, finalStatus } = await postVideo(accessToken, {
        title: caption,
        privacyLevel: privacy,
        filePath: videoPath,
        opts: { coverMs: 1000 },
        pollSeconds: 90,
    });

    console.log(`\n✅ Selesai. publish_id=${publishId} status=${finalStatus}`);
    if (finalStatus === "FAILED") {
        throw new Error("TikTok melaporkan status FAILED. Cek log_id di atas.");
    }
    if (privacy === "SELF_ONLY") {
        console.log("ℹ️  Video masuk sebagai PRIVAT (SELF_ONLY). Buka app TikTok @partnershopping untuk melihatnya.");
    }

    if (!NO_STATE) {
        markPosted(state, product, "TIKTOK", publishId);
        saveState(TIKTOK_STATE, state);
        console.log("💾 Produk ditandai sudah dipakai (rotasi TikTok maju).");
    }
}

main().catch((e) => {
    console.error(`❌ ${e.message}`);
    process.exit(1);
});
