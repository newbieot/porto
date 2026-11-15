import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { calculateForecast, calculateScenarios } from '../assets/dividend-forecast-engine.mjs';

const snapshot = JSON.parse(await readFile(new URL('../data/dividend-forecast-2027.json', import.meta.url), 'utf8'));
const close = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} vs ${expected}`);

test('base estimate reconciles FY2026 annual payout, known interim deduction and remaining 2027 cash', () => {
    const { rows, totals, warnings } = calculateForecast(snapshot);
    close(totals.calendar2027Cash, 60616649.916266665);
    close(totals.remainingFY26Cash, 60616649.916266665);
    close(totals.annualCash, 64100549.916266665);
    close(totals.known2026InterimAtCurrentHoldings, 3483900);
    close(totals.annualCash - totals.known2026InterimAtCurrentHoldings, totals.remainingFY26Cash);
    close(totals.yieldOnCost, 0.07520554122554272);
    close(totals.yieldOnMarket, 0.0908274489011424);
    assert.equal(totals.capital, 806013080);
    assert.equal(totals.marketValue, 667382500);
    assert.equal(totals.capitalRoundingDifference, 1);
    assert.equal(warnings.length, 0);
    for (const row of rows) close(row.calendar2027Cash, row.remainingFY26Dps * row.shares);
    const simpleAverage = rows.reduce((sum, row) => sum + row.yieldOnCost, 0) / rows.length;
    assert.ok(Math.abs(totals.yieldOnCost - simpleAverage) > 0.005, 'portfolio yield must be weighted by invested capital');
});

test('all three scenario sensitivities match reviewed independent calculations', () => {
    const scenarios = calculateScenarios(snapshot);
    assert.deepEqual(scenarios.map(result => result.scenario), ['conservative', 'base', 'optimistic']);
    [51592018.89333333, 60616649.916266665, 66998855].forEach((expected, i) => close(scenarios[i].totals.calendar2027Cash, expected));
    assert.ok(scenarios.every(result => result.rows.find(row => row.code === 'BNGA').eps9m === 167.97));
    assert.equal(scenarios[1].rows.find(row => row.code === 'NISP').payout, 0.2042);
});

test('BMRI current 399 lots receive only remaining DPS; seven October lots never recreate past interim entitlement', () => {
    const row = calculateForecast(snapshot).rows.find(item => item.code === 'BMRI');
    assert.equal(row.shares, 39900);
    assert.equal(row.historicalOwnerEligibleShares, 39200);
    close(row.remainingFY26Dps, 448.1636);
    close(row.calendar2027Cash, 17881727.64);
    const wronglyUsingOwnerHistoricCash = row.annualCash - row.historicalOwnerEligibleShares * 66;
    close(wronglyUsingOwnerHistoricCash - row.calendar2027Cash, 46200);
});

test('future 2026 interim reduces remaining FY2026 cash; 2027 FY2027 interim adds calendar cash without changing FY2026 total', () => {
    const base = calculateForecast(snapshot);
    const adjusted = calculateForecast(snapshot, { additional2026InterimDps: { BBCA: 55 }, fy2027InterimDps: { BBCA: 45, BMRI: 66 } });
    close(adjusted.totals.annualCash, base.totals.annualCash);
    close(adjusted.totals.remainingFY26Cash, base.totals.remainingFY26Cash - 1039500);
    close(adjusted.totals.fy2027InterimCash, 3483900);
    close(adjusted.totals.calendar2027Cash, base.totals.calendar2027Cash - 1039500 + 3483900);
    const tax = calculateForecast(snapshot, { taxRate: 0.1 });
    close(tax.totals.calendar2027Cash, base.totals.calendar2027Cash);
    close(tax.totals.netCash, 54554984.92464);
});

test('custom payout and Q4 assumptions are pure and coherent, with no transaction mutation', () => {
    const original = JSON.stringify(snapshot);
    const result = calculateForecast(snapshot, { q4Multiplier: 0.8, payoutOverrides: { BBNI: 0.6 } });
    const bni = result.rows.find(row => row.code === 'BBNI');
    close(bni.estimatedFY26Eps, 547.2);
    close(bni.calendar2027Cash, 20520000);
    assert.equal(JSON.stringify(snapshot), original);
    assert.equal(result.rows.find(row => row.code === 'BBCA').payout, 0.72);
});

test('impossible interim subtraction cannot produce negative distributions and remains visibly flagged', () => {
    const result = calculateForecast(snapshot, { additional2026InterimDps: { BBCA: 1000 } });
    assert.equal(result.rows.find(row => row.code === 'BBCA').remainingFY26Cash, 0);
    assert.equal(result.warnings[0].type, 'interim-exceeds-forecast');
    assert.equal(result.warnings[0].code, 'BBCA');
});

test('invalid inputs fail closed rather than rendering NaN or silently applying another stock', () => {
    for (const options of [
        { scenario: 'not-real' }, { q4Multiplier: -1 }, { q4Multiplier: Infinity },
        { taxRate: -0.1 }, { taxRate: 1.1 }, { payoutOverrides: { BBCA: 1.1 } },
        { payoutOverrides: { BBCA: NaN } }, { payoutOverrides: { BAD: 0.7 } },
        { additional2026InterimDps: { BBCA: -1 } }, { fy2027InterimDps: { BBCA: '45' } }
    ]) assert.throws(() => calculateForecast(snapshot, options));
    assert.throws(() => calculateForecast({ ...snapshot, capital: 0 }));
    assert.throws(() => calculateForecast({ ...snapshot, positions: [] }));
    assert.throws(() => calculateForecast({ ...snapshot, positions: [...snapshot.positions, snapshot.positions[0]] }));
});

test('all forecast inputs have source lineage and positions match the existing reviewed portfolio', async () => {
    const positions = JSON.parse(await readFile(new URL('../data/portfolio-positions.json', import.meta.url), 'utf8'));
    const sources = new Set(snapshot.sources.map(source => source.id));
    assert.equal(snapshot.positionsAsOf, positions.verifiedAsOf);
    assert.equal(snapshot.capital, positions.brokerInvestedTotal);
    assert.deepEqual(snapshot.positions.map(row => [row.code, row.shares, row.invested]), positions.holdings.map(row => [row.code, row.shares, row.invested]));
    for (const row of snapshot.positions) {
        assert.ok(sources.has(row.epsSource));
        assert.ok(sources.has(row.payoutSource));
        assert.equal(row.shares / 100, row.lots);
    }
    assert.equal(snapshot.classification, 'analyst_projection_not_declared_dividend');
});

test('stored market date and shared Q3 EPS reconcile to the existing public data snapshots', async () => {
    const [valuation, banks, mandiri] = await Promise.all(['valuation-bands.json', 'banks-q3-2026.json', 'bmri-q3-2026.json']
        .map(async name => JSON.parse(await readFile(new URL(`../data/${name}`, import.meta.url), 'utf8'))));
    for (const row of snapshot.positions) {
        const market = valuation.entities[row.code].series.find(point => point[0] === snapshot.marketDate);
        assert.ok(market, `${row.code}: market date exists`);
        assert.equal(row.marketPrice, market[1]);
        if (['BBCA', 'BBNI'].includes(row.code)) assert.equal(row.eps9m, banks.banks[row.code].consolidated.current.eps);
        if (row.code === 'BMRI') assert.equal(row.eps9m, mandiri.consolidated.current.eps);
    }
    close(snapshot.marketTotal, calculateForecast(snapshot).totals.marketValue);
});
