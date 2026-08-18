# IDX Monitor / porto

Static website for the portfolio overview and bank fundamentals workspace.

## 2026-08-18 update

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

The HTML references versioned CSS/JS files (`20260818-lar-v3`) so browsers/CDNs do not reuse the previous asset URL.

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
