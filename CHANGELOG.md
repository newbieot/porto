# Changelog

## 2026-09-17 — BBCA & BBNI August monthly results

- Added August 2025/2026 BBCA and BBNI loans and YTD net profit to the charts
  and monthly matrix; BBCA is selected by default to surface the latest update.
- Updated BBCA KPIs: profit Rp40.17 T (+2.9% YoY), loans Rp1,017.71 T
  (+10.5%), NII Rp53.82 T (+1.3%), and deposits Rp1,256.83 T (+8.3%).
- Updated BBNI KPIs: profit Rp14.33 T (+6.9% YoY), loans Rp977.17 T
  (+27.1%), NII Rp28.88 T (+14.3%), and deposits Rp1,124.72 T (+29.4%).
- Rewrote both insights to distinguish August-only profit from YTD growth,
  explain the funding mix, and separate impairment expense from loan CKPN.
- Removed unsupported NIM, integration-cost, segment-driver, valuation, and
  recommendation claims that cannot be established from the monthly reports.
- Versioned the active JavaScript as `20260917-bbca-bbni-aug-v1`.

## 2026-09-13 — BMRI August monthly results

- Added August 2025/2026 BMRI loans and YTD net profit; extended charts and
  matrix to August with unavailable values for the other banks.
- Updated BMRI KPIs: profit Rp37.49 T (+22.3% YoY), loans Rp1,592.20 T
  (+17.6%), NII Rp54.84 T (+7.2%), deposits Rp1,687.22 T (+17.6%).
- Rewrote BMRI insights using documented fee, expense, funding and impairment
  movements; distinguished August-only profit (+10.0%) from YTD growth.
- Removed unsupported BMRI repricing, prudential-limit, peer ranking and
  valuation assertions; kept June quality metrics explicitly dated.
- Versioned the active JavaScript as `20260913-bmri-aug-v1`.
- Allowed chart grid containers to shrink correctly on mobile.

## 2026-09-07 — BBCA & BMRI dividend schedule update

- Added upcoming cash dividend distribution events to the Overview cash events:
  - **BBCA**: Rp25 per share, payment date 16 September 2026 (Rp472,500 gross payout for 189 lots / 18,900 shares, +0.06% portfolio return impact; reconciles to "Open: 472,500" corporate action receivable in broker portfolio).
  - **BMRI**: Rp66 per share, payment date 02 October 2026 (Rp2,587,200 gross payout for 392 lots / 39,200 shares, +0.32% portfolio return impact).
- Updated cumulative dividend return to +7.60% and combined gains to +18.12% projected.
- Added corporate action dividend notes to BBCA and BMRI spotlights in `fundamentals.html`.
- Documented position reconciliation and payment schedules in `DATA_SOURCES.md`.

## 2026-09-01 — Fundamentals page overhaul with deep insights & recommendations

- Redesigned the Bank Fundamentals page with better section spacing, visual hierarchy, and section dividers.
- Added deep per-bank insights for all five emitens: analysis of loan growth quality, profitability trajectory, funding structure (CASA/LDR), and key risks to watch.
- Added investment recommendations (Accumulate/Hold/Trim) with fundamental rationale for each bank:
  - **BBCA**: Hold — defensive quality, but NIM compression limits earnings growth.
  - **BMRI**: Hold — strongest profit growth (+24.2%), but LDR near prudential limit.
  - **BBNI**: Accumulate — valuation discount, strong loan growth post-Hibank, improving asset quality coverage.
  - **BNGA**: Hold — wait for impairment normalization; healthy CASA and LDR as building blocks.
  - **NISP**: Hold — best asset quality, but structural CASA weakness below 60%.
- Collapsed asset-quality methodology footnotes behind a toggle to reduce visual clutter.
- Added investment disclaimer section at the bottom.
- Updated third summary metric card from "LAR coverage" to "Monthly data: Jul 2026".
- Cache-busted CSS to `20260901-insights-v1` and JS to `20260901-insights-v1`.

## 2026-08-31 — NISP July 2026 monthly update

- Added NISP July 2025 and July 2026 bank-individual loans and YTD net profit to the monthly charts and matrix.
- Updated the NISP spotlight to 31 July 2026: loans Rp183.26 T (+16.4% YoY), Jan–Jul net profit Rp3.22 T (+6.8%), net interest income Rp6.83 T (+7.4%), and customer deposits Rp243.98 T (+11.7%).
- Added derived CASA of 58.0% and LDR of 75.11%; showed Sharia financing separately at Rp5.40 T and impairment expense at Rp0.51 T.
- All five tracked banks now have complete July 2026 monthly data.
- Cache-busted the Bank Fundamentals JavaScript to `20260831-nisp-jul-v1`.

## 2026-08-26 — BNGA July 2026 monthly update

- Added BNGA July 2025 and July 2026 bank-individual loans and YTD net profit to the monthly charts and matrix.
- Updated the BNGA spotlight to 31 July 2026: loans Rp179.19 T (+15.4% YoY), Jan–Jul net profit Rp3.45 T (-9.1%), net interest income Rp6.94 T (-0.1%), and customer deposits Rp258.59 T (+1.1%).
- Added derived CASA of 73.2% and LDR of 69.29%, while showing Sharia financing separately at Rp51.47 T and impairment expense at Rp1.06 T.
- Cache-busted the Bank Fundamentals JavaScript to `20260826-bbni-bnga-jul-v2`.

## 2026-08-26 — BBNI July 2026 monthly update

- Added BBNI July 2025 and July 2026 bank-individual loans and YTD net profit to the monthly charts and matrix.
- Updated the BBNI spotlight to 31 July 2026: loans Rp969.94 T (+27.0% YoY), Jan–Jul net profit Rp12.53 T (+5.5%), net interest income Rp25.32 T (+14.1%), and customer deposits Rp1,134.89 T (+28.9%).
- Added derived July 2026 CASA of 66.4% and LDR of 85.47%; kept the separate 1H26 asset-quality basis unchanged.
- Cache-busted the Bank Fundamentals JavaScript to `20260826-bbni-jul-v1`.

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
