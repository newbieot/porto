# Private personal finance dashboard

The canonical URL is `https://idx.posnew.com/finance`; anonymous visitors are
redirected to `/finance-login`. Dark mode is the initial preference. Only the
theme preference is stored in browser local storage.

## Access and deployment

Cloudflare Pages `_worker.js` proxies `/api/finance/*` to the separate
`porto-finance-api` Worker and verifies the session before serving the dashboard
HTML. The backend validates Email/Password identity through the existing
TemplateMile Firebase authority (project `mile-posnew-com`). Both the login
response and every session require the sole allowed email `ikhsan@posnew.com`.
The fixed server gateway is `https://mile.posnew.com/api/auth/login`.

Sessions are HMAC signed, expire after 12 hours, and use a Secure, HttpOnly,
SameSite=Strict host-only cookie. Login and logout enforce the canonical site
Origin. Private responses are `no-store`; no private API supports public CORS.
There are no Firebase credentials or financial exports in this repository.
The TemplateMile gateway must remain available for new logins.

The private snapshot is injected as a server module when deploying the Worker.
It is not an asset URL. `.finance/` stores source positions, reconciled snapshots
and the session secret locally and is ignored by Git. Do not force-add these
files or deploy the local preview server. The public repository contains only
UI, generic import code, metric definitions and synthetic test fixtures.

## Monthly import

Obtain an export of **all periods** from Money Lover, plus an updated position
snapshot if debt, receivables or BTC quantity changed. Update stock holdings in
the existing portfolio source when necessary. Keep the original CSV outside
the repository. The ignored position file has this shape:

```json
{
  "asOf": "YYYY-MM-DD",
  "btcQuantity": 0,
  "payables": [{"name":"…", "amount":0, "originalAmount":null}],
  "receivables": [{"name":"…", "amount":0, "originalAmount":null}]
}
```

Run with the available Node runtime:

```powershell
node scripts/import-finance.mjs --csv "C:/path/to/full-history.csv" --position ".finance/position.json"
node --test scripts/test-finance.mjs
node scripts/import-finance.mjs --csv "C:/path/to/full-history.csv" --position ".finance/position.json" --deploy
```

The deploy step uses the existing Cloudflare Wrangler OAuth login from its
standard local configuration; it does not print credentials. Refresh that login
with `wrangler login` if it expires. The Worker name and account are fixed in the
import script. Import replaces the snapshot from the full export rather than
appending it: IDs are only trusted for uniqueness within an individual export.
Exports that truncate the previously available date coverage are rejected.
Repeated content with distinct IDs is retained for review, not silently deleted.
The same session secret is retained between monthly deployments.

For UI changes, bump the asset directory version before changing files already
published with the immutable asset cache rule, run tests, then commit and push
to the existing Pages-connected branch. A data-only monthly import requires
only the private Worker deployment, not a commit containing financial data.

## Metric rules

- Wallet balances include every signed transaction through the export cutoff,
  regardless of report flags. The dashboard reconciles these to current positions.
- Income and expense use `Exclude Report=False`. Internal transfers, opening
  balances, withdrawals and debt/loan principal movements are separate.
  Adjust-balance entries are included by default to follow Money Lover and can
  be removed from the report with a visible filter.
- Saving rate is `(income − expense) / income`. Zero-income ratios and
  percentage growth with zero or negative bases are unavailable, not infinity.
- YoY comparisons shift the entire selected range by one and two years.
  Leap-day cutoffs clamp to February's last day. Partial months use matching
  days for MoM; uncovered comparison periods stay null.
- Net worth is assets plus outstanding receivables minus outstanding payables.
  Recorded capital and market value are separate choices. Stocks use the
  existing portfolio price snapshot. BTC uses confirmed quantity times the
  latest available CoinGecko IDR price. A missing market price never silently
  becomes the cost balance.
- Historical balances are reconstructed book asset balances, not historical
  market net worth: historical debt and investment quantities are not assumed.
- The scenario uses the last three complete months, an editable expense cut
  and horizon, with fixed investment prices/debt balances. It is a cash-flow
  sensitivity calculation, not a return or income forecast. The narrower income
  option is a category proxy (salary, interest, rent), not a guarantee of recurrence.
- Cash coverage excludes deposits and investment assets. The editable reserve
  target is informed by the [OJK household planning guide](https://sikapiuangmu.ojk.go.id/FrontEnd/images/FileDownload/17_Combined%20Buku%20Perencanaan%20IRT.pdf).
  Debt rates and due dates are unavailable, so the dashboard does not invent a
  repayment priority or repayment timeline.

Transactions are searchable, paginated and inspectable. CSV exports respect
the visible period/account/search filters and escape spreadsheet formula text.
