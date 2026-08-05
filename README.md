# IDX Portfolio Monitor

Static Cloudflare Pages website for `idx.posnew.com`.

## Pages

- `/` — live portfolio overview connected to the existing published Google Sheets CSV.
- `/fundamentals` — five-bank monthly comparison through May, plus BBNI, NISP, BBCA, and BMRI June monthly and Q2 2026 performance with June 2025 year-over-year comparatives.

## Deployment

No build command is required. Upload the repository to GitHub and connect the root directory to Cloudflare Pages.

## Project structure

- `index.html`
- `fundamentals.html`
- `assets/styles.css`
- `assets/app.js`
- `assets/fundamentals.js`
- Cloudflare Pages files: `_headers`, `_redirects`, `404.html`

## Data notes

The portfolio overview preserves the Google Sheets CSV URL from the original project. The fundamentals page preserves the original embedded monthly values and adds BBNI, NISP, BBCA, and BMRI June 2026 figures and Q2 2026 analysis, while clearly marking June data for BNGA as pending. BBNI uses the reviewed 1H 2026 individual-bank publication and the supplied unaudited 2Q 2025 report; NISP uses supplied unaudited consolidated statements; BBCA uses its unaudited bank-only publication; BMRI uses reviewed bank-only publications. BBNI and NISP CASA figures are derived from reported deposit lines and explicitly labelled. For BBNI CIR, the dashboard uses the 45.18% comparative shown in the 2026 publication rather than the 45.47% figure in the original standalone 2Q 2025 report.

## Cloudflare Pages routing

No custom `_redirects` rule is required for `/fundamentals`. Cloudflare Pages automatically serves `fundamentals.html` at the extensionless `/fundamentals` route.
