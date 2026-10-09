import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const positions = JSON.parse(await readFile(new URL('../data/portfolio-positions.json', import.meta.url), 'utf8'));
const valuation = JSON.parse(await readFile(new URL('../data/valuation-bands.json', import.meta.url), 'utf8'));
const brokerShares = { BBCA: 18900, BBNI: 62500, BMRI: 39900, BNGA: 77700, NISP: 64100 };
const brokerPrices = { BBCA: 6050, BBNI: 3430, BMRI: 4040, BNGA: 1695, NISP: 1225 };

test('2 October trade reconciles to the broker fee and resulting BMRI position', () => {
    const trade = positions.transactions.find(item => item.code === 'BMRI' && item.date === '2026-10-02');
    assert.equal(trade.shares, 700);
    assert.equal(trade.shares * trade.price, 2807000);
    assert.equal(trade.grossAmount + trade.fee, 2811211);
    assert.equal(trade.netAmount, 2811211);
    assert.deepEqual(Object.fromEntries(positions.holdings.map(item => [item.code, item.shares])), brokerShares);
    assert.equal(positions.holdings.find(item => item.code === 'BMRI').invested, 178751597);
    assert.equal(positions.brokerInvestedTotal - positions.holdings.reduce((sum, item) => sum + item.invested, 0), 1);
});

test('9 October issuer prices and aggregate value match the supplied Stockbit screenshot', () => {
    let total = 0;
    for (const [code, shares] of Object.entries(brokerShares)) {
        const row = valuation.entities[code].series.find(item => item[0] === '2026-10-09');
        assert.ok(row, `${code}: missing verified date`);
        assert.equal(row[1], brokerPrices[code]);
        total += row[1] * shares;
        assert.equal(valuation.holdings.find(item => item.code === code).shares, shares);
    }
    assert.equal(total, 700140000);
    assert.equal(valuation.entities.PORTFOLIO.series.find(item => item[0] === '2026-10-09')[1], total);
    assert.ok(Math.abs(valuation.holdings.reduce((sum, item) => sum + item.weight, 0) - 1) < 0.000003);
});

test('all historical basket values and multiples reconcile across the five issuers', () => {
    const indexes = Object.fromEntries(Object.keys(brokerShares).map(code => [code, new Map(valuation.entities[code].series.map(row => [row[0], row]))]));
    for (const [date, value, pe, pbv] of valuation.entities.PORTFOLIO.series) {
        let market = 0;
        let earnings = 0;
        let equity = 0;
        for (const [code, shares] of Object.entries(brokerShares)) {
            const row = indexes[code].get(date);
            assert.ok(row, `${code}: missing common date ${date}`);
            const positionValue = row[1] * shares;
            market += positionValue;
            earnings += positionValue / row[2];
            equity += positionValue / row[3];
        }
        assert.equal(value, Math.round(market), date);
        assert.ok(Math.abs(pe - market / earnings) <= 0.000051, `${date}: P/E`);
        assert.ok(Math.abs(pbv - market / equity) <= 0.000051, `${date}: P/BV`);
    }
});

test('confirmed dividends use eligible shares and the cash ledger reconciles to net return', () => {
    const dividends = positions.confirmedDividends;
    for (const item of dividends) assert.equal(item.amount, item.eligibleShares * item.perShare);
    assert.equal(dividends.find(item => item.code === 'BMRI').eligibleShares, 39200);
    assert.equal(dividends.reduce((sum, item) => sum + item.amount, 0), 3059700);
    const cash = positions.recordedCashReturns;
    assert.equal(cash.dividends + cash.realizedSales, 142100374 + 3059700);
    const floating = (positions.brokerMarketValue - positions.brokerInvestedTotal) / positions.brokerInvestedTotal * 100;
    const net = floating + (cash.dividends + cash.realizedSales) / positions.brokerInvestedTotal * 100;
    assert.equal(floating.toFixed(2), '-13.14');
    assert.equal(net.toFixed(2), '4.87');
});
