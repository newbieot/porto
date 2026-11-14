import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = name => readFile(new URL(name, root), 'utf8');
const version = 'fundamentals.20261114-banks-q3-v1.js';
const codes = ['BBCA', 'BBNI', 'BNGA', 'NISP'];
const close = (actual, expected, context, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${context}: ${actual} vs ${expected}`);

async function source() { return JSON.parse(await read('data/banks-q3-2026.json')); }
async function app() {
    const [script, valuation] = await Promise.all([read(`assets/${version}`), read('data/valuation-bands.json')]);
    const facts = await source(), elements = new Map(), charts = new Map(), errors = [];
    const element = id => {
        if (!elements.has(id)) elements.set(id, { id, textContent: '', innerHTML: '', dataset: {}, handlers: {},
            addEventListener(event, handler) { this.handlers[event] = handler; }, setAttribute() {}, querySelector() { return null; } });
        return elements.get(id);
    };
    class Chart { constructor(canvas, config) { charts.set(canvas.id, config); } destroy() {} }
    const context = vm.createContext({ window: { Chart }, Chart,
        document: { documentElement: { dataset: {} }, getElementById: element,
            querySelector: selector => element(selector), querySelectorAll: () => [] },
        localStorage: { getItem: () => null, setItem() {} },
        getComputedStyle: () => ({ getPropertyValue: () => '#123456' }),
        fetch: async url => ({ ok: true, json: async () => String(url).includes('banks-q3') ? facts : JSON.parse(valuation) }),
        console: { error: error => errors.push(error), log() {} }, URL, Intl, setTimeout, clearTimeout });
    vm.runInContext(script, context, { filename: version });
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(errors, [], 'page initialization must not log runtime errors');
    return { facts, element, charts };
}

test('Four-bank Q3 source uses matching September positions and 9M income with integer source arithmetic', async () => {
    const facts = await source();
    assert.equal(facts.schemaVersion, 1);
    assert.equal(facts.periodEnd, '2026-09-30');
    assert.equal(facts.comparativeEnd, '2025-09-30');
    assert.equal(facts.unit, 'million');
    assert.deepEqual(Object.keys(facts.banks).sort(), [...codes].sort());
    const verified = { BBCA: [1030718519, 913729808, 45180388, 43573799], BBNI: [976381824, 796526385, 16363116, 15169686] };
    for (const code of codes) {
        const bank = facts.banks[code];
        for (const period of ['current', 'previous']) {
            const b = bank.bankOnly[period];
            for (const key of ['netProfit', 'giro', 'savings', 'timeDeposits', 'nii']) assert.ok(Number.isSafeInteger(b[key]), `${code} ${period} ${key}`);
            assert.equal(b.deposits, b.giro + b.savings + b.timeDeposits, `${code} ${period}: DPK`);
            assert.equal(b.nii, b.interestIncome - b.interestExpense, `${code} ${period}: NII`);
            close(b.casa, (b.giro + b.savings) / b.deposits * 100, `${code} ${period}: CASA`);
            if (code === 'NISP') { assert.equal(b.loans, null); assert.equal(b.derivedLdr, null); assert.ok(b.totalLoansIncludingAccruedInterestAndSharia > 0); }
            else { assert.ok(Number.isSafeInteger(b.loans)); close(b.derivedLdr, b.loans / b.deposits * 100, `${code} ${period}: arithmetic LDR`); }
        }
        if (verified[code]) assert.deepEqual([bank.bankOnly.current.loans, bank.bankOnly.previous.loans, bank.bankOnly.current.netProfit, bank.bankOnly.previous.netProfit], verified[code]);
    }
});

test('September charts use individual-bank amounts for all four banks, never consolidated earnings', async () => {
    const { facts, charts, element } = await app();
    for (const code of codes) {
        element('bank-filter').handlers.click({ target: { closest: () => ({ dataset: { bank: code } }) } });
        const bank = facts.banks[code];
        for (const [id, metric] of [['credit-chart', 'loans'], ['profit-chart', 'netProfit']]) {
            const chart = charts.get(id);
            assert.equal(chart.data.labels.length, 9);
            assert.match(chart.data.labels.at(-1), /Sep/i);
            assert.match(chart.data.datasets[0].label, new RegExp(code));
            for (const [index, period] of [[0, 'previous'], [1, 'current']]) {
                assert.equal(chart.data.datasets[index].data.length, 9);
                const amount = bank.bankOnly[period][metric];
                if (amount === null) assert.equal(chart.data.datasets[index].data.at(-1), null, `${code}: unavailable remains a gap`);
                else close(chart.data.datasets[index].data.at(-1), amount / 1e6, `${code} ${metric} ${period}`);
            }
        }
        assert.match(element('coverage-note').textContent, /September|9M|Q3/i);
    }
    assert.equal((element('fundamental-table-body').innerHTML.match(/Report unavailable/g) || []).length, 1);
});

test('Coverage source scopes prevent bank-only and consolidated provision pools from being mixed', async () => {
    const { banks } = await source();
    for (const code of codes) {
        const q = banks[code].assetQuality;
        assert.ok(q.basis && q.source.url && (q.source.kind === 'webpage' || q.source.pages.length), `${code}: scope and inspectable source`);
        for (const metric of ['lar', 'larCoverage', 'nplCoverage']) {
            assert.ok(['reported', 'derived'].includes(q.methods[metric]), `${code} ${metric}: explicit method`);
            assert.ok(Number.isFinite(q.current[metric]) && q.current[metric] > 0, `${code} ${metric}: value`);
        }
    }
    const bca = banks.BBCA.assetQuality;
    assert.match(bca.basis, /bank.only/i);
    assert.equal(bca.current.larCoverage, 71.2);
    assert.equal(bca.current.nplCoverage, 167.5);
    assert.notEqual(bca.current.larCoverage, 71.4, '71.4 belongs to a different consolidation scope');
    assert.equal(bca.methods.larCoverage, 'reported', 'off-balance-sheet provision pool must use disclosed coverage');
    assert.match(JSON.stringify(bca.notes), /off|balance|B\/S/i);
    assert.equal(banks.BBNI.assetQuality.current.larCoverage, 48.3);
    assert.equal(banks.BBNI.assetQuality.current.nplCoverage, 193.3);
    assert.match(banks.BBNI.assetQuality.basis, /bank.only/i);
    assert.equal(banks.BNGA.assetQuality.current.larCoverage, 36.3);
    assert.equal(banks.BNGA.assetQuality.current.nplCoverage, 116.8);
    assert.match(banks.BNGA.assetQuality.basis, /consolidat/i);
    const nisp = banks.NISP.assetQuality;
    if (nisp.methods.larCoverage === 'derived') {
        close(nisp.current.larCoverage, nisp.current.nplCoverage * nisp.current.nplGross / nisp.current.lar, 'NISP same-pool rounded coverage', 0.2);
        assert.match(JSON.stringify(nisp.notes), /pool|assum|asum|round|pembulat/i, 'derived coverage must disclose its provision-pool assumption or input rounding');
    }
});

test('Live Q3 asset rows disclose current period and method; annual valuation basis stays separate', async () => {
    const html = await read('fundamentals.html');
    assert.ok(html.includes(`/assets/${version}`));
    assert.match(html, /rasio memakai laba bersih FY/);
    assert.match(html, /bukan trailing twelve months/);
    for (const code of codes) {
        const row = html.match(new RegExp(`<tr id="${code.toLowerCase()}-asset-quality">[\\s\\S]*?<\\/tr>`))?.[0];
        assert.ok(row, `${code}: source row present`);
        assert.match(row, /Sep|Q3|9M/i);
        assert.doesNotMatch(row, /1H26|Jun 2026|June 2026/, `${code}: old period must not masquerade as current`);
        assert.match(row, /method-reported|method-derived/);
        if(code==='BNGA') assert.match(row, /1\.81%/);
    }
});
