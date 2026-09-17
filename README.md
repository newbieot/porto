# IDX Monitor / porto

Static website for the portfolio overview and bank fundamentals workspace.

## 2026-09-17 update

BBCA and BBNI monthly charts, matrix, and bank spotlights now include August
2026 versus August 2025. The insights separate YTD performance from the
August-only movement, document derived CASA and LDR, and avoid inferring
undisclosed August NIM, NPL, or LAR. BBCA, BMRI, and BBNI now run through
August; BNGA and NISP remain through July. The active fundamentals asset is
`fundamentals.20260917-bbca-bbni-aug-v1.js`.

## 2026-09-13 update

BMRI monthly charts and matrix now include August 2026 versus August 2025.
Other banks retain July data with explicit unavailable August cells. The BMRI
spotlight distinguishes YTD and August-only profit, explains funding mix and
expense movements, and labels the limits of the monthly disclosures.
The active fundamentals asset was `fundamentals.20260913-bmri-aug-v1.js`.

## 2026-09-07 update

Recorded upcoming cash dividends in the Overview cash events and Bank Fundamentals:
- **BBCA**: Rp25 per share, payment date 16 September 2026 (Rp472,500 for 189 lots / 18,900 shares, +0.06% portfolio return impact).
- **BMRI**: Rp66 per share, payment date 02 October 2026 (Rp2,587,200 for 392 lots / 39,200 shares, +0.32% portfolio return impact).
- Combined upcoming dividend payout: Rp3,059,700 (+0.38% return, bringing total dividends to +7.60% and combined gains to +18.12%).

## 2026-08-26 update

BBNI's bank-individual monthly series now runs through July 2026, with the July 2025 report used for the like-for-like YoY comparison. The Bank Fundamentals page includes the updated loans and YTD net-profit charts, monthly matrix, and a July BBNI spotlight covering loans, profit, net interest income, customer deposits, derived CASA, and derived LDR.

BNGA's comparable bank-individual series now also runs through July 2026. Its spotlight separates conventional loans from Sharia financing and highlights the YoY movements in profit, NII, deposits, CASA, and impairment expense.

## 2026-08-19 update

The public Overview UI is fully English. Bank Fundamentals keeps its controls, labels, and navigation in English while retaining Indonesian analytical explanations.

Bank Fundamentals now includes daily three-year valuation history for BBCA, BBNI, BMRI, BNGA, NISP, and a portfolio aggregate:

- P/E Ratio Band with three-year mean and ±1/±2 standard-deviation levels
- P/BV Band with the same band structure
- Current ratio, historical mean, range, and percentile
- Current portfolio weights based on the brokerage position sizes
- Market-value-weighted harmonic portfolio P/E and P/BV

`scripts/update-valuation-data.mjs` refreshes `data/valuation-bands.json`. The GitHub Actions workflow runs at 19:15 Jakarta time on trading weekdays and commits changed data to `main`, which triggers Cloudflare Pages.

The historical ratios use the latest full-year earnings and year-end equity available on each date, with a conservative 90-day reporting lag. They are annual-basis point-in-time ratios, not TTM ratios.

## 2026-08-18 asset-quality update

This snapshot preserves the existing live Google Sheets portfolio Overview and adds a 1H26 Asset Quality comparison for:
- BBCA
- BMRI
- BBNI
- BNGA
- NISP

Metrics:
- Loan at Risk (LAR)
- LAR Coverage
- Gross NPL
- NPL Coverage

The site uses a conservative data policy. If a 30 June 2026 figure cannot be verified with enough confidence, the UI shows **Undisclosed** instead of carrying forward an older quarter or substituting a different coverage definition.

## Deploy

This repository is fully static and can be deployed directly with Cloudflare Pages.
No build command is required.

The HTML references versioned CSS/JS files (including `20260826-bbni-bnga-jul-v2`) so browsers/CDNs do not reuse the previous asset URL.

## Local replacement

See `INSTALL.md`. Keep the hidden `.git` directory when replacing the repository contents.


## Asset-quality v2 methodology

Build `20260818-lar-v3` distinguishes **Reported**, **Derived**, and **Undisclosed**.

Current-period derived LAR Coverage added:
- BMRI ≈ 40.7%
- BNGA ≈ 42.4%
- NISP ≈ 91.0%

BNGA 1H26 LAR is ≈6.4% including remaining Covid restructuring (≈5.2% ex-Covid).

See `DATA_SOURCES.md` for formulas, basis, and confidence notes.

## BBNI 1H26 coverage update

BBNI LAR Coverage is now **47.4%**, classified as **Research-reported** from the NH Korindo Sekuritas Indonesia 13 August 2026 report (source attribution: BBNI, NHKSI Research).
