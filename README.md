# IDX Portfolio Monitor

Static Cloudflare Pages website for `idx.posnew.com`.

## Pages

- `/` — live portfolio overview connected to the existing published Google Sheets CSV.
- `/fundamentals` — January–May 2025/2026 bank-fundamental comparison.

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

The portfolio overview preserves the Google Sheets CSV URL from the original project. The fundamentals page preserves the original embedded monthly values and monitoring notes.

## Cloudflare Pages routing

No custom `_redirects` rule is required for `/fundamentals`. Cloudflare Pages automatically serves `fundamentals.html` at the extensionless `/fundamentals` route.
