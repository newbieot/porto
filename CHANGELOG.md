# Changelog
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
