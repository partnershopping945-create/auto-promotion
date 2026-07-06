/**
 * csv.js — Parser CSV mini (standar RFC 4180), TANPA dependency npm.
 *
 * Mendukung: header di baris pertama, field dalam tanda kutip,
 * koma & baris baru di dalam kutip, kutip ganda ("" -> "), dan BOM.
 * Cukup untuk file produk affiliate kita, tidak perlu install apa-apa.
 */

export function parseCsv(text) {
    // Buang BOM kalau ada
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const c = text[i];

        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') { field += '"'; i++; }
                else inQuotes = false;
            } else {
                field += c;
            }
        } else if (c === '"') {
            inQuotes = true;
        } else if (c === ",") {
            row.push(field); field = "";
        } else if (c === "\n" || c === "\r") {
            if (c === "\r" && text[i + 1] === "\n") i++;
            row.push(field); field = "";
            if (row.length > 1 || row[0] !== "") rows.push(row);
            row = [];
        } else {
            field += c;
        }
    }
    // Baris terakhir tanpa newline penutup
    if (field !== "" || row.length > 0) {
        row.push(field);
        if (row.length > 1 || row[0] !== "") rows.push(row);
    }

    if (rows.length === 0) return [];

    const header = rows[0].map(h => h.trim());
    return rows.slice(1).map(r => {
        const obj = {};
        header.forEach((h, idx) => (obj[h] = (r[idx] ?? "").trim()));
        return obj;
    });
}

export function stringifyCsv(header, rows) {
    const escape = v => {
        const s = String(v ?? "");
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.map(escape).join(",")];
    for (const row of rows) lines.push(header.map(h => escape(row[h])).join(","));
    return lines.join("\n") + "\n";
}
