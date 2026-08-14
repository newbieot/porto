# Monitor Portofolio IDX

Situs statis Cloudflare Pages untuk `idx.posnew.com`.

## Halaman

- `/` — ringkasan portofolio langsung yang terhubung ke CSV Google Sheets terpublikasi.
- `/fundamentals` — perbandingan bulanan lima bank; BMRI tersedia sampai Juli 2026 dengan pembanding Juli 2025, BBNI/NISP/BBCA sampai Juni, dan BNGA sampai Mei.

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

Ringkasan portofolio mempertahankan URL CSV Google Sheets dari proyek awal. Halaman fundamental menambahkan angka kredit dan laba bersih BMRI Juli 2026 serta Juli 2025, berikut analisis laporan bulanan. DPK BMRI dihitung dari giro, tabungan, dan deposito; CASA serta LDR ditandai sebagai hasil hitung. Data kuartal II sebelumnya tetap dipertahankan untuk BBNI, NISP, BBCA, dan konteks rasio BMRI.

## Routing dan cache Cloudflare Pages

Aturan `_redirects` khusus tidak diperlukan untuk `/fundamentals`; Cloudflare Pages melayani `fundamentals.html` secara otomatis. HTML memakai kebijakan tanpa cache, aset memakai nama versi unik, dan `_headers` memaksa validasi ulang agar deployment baru langsung tampil setelah push.
