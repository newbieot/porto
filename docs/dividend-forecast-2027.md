# Dividend forecast 2027

Page: `/dividends` (`dividends.html`). Menu links exist on Overview, Fundamentals and the private Finance shell. This is an extension of the existing static portfolio site; it uses the existing design tokens and vendored Chart.js, with no new application dependency or authentication change.

## Data and calculation

- Reviewed inputs and official references: `data/dividend-forecast-2027.json`.
- Positions verified 9 October 2026; market prices are the stored 12 November snapshot, not live. Main portfolio only; excludes the child's 11 BMRI lots.
- EPS is cumulative January–September 2026. BNGA uses bank-only EPS to match its payout basis; other banks use EPS attributable to owners.
- FY2026 EPS = 9M EPS + (9M EPS / 3 × Q4 factor). Annual DPS = estimated EPS × assumed payout. Preset payout ratios are assumptions, not a FY2026 declaration.
- Remaining FY2026 DPS subtracts BBCA Rp45 and BMRI Rp66 issuer interim DPS, plus optional additional interim paid in2026. Apply the same remaining DPS to current shares, including all399BMRI lots. Do not subtract only the owner's historical cash: seven newly purchased lots did not earn the historic interim.
- Calendar2027 cash adds optional FY2027 interim paid in2027. Unannounced interim inputs default0 (excluded, not a prediction of no payment). Annual FY2026 total and calendar2027 receipts remain separate.
- Yields are weighted total cash / total capital or market value. Broker headline capital differs from sum of position rows by Rp1 rounding.
- Base annual FY2026 gross Rp64,100,549.92; remaining FY2026 potentially payable2027 Rp60,616,649.92 (7.5206% on cost,9.0827% on dated market value). Conservative Rp51,592,018.89; optimistic Rp66,998,855. These sensitivity cases are not probability intervals.
- Optional10% tax is a simulation; exemption may apply subject to reinvestment/reporting conditions. Default output is gross.
- All simulation state stays in browser memory. No CSV MoneyLover, dividend ledger, cash, net liquidity, or private authentication data is changed. BMRI actual-dividend reconciliation remains pending the owner's corrected CSV.

## UI behavior

Scenario selection resets payout/Q4 to that preset and preserves interim assumptions. The reset button clears all financial assumptions to base (display yield basis and tax preference remain). Both charts, table/mobile cards and CSV export use the same active inputs. Scenario comparison always shows the three presets with the current interim assumptions; custom payout/Q4 affect the active estimate only. Invalid entries block export. Interim exceeding modeled annual DPS is clamped at zero remaining, with a warning preserved in CSV.

## Verification

`node --check assets/dividends.20261115.mjs`

`node --test scripts/dividend-forecast.test.mjs scripts/portfolio.test.mjs scripts/banks-q3.test.mjs scripts/bmri-fundamentals.test.mjs`

21 tests passed. Browser checks cover the base/conservative results, market yield,10% simulation, extra2026interim reducing2027 receipts, FY2027interim adding receipts, invalid payout blocking export and reset. Responsive and theme visual review performed; exact final deployment recorded in release response.

Static site has no build step. Push to `origin/main` triggers the existing Cloudflare Pages integration. Production: `https://idx.posnew.com/dividends`.

## Next refresh

Update reviewed inputs after FY2026 reports or an interim/AGM announcement; preserve source URLs, period/basis and current position dates. Recalculate and update tests for deliberate input changes. Version changed CSS/JS URLs because `/assets/*` is cached immutably. No estimated dividend should become an actual finance transaction automatically.
