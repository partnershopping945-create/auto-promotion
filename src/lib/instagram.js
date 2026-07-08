/**
 * instagram.js — Publikasi ke Instagram lewat OFFICIAL Instagram Graph API (gratis)
 *
 * Menggantikan: Make.com + ManyChat. Tidak ada biaya, tidak melanggar ToS.
 * Syarat (lihat PANDUAN_SETUP.md):
 *   - Akun Instagram Business/Creator yang terhubung ke Facebook Page
 *   - Meta app (gratis) + long-lived access token
 *
 * Alur publish (standar Meta):
 *   1. POST /{ig-user-id}/media          -> buat "media container" dari URL video/gambar
 *   2. GET  /{container-id}?fields=status_code  -> tunggu sampai FINISHED
 *   3. POST /{ig-user-id}/media_publish  -> tayang!
 */

// Metode Facebook Login (token dari Graph API Explorer).
// Publikasi lewat graph.facebook.com; IG_USER_ID = Instagram Business Account ID
// yang terhubung ke Facebook Page.
const GRAPH = "https://graph.instagram.com/v21.0";

async function graphFetch(url, options = {}) {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok || data.error) {
        const msg = data.error ? `${data.error.type}: ${data.error.message}` : `HTTP ${res.status}`;
        throw new Error(`Graph API error -> ${msg}`);
    }
    return data;
}

/**
 * @param {"REELS"|"STORIES"} mediaType
 * @param {string} mediaUrl  URL publik file video (Reels) / gambar (Stories)
 * @param {string} caption   hanya dipakai untuk REELS (Stories tidak punya caption)
 */
export async function createContainer({ igUserId, accessToken, mediaType, mediaUrl, caption }) {
    const params = new URLSearchParams({ access_token: accessToken });

    if (mediaType === "REELS") {
        params.set("media_type", "REELS");
        params.set("video_url", mediaUrl);
        params.set("share_to_feed", "false");
        if (caption) params.set("caption", caption.slice(0, 2200));
    } else if (mediaType === "STORIES") {
        params.set("media_type", "STORIES");
        if (mediaUrl.endsWith(".mp4")) params.set("video_url", mediaUrl);
        else params.set("image_url", mediaUrl);
    } else {
        throw new Error(`mediaType tidak dikenal: ${mediaType}`);
    }

    const data = await graphFetch(`${GRAPH}/${igUserId}/media`, {
        method: "POST",
        body: params
    });
    return data.id;
}

export async function waitUntilReady({ containerId, accessToken, timeoutMs = 5 * 60 * 1000 }) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const data = await graphFetch(
            `${GRAPH}/${containerId}?fields=status_code,status&access_token=${accessToken}`
        );
        if (data.status_code === "FINISHED") return;
        if (data.status_code === "ERROR") {
            throw new Error(`Container gagal diproses Instagram: ${data.status || "tanpa detail"}`);
        }
        console.log(`   ...container ${data.status_code}, tunggu 10 detik`);
        await new Promise(r => setTimeout(r, 10_000));
    }
    throw new Error("Timeout menunggu Instagram memproses media (5 menit).");
}

export async function publishContainer({ igUserId, accessToken, containerId }) {
    const params = new URLSearchParams({
        access_token: accessToken,
        creation_id: containerId
    });
    const data = await graphFetch(`${GRAPH}/${igUserId}/media_publish`, {
        method: "POST",
        body: params
    });
    return data.id; // media ID hasil publish
}

export async function getPermalink({ mediaId, accessToken }) {
    try {
        const data = await graphFetch(`${GRAPH}/${mediaId}?fields=permalink&access_token=${accessToken}`);
        return data.permalink || null;
    } catch {
        return null; // Stories tidak selalu punya permalink — bukan error fatal
    }
}

/**
 * Tulis komentar di media milik sendiri (mis. link affiliate).
 * Butuh izin instagram_business_manage_comments (sudah termasuk di use case
 * "Kelola pesan & konten di Instagram"). Non-fatal: kalau gagal, posting utama
 * tetap dianggap sukses.
 */
export async function postComment({ mediaId, accessToken, message }) {
    const params = new URLSearchParams({ access_token: accessToken, message });
    const data = await graphFetch(`${GRAPH}/${mediaId}/comments`, {
        method: "POST",
        body: params
    });
    return data.id;
}

/** Publish lengkap: container -> tunggu -> tayang. */
export async function publish({ igUserId, accessToken, mediaType, mediaUrl, caption }) {
    console.log(`📤 Membuat container ${mediaType}...`);
    const containerId = await createContainer({ igUserId, accessToken, mediaType, mediaUrl, caption });
    console.log(`⏳ Menunggu Instagram memproses (container ${containerId})...`);
    await waitUntilReady({ containerId, accessToken });
    console.log("🚀 Menerbitkan...");
    const mediaId = await publishContainer({ igUserId, accessToken, containerId });
    const permalink = await getPermalink({ mediaId, accessToken });
    return { mediaId, permalink };
}
