# Monitor Portofolio IDX

Situs statis Cloudflare Pages untuk `idx.posnew.com`.

## Halaman

- `/` — ringkasan portofolio langsung yang terhubung ke CSV Google Sheets terpublikasi.
- `/fundamentals` — perbandingan bulanan lima bank; BMRI tersedia sampai Juli 2026 dengan pembanding Juli 2025, sedangkan BNGA/BBNI/NISP/BBCA lengkap sampai Juni.

## Deployment

Tidak diperlukan perintah build. Unggah repositori ke GitHub dan hubungkan direktori root ke Cloudflare Pages.

## Struktur proyek

- `index.html`
- `fundamentals.html`
- `assets/styles.css`
- `assets/app.js`
- `assets/fundamentals.js`
- Berkas Cloudflare Pages: `_headers`, `404.html`

## Catatan data

Ringkasan portofolio mempertahankan URL CSV Google Sheets dari proyek awal. Halaman fundamental memuat BMRI sampai Juli 2026 serta tambahan BNGA Q2 2026 versus Juni 2025. Sorotan BNGA memakai angka konsolidasian; seri bulanannya memakai laba bank individual dan kredit konvensional bank individual hasil hitung agar basis Januari-Juni tetap konsisten. DPK BMRI dihitung dari giro, tabungan, dan deposito; CASA serta LDR ditandai sebagai hasil hitung. Data kuartal II BBNI, NISP, BBCA, dan konteks rasio BMRI tetap dipertahankan.

Antarmuka halaman Bank Fundamentals menggunakan bahasa Inggris, sedangkan narasi analisis, insight, catatan perusahaan, cakupan data, dan interpretasi tetap menggunakan Bahasa Indonesia.

## Routing dan cache Cloudflare Pages

Aturan `_redirects` khusus tidak diperlukan untuk `/fundamentals`; Cloudflare Pages melayani `fundamentals.html` secara otomatis. HTML memakai kebijakan tanpa cache, aset memakai nama versi unik—terbaru `20260814-bnga-q2-en-ui`—dan `_headers` memaksa validasi ulang agar deployment baru langsung tampil setelah push.
