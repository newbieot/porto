# Changelog

## 2026-08-19 — Daily three-year P/E and P/BV bands

- Added daily three-year P/E and P/BV ratio bands for BBCA, BBNI, BMRI, BNGA and NISP.
- Added a portfolio aggregate using the brokerage share counts and daily market-value-weighted harmonic valuation.
- Added current multiples, three-year averages, ranges, percentiles, and live portfolio weights.
- Added a no-key data generator using daily prices and annual point-in-time fundamentals with a conservative 90-day reporting lag.
- Added a weekday GitHub Actions schedule at 19:15 Jakarta time; changed data is committed to `main` to trigger Cloudflare Pages.
- Converted the full public Overview UI and runtime messages to English while preserving Indonesian analysis inside Bank Fundamentals.
- Cache-busted the production assets to `20260819-valuation-v1` and `20260819-en`.

## 2026-08-18 — BBNI LAR Coverage validation

- Updated BBNI 1H26 LAR Coverage from Undisclosed to **47.4%**.
- Source: NH Korindo Sekuritas Indonesia Update Report dated 13 August 2026; asset-quality source attribution is BBNI + NHKSI Research.
- Classified as **Research-reported**, not Derived.
- BBNI LAR remains 8.1% and gross NPL remains 1.9%.
- LAR Coverage is now available for all five tracked banks.
- Cache-busted assets bumped to `20260818-lar-v3`.

## 2026-08-18 — Asset Quality v2 / Derived LAR Coverage

- Found BNGA 1H26 LAR ≈6.4% including remaining Covid restructuring; ≈5.2% ex-Covid.
- Derived BNGA LAR Coverage ≈42.4% using reviewed June 2026 gross loans and loan CKPN.
- Derived BMRI LAR Coverage ≈40.7%.
- Derived NISP LAR Coverage ≈91.0%.
- Added Reported / Derived / Undisclosed provenance labels.
- BBNI coverage remains Undisclosed pending a matching June 2026 CKPN numerator.
- Cache-busted assets bumped to `20260818-lar-v3`.

## 2026-08-18 — Asset Quality / LAR Coverage

- Preserved the existing live portfolio Overview (Google Sheets, benchmark chart, allocation, stats, realized gains/dividends).
- Added 1H26 Asset Quality comparison for BBCA, BMRI, BBNI, BNGA and NISP.
- Added LAR, LAR Coverage, Gross NPL and NPL Coverage with explicit basis/period.
- Added `Undisclosed` handling for unverified/non-comparable 1H26 data.
- Added source methodology and metric-definition notes.
- Preserved monthly loans and YTD profit series through June/July 2026.
- Added cache-busted asset filenames for the new release.
- Added `DATA_SOURCES.md`.
