# Monitor Portofolio IDX

Situs statis Cloudflare Pages untuk `idx.posnew.com`.

## Halaman

- `/` — ringkasan portofolio langsung yang terhubung ke CSV Google Sheets terpublikasi.
- `/fundamentals` — perbandingan bulanan lima bank; BBCA dan BMRI tersedia sampai Juli 2026 dengan pembanding Juli 2025, sedangkan BNGA/BBNI/NISP lengkap sampai Juni.

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

Ringkasan portofolio mempertahankan URL CSV Google Sheets dari proyek awal. Halaman fundamental memuat BBCA dan BMRI sampai Juli 2026 serta tambahan BNGA Q2 2026 versus Juni 2025. Sorotan BBCA Juli memakai laporan bank individual; DPK dihitung dari giro, tabungan, dan deposito, sedangkan CASA serta LDR ditandai sebagai hasil hitung. Sorotan BNGA memakai angka konsolidasian; seri bulanannya memakai laba bank individual dan kredit konvensional bank individual hasil hitung agar basis Januari-Juni tetap konsisten. Data kuartal II BBNI, NISP, BBCA, dan konteks rasio BMRI tetap dipertahankan.

Antarmuka halaman Bank Fundamentals menggunakan bahasa Inggris, sedangkan narasi analisis, insight, catatan perusahaan, cakupan data, dan interpretasi tetap menggunakan Bahasa Indonesia.

## Routing dan cache Cloudflare Pages

Aturan `_redirects` khusus tidak diperlukan untuk `/fundamentals`; Cloudflare Pages melayani `fundamentals.html` secara otomatis. HTML memakai kebijakan tanpa cache, JavaScript fundamental memakai nama versi unik—terbaru `20260818-bbca-july`—dan `_headers` memaksa validasi ulang agar deployment baru langsung tampil setelah push.
