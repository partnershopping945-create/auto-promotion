/**
 * tiktok.js — Klien TikTok Content Posting API (Direct Post, FILE_UPLOAD).
 *
 * ALUR:
 *   1. refreshAccessToken()  -> tukar refresh_token jadi access_token baru (berlaku 24 jam)
 *   2. queryCreatorInfo()    -> cek akun & opsi privacy yang diizinkan
 *   3. initVideoUpload()     -> daftarkan video, dapat publish_id + upload_url
 *   4. uploadVideoFile()     -> kirim byte video ke upload_url (PUT)
 *   5. fetchPublishStatus()  -> cek status sampai video selesai diproses
 *
 * CATATAN PENTING soal AUDIT:
 *   Selama app TikTok BELUM lolos audit, video HANYA bisa privacy "SELF_ONLY"
 *   (privat, cuma kamu yang lihat) dan hanya ke akun yang terdaftar sebagai
 *   Target User di Sandbox. Setelah audit disetujui, ganti env TIKTOK_PRIVACY
 *   jadi "PUBLIC_TO_EVERYONE" supaya otomatis tayang publik.
 *
 * Tanpa dependency npm — pakai global fetch bawaan Node 20.
 */

import fs from "node:fs";

const OAUTH = "https://open.tiktokapis.com/v2/oauth/token/";
const API = "https://open.tiktokapis.com/v2";

/**
 * Tukar refresh_token (berumur 1 tahun) jadi access_token baru (24 jam).
 * Return { access_token, refresh_token, open_id, ... }.
 * TikTok kadang memberi refresh_token baru — kalau ada, sebaiknya disimpan.
 */
export async function refreshAccessToken({ clientKey, clientSecret, refreshToken }) {
    const body = new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
    });
    const res = await fetch(OAUTH, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
        throw new Error(`Refresh token gagal: ${res.status} ${JSON.stringify(data)}`);
    }
    return data;
}

function authHeaders(accessToken, json = true) {
    const h = { Authorization: `Bearer ${accessToken}` };
    if (json) h["Content-Type"] = "application/json; charset=UTF-8";
    return h;
}

function checkApiError(data, label) {
    // Respons TikTok selalu punya objek "error" dengan code "ok" kalau sukses.
    const err = data && data.error;
    if (err && err.code && err.code !== "ok") {
        throw new Error(`${label} gagal: ${err.code} — ${err.message} (log_id: ${err.log_id})`);
    }
}

/**
 * Ambil info kreator (nama, opsi privacy yang tersedia, batasan durasi, dll).
 * Wajib dipanggil sebelum posting menurut praktik terbaik TikTok.
 */
export async function queryCreatorInfo(accessToken) {
    const res = await fetch(`${API}/post/publish/creator_info/query/`, {
        method: "POST",
        headers: authHeaders(accessToken),
    });
    const data = await res.json();
    checkApiError(data, "Query creator info");
    return data.data || {};
}

/**
 * Daftarkan video untuk di-upload (Direct Post).
 * @returns { publish_id, upload_url }
 */
export async function initVideoUpload(accessToken, { title, privacyLevel, videoSize, opts = {} }) {
    const post_info = {
        title: (title || "").slice(0, 2200),
        privacy_level: privacyLevel,
        disable_duet: !!opts.disableDuet,
        disable_comment: !!opts.disableComment,
        disable_stitch: !!opts.disableStitch,
        video_cover_timestamp_ms: opts.coverMs != null ? opts.coverMs : 1000,
    };
    // File kecil (< 64MB) boleh 1 chunk: chunk_size = video_size, total_chunk_count = 1.
    const source_info = {
        source: "FILE_UPLOAD",
        video_size: videoSize,
        chunk_size: videoSize,
        total_chunk_count: 1,
    };
    const res = await fetch(`${API}/post/publish/video/init/`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ post_info, source_info }),
    });
    const data = await res.json();
    checkApiError(data, "Init video upload");
    if (!data.data || !data.data.upload_url || !data.data.publish_id) {
        throw new Error(`Init video upload: respons tak terduga ${JSON.stringify(data)}`);
    }
    return data.data;
}

/**
 * Kirim byte video ke upload_url (PUT, 1 chunk penuh).
 */
export async function uploadVideoFile(uploadUrl, filePath) {
    const buf = fs.readFileSync(filePath);
    const size = buf.length;
    const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
            "Content-Type": "video/mp4",
            "Content-Length": String(size),
            "Content-Range": `bytes 0-${size - 1}/${size}`,
        },
        body: buf,
    });
    if (!res.ok && res.status !== 201) {
        const t = await res.text().catch(() => "");
        throw new Error(`Upload video gagal: HTTP ${res.status} ${t}`);
    }
    return true;
}

/**
 * Cek status pemrosesan video setelah upload.
 * @returns { status, ... }  status: PROCESSING_UPLOAD | PUBLISH_COMPLETE | FAILED ...
 */
export async function fetchPublishStatus(accessToken, publishId) {
    const res = await fetch(`${API}/post/publish/status/fetch/`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ publish_id: publishId }),
    });
    const data = await res.json();
    checkApiError(data, "Fetch publish status");
    return data.data || {};
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Proses lengkap: init -> upload -> poll status.
 * @returns { publishId, finalStatus }
 */
export async function postVideo(accessToken, { title, privacyLevel, filePath, opts, pollSeconds = 60 }) {
    const videoSize = fs.statSync(filePath).size;
    console.log(`📦 Ukuran video: ${(videoSize / 1048576).toFixed(2)} MB`);

    const { publish_id, upload_url } = await initVideoUpload(accessToken, {
        title, privacyLevel, videoSize, opts,
    });
    console.log(`🆔 publish_id: ${publish_id}`);

    await uploadVideoFile(upload_url, filePath);
    console.log("⬆️  Video terkirim ke TikTok. Menunggu diproses...");

    let finalStatus = "PROCESSING_UPLOAD";
    const deadline = Date.now() + pollSeconds * 1000;
    while (Date.now() < deadline) {
        await sleep(5000);
        let st;
        try {
            st = await fetchPublishStatus(accessToken, publish_id);
        } catch (e) {
            console.warn(`   (cek status: ${e.message})`);
            continue;
        }
        finalStatus = st.status || finalStatus;
        console.log(`   status: ${finalStatus}`);
        if (["PUBLISH_COMPLETE", "FAILED", "SEND_TO_USER_INBOX"].includes(finalStatus)) break;
    }
    return { publishId: publish_id, finalStatus };
}
