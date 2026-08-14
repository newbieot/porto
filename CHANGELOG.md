# Changelog

## 2026-08-14 — English UI dengan analisis Bahasa Indonesia

- Mengubah navigasi, tombol, label KPI, status pembaruan, tab, filter, grafik, tabel, rating, dan footer halaman Bank Fundamentals ke bahasa Inggris.
- Mempertahankan seluruh narasi analisis, insight investasi, catatan perusahaan, metodologi, dan penjelasan cakupan dalam Bahasa Indonesia.
- Menambahkan versi aset unik `20260814-bnga-q2-en-ui` agar pembaruan langsung terambil setelah deployment Cloudflare Pages.
- Mengemas pembaruan dengan nama ZIP yang secara eksplisit menyebut BNGA Q2 2026.

## 2026-08-14 — Pembaruan BNGA Q2 2026

- Menambahkan kredit konvensional dan laba bersih bank individual BNGA Juni 2026 serta Juni 2025 ke grafik dan matriks bulanan.
- Menambahkan sorotan konsolidasian BNGA semester I 2026 yang telah direviu, mencakup laba, kredit termasuk syariah, pendapatan bunga dan syariah bersih, DPK, CASA hasil hitung, NPL, CAR, aset, serta laba komprehensif.
- Menambahkan analisis berimbang mengenai perbaikan bauran dana dan kualitas aset di tengah tekanan pendapatan inti, kenaikan beban penurunan nilai, dan rugi penghasilan komprehensif lain.
- Membuat agregat lima bank lengkap sampai Juni 2026 dan memperbarui catatan cakupan, catatan perusahaan, SEO, README, serta pengungkapan basis data.
- Mengganti nama aset versi untuk CSS dan JavaScript agar deployment Cloudflare Pages tidak tertahan cache lama.

## 2026-08-14 — Pembaruan BMRI Juli 2026 dan Bahasa Indonesia

- Menambahkan kredit dan laba bersih BMRI Juli 2026 serta Juli 2025 ke grafik dan matriks sumber.
- Menambahkan sorotan laporan bulanan BMRI yang membandingkan laba, kredit, pendapatan bunga bersih, DPK, aset, ekuitas, deposito, LDR hasil hitung, dan laba komprehensif secara YoY.
- Menambahkan analisis berimbang mengenai pertumbuhan kuat, penurunan bauran CASA, kenaikan intensitas neraca, dan rugi nilai wajar FVOCI.
- Mengubah seluruh antarmuka utama, halaman fundamental, pesan aplikasi, metadata, manifest, halaman 404, dan gambar berbagi ke Bahasa Indonesia.
- Menjadikan BMRI sebagai fokus grafik bawaan dan memperpanjang matriks sampai Juli.
- Menambahkan nama aset versi unik serta kebijakan cache HTML tanpa penyimpanan agar versi terbaru segera tampil di Cloudflare Pages.

## 2026-08-05 — BBNI June and Q2 2026 update

- Added BBNI June 2026 and June 2025 individual credit and cumulative net-profit figures to the charts and source matrix.
- Added a reviewed BBNI Q2 spotlight covering profit, credit, net interest income, deposits, derived CASA, ROA, ROE, NIM, BOPO, CIR, NPL, LDR, and KPMM.
- Added a balanced BBNI insight highlighting exceptional balance-sheet growth alongside a weaker deposit mix, margin pressure, higher impairment expense, lower capital adequacy, and the FVOCI valuation loss.
- Made BBNI the default chart focus and updated the hero, summary cards, coverage notes, company notes, disclosure, SEO, README, sitemap, and cache-busting asset versions.
- June data is now available for BBNI, NISP, BBCA, and BMRI; BNGA remains pending.
- Uses the 45.18% prior-period CIR comparator shown in the 2026 publication; the standalone 2Q 2025 report displayed 45.47%.

## 2026-07-31 — NISP June and Q2 2026 update

- Added NISP June 2026 and June 2025 gross-loan and cumulative net-profit figures to the charts and source matrix.
- Added an NISP Q2 spotlight using the supplied unaudited consolidated financial statements, covering profit, loans, net interest and sharia income, deposits, CASA mix, NPL, RIM, CAR, and derived cost-to-income.
- Added a balanced NISP insight highlighting improved funding mix and operating leverage alongside higher provision expense, slightly higher net NPL, lower capital ratio, and the FVOCI valuation loss.
- Made NISP the default chart focus and updated the hero, summary cards, coverage notes, company notes, disclosure, SEO, README, sitemap, and cache-busting asset versions.
- June data is now available for NISP, BBCA, and BMRI; BBNI and BNGA remain pending.

## 2026-07-28 — BBCA June and Q2 2026 update

- Added BBCA June 2026 and June 2025 individual credit and cumulative net-profit figures to the charts and source matrix.
- Added a BBCA Q2 spotlight covering profit, credit, ROE, NPL, NIM, BOPO, CIR, LDR, and KPMM.
- Added a balanced BBCA investment insight highlighting resilient loan growth and asset-quality improvement alongside softer margins, returns, and earnings conversion.
- Updated the default chart focus, coverage notes, company note, SEO copy, disclosure, README, sitemap, and cache-busting asset versions.
- June data is now available for BBCA and BMRI; BBNI, BNGA, and NISP remain pending.

## 2026-07-25 — BMRI audited YoY comparison update

- Added BMRI June 2025 audited loan balance to the monthly chart and source matrix.
- Replaced the June credit comparison from +6.3% YTD to +19.9% YoY.
- Updated the BMRI insight to reflect strong loan, profit, and efficiency growth alongside higher balance-sheet intensity.
- Added the 6.1% YoY equity-growth context to explain the higher LDR and lower KPMM.
- Updated coverage notes, SEO copy, data disclosure, README, and cache-busting asset versions.

## 2026-07-25 — BMRI June and Q2 2026 update

- Added BMRI June 2026 credit and cumulative net-profit figures.
- Added a reviewed Q2 spotlight covering profit growth, credit growth, ROA, ROE, NIM, BOPO, CIR, NPL, LDR, and KPMM.
- Updated the BMRI company note and overall insight with a balanced read on earnings quality, efficiency, asset quality, margin pressure, liquidity, and capital.
- Extended the monthly matrix to June while clearly marking other banks' June reports as pending.
- Made BMRI the default chart focus so the newest result is visible immediately.
- Added cache-busting versions for the updated fundamentals CSS and JavaScript.

## 2026-07-25 — Routing hotfix

- Removed the custom `/fundamentals` proxy rule that conflicted with Cloudflare Pages clean URLs and caused a redirect loop.
- `/fundamentals` is now served directly from `fundamentals.html` by Cloudflare Pages.


## 2026-07-25

- Rebuilt the site as a cohesive portfolio-monitoring workspace.
- Added responsive navigation and dark/light themes.
- Added live sync status, retry handling, timeout handling, and robust quoted-CSV parsing.
- Added 1M, 3M, and YTD chart views.
- Added benchmark spread and dataset-period summary metrics.
- Improved mobile tables, allocation presentation, event history, and accessibility.
- Rebuilt bank fundamentals with accessible tabs, bank filters, calculated summary metrics, charts, matrix, and company notes.
- Added favicon, web manifest, sitemap, robots, custom 404, redirects, and security headers.
