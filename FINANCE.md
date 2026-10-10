# Private finance dashboard

The canonical URL is https://idx.posnew.com/finance. The dashboard uses dark mode by default, an optional light theme, and a responsive layout. Only the owner account is allowed through the existing TemplateMile Firebase gateway. Server-side session validation protects both HTML and every private API. Sessions remain Secure, HttpOnly, SameSite=Strict and signed; private responses are no-store.

## Data and monthly updates

Finance v2 uses a SQLite Durable Object (`FINANCE_DB`, class `FinanceStore`). Source CSV archives, normalized transactions, settings versions, snapshots and audit history are private. Initialization seeds a new database only; redeploying does not overwrite an existing ledger.

Use Settings & import with a full-history Money Lover CSV. Preview before commit. Sequential export row IDs are not permanent transaction identifiers. Fingerprints include occurrence counts; importing the same file is a no-op. Report-only replacement can preserve previously excluded support rows. Truncated history and conflicting incremental corrections are rejected. Import commits require the preview token and current revision. Prior imports and settings can be restored without deleting their archives. Download a private backup before major changes.

Keep all private source data, bootstrap modules, session secrets, local databases and development handoffs outside public Git. `.finance/` is ignored. Never deploy the local preview server or publish the repository working directory as a raw upload.

## Reports

Income, expense and net income use accounting classifications. Cash flow uses movements in configured cash accounts. Internal transfers, debt principal, investments, prepaid payments and noncash accruals remain distinct. Net Liquidity includes configured liquid accounts less financial obligations and custody funds; investments, prepaid rent and deferred rental income are excluded. Net worth offers cost and market bases; missing market prices remain unavailable.

Weekly, monthly, quarterly and yearly line charts, monthly grouped/stacked bars, date/account filters, matching prior-year comparisons, transaction drill-down, budgets, challenge tiers and a retirement roadmap are available. Projections use editable assumptions and effective monthly compounding. They are scenarios, not predictions. Historical net worth requires actual dated snapshots. Final month-end closure requires reconciliation and ledger coverage; incomplete data remains provisional.

## Local verification

Requires Node 24 (built-in SQLite). No npm install or frontend compilation is needed.

```powershell
node --test scripts/test-finance.mjs scripts/finance-core.test.mjs
node --check assets/finance/20261010/app.mjs
node scripts/preview-finance.mjs
```

Preview listens only on 127.0.0.1:8765. Open the private entry URL saved in `.finance/preview-url`; do not share that key. The preview uses a separate local database and local access session, not a production Firebase login test. Private bootstrap must already exist locally.

## Release

```powershell
node scripts/package-finance.mjs
wrangler deploy --dry-run --config .finance/worker-package/wrangler.json
wrangler deploy --config .finance/worker-package/wrangler.json --keep-vars
```

Publishing requires owner approval. Preserve the existing `FINANCE_SESSION_SECRET`. Deploy the backend and verify authenticated state before publishing the frontend. Cloudflare Pages deploys pushes to the connected main branch; `_worker.js` uses the internal `FINANCE_API` service binding. The old importer `--deploy` path is intentionally disabled. The generated package and bootstrap remain ignored and must never be committed.

After release, verify owner access, anonymous rejection, state initialization and static asset version. Assets dated 20261010 must be version-bumped for later changes after publication because the site uses immutable asset caching.
