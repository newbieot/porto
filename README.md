# IDX Portfolio Monitor

Static Cloudflare Pages website for `idx.posnew.com`.

## Pages

- `/` — live portfolio overview connected to the existing published Google Sheets CSV.
- `/fundamentals` — five-bank monthly comparison through May, plus BBCA and BMRI June monthly and Q2 2026 performance with June 2025 year-over-year comparatives.

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

The portfolio overview preserves the Google Sheets CSV URL from the original project. The fundamentals page preserves the original embedded monthly values, adds BBCA and BMRI June 2026 monthly figures and Q2 2026 ratios, while clearly marking June data for BBNI, BNGA, and NISP as pending. BBCA uses its unaudited June publication and BMRI uses reviewed publications; both quarterly snapshots use individual bank figures for consistency with the monthly series.

## Cloudflare Pages routing

No custom `_redirects` rule is required for `/fundamentals`. Cloudflare Pages automatically serves `fundamentals.html` at the extensionless `/fundamentals` route.
