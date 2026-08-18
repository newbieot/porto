# Data Sources — Asset Quality 1H26

Updated: 18 August 2026  
Build: `20260818-lar-v3`

## Status rules

- **Reported / Management**: current-period value disclosed by the bank or management.
- **Derived**: current-period value calculated from sufficiently comparable disclosed inputs.
- **Undisclosed**: current-period numerator/denominator cannot be matched with enough confidence.

## Core formula

`LAR Coverage = CKPN / LAR amount`

If nominal LAR is not published:

`LAR amount ≈ Gross Loans × LAR ratio`

If NPL Coverage, NPL and LAR use the same provision pool:

`Derived LAR Coverage ≈ NPL Coverage × Gross NPL ratio / LAR ratio`

Every calculated value is explicitly labelled **Derived** in the UI.

---

## BBCA — PT Bank Central Asia Tbk

Official 1H26 result:
https://www.bca.co.id/en/tentang-bca/media-riset/pressroom/siaran-pers/2026/07/29/07/10/pertama-kali-kredit-tembus-rp1000-triliun-bca-komit-dukung-perekonomian-nasional

2Q26 analyst cross-check:
https://www.indopremier.com/ipotnews/newsDetail.php?group_news=IPOTNEWS&halaman=1&jdl=BBCA___2Q26_results__in_line_but_PPOP_was_soft_due_to_tepid_NII&name=&news_id=228638&q=Company+Update%2C+Banks%2C+BBCA%2C+&search=y_general&taging_subtype=NOTESIPS

Used:
- LAR: 4.9% — Reported
- LAR Coverage: 69.0% — current 2Q26 result cross-check
- Gross NPL: 1.9% — Reported
- NPL Coverage: Undisclosed

NPL Coverage remains Undisclosed because accessible current-period figures were not sufficiently consistent for a single high-confidence number.

---

## BMRI — PT Bank Mandiri (Persero) Tbk

Management asset-quality disclosure:
https://keuangan.kontan.co.id/news/perbankan-optimistis-kualitas-aset-makin-sehat-hingga-akhir-tahun-ini-alasannya

2Q26 analyst cross-check:
https://www.indopremier.com/ipotfund/newsDetail.php?group_news=IPOTNEWS&jdl=BMRI___2Q26_results__beat_from_non_II__2H_NIM_outlook_may_be_pressured&name=&news_id=227505&section=&taging_subtype=NOTESIPS

Bank-only current-period inputs:
- LAR: 5.83%
- Gross NPL: 0.98%
- NPL Coverage: 242.0%

Derived:
`242.0% × 0.98% / 5.83% = 40.68%`

Displayed:
**≈40.7% LAR Coverage (Derived)**

This closely reconciles to the approximately 41% 2Q26 analyst figure.

---

## BBNI — PT Bank Negara Indonesia (Persero) Tbk

Official BNI 1H26 release:
https://bni.co.id/id-id/beranda/kabar-bni/berita/articleid/28411

BNI Investor Relations / Earnings Call 1H26:
https://www.bni.co.id/id-id/investor/kegiatan-presentasi

NH Korindo Sekuritas Indonesia Update Report:
`1H26 | 2Q26: Strong Wholesale Growth Supports Core Profitability Despite Rising NIM Pressure and Funding Costs`
Published: 13 August 2026
Report attribution: `Source: BBNI, NHKSI Research`

Used:
- LAR: 8.1% — Reported / official BNI 1H26
- Gross NPL: 1.9% — Reported / official BNI 1H26
- LAR Coverage: **47.4% — Research-reported by NHKSI from BBNI data**
- NPL Coverage: Undisclosed in this build

Why 47.4% is accepted:
1. The NHKSI report explicitly states that LAR improved to 8.1% and LAR Coverage improved to 47.4% in 1H26.
2. Its asset-quality exhibit is labelled `Source: BBNI, NHKSI Research`.
3. NHKSI's 1Q26 BBNI report previously reported LAR Coverage of 45.9%, making the 2Q26 movement to 47.4% internally consistent.
4. BNI's official 1H26 release independently confirms the same 8.1% LAR period.

UI status:
**Research-reported**, not Derived.

---

## BNGA
---

## BNGA — PT Bank CIMB Niaga Tbk

### 1H26 LAR management disclosure

Source quoting President Director & CEO Lani Darmawan:
https://keuangan.kontan.co.id/news/perbankan-optimistis-kualitas-aset-makin-sehat-hingga-akhir-tahun-ini-alasannya

Management disclosure:
- LAR ≈ 6.4% including remaining Covid-19 restructuring
- LAR ≈ 5.2% excluding the remaining Covid restructuring portfolio

The website uses **6.4%** as the broader and more conservative headline LAR.

### Reviewed 30 June 2026 consolidated financial statements

Source:
https://emitten-announcement.stockbit.com/attachments/BNGA_-_Jun26.pdf

Reviewed statement figures:
- Gross loans: Rp237.321886 trillion
- Allowance for impairment losses / CKPN on conventional + Sharia loans: Rp6.435143 trillion
- Gross NPL: 1.83%

### Derived LAR Coverage

Nominal broad LAR:
`Rp237.321886 T × 6.4% = Rp15.188601 T`

Derived LAR Coverage:
`Rp6.435143 T / Rp15.188601 T = 42.368%`

Displayed:
**≈42.4% LAR Coverage (Derived)**

Confidence note:
The 6.4% management LAR is rounded to one decimal place, while gross loans and CKPN come from the reviewed consolidated statements. Therefore the coverage result is an approximation and is not presented as a ratio explicitly reported by CIMB Niaga.

BNGA NPL Coverage remains Undisclosed because the reviewed statements state that consolidated NPL ratios include consumer-finance receivables, while the extracted CKPN numerator above is loan-only. Those scopes are not forced together.

---

## NISP — PT Bank OCBC NISP Tbk / OCBC Indonesia

Official 1H26 result:
https://www.ocbc.id/en/tentang-ocbc/informasi/siaran-pers/2026/07/30/kinerja-ocbc-s1-2026

Reported:
- Gross loans: Rp185.3 trillion
- Gross NPL: 1.9%
- LAR: 4.8%
- NPL provision coverage: 230.0%

Assuming the same provision pool:

`230.0% × 1.9% / 4.8% = 91.04%`

Displayed:
**≈91.0% LAR Coverage (Derived)**

Because the source ratios are rounded, the result is shown as an approximate derived value.

---

## Conservative disclosure rule

A calculated metric is included only when:
1. all inputs refer to 1H26 / 30 June 2026;
2. the numerator/denominator relationship is defensible;
3. the result is visibly labelled **Derived**; and
4. any scope or rounding limitation is stated.

Otherwise the website displays **Undisclosed**.
