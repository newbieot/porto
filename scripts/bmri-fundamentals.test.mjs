import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const version = 'fundamentals.20261026-bmri-q3-v1.js';
const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

async function app() {
    const [script, valuation, quarter] = await Promise.all([
        read(`assets/${version}`), read('data/valuation-bands.json'), read('data/bmri-q3-2026.json')
    ]);
    const elements = new Map(), charts = new Map();
    const element = id => {
        if (!elements.has(id)) elements.set(id, {
            id, textContent: '', innerHTML: '', dataset: {}, handlers: {},
            addEventListener(event, handler) { this.handlers[event] = handler; },
            setAttribute() {}, querySelector() { return null; }
        });
        return elements.get(id);
    };
    class Chart {
        constructor(canvas, config) { charts.set(canvas.id, config); }
        destroy() {}
    }
    const errors = [];
    const context = vm.createContext({
        window: { Chart }, Chart,
        document: {
            documentElement: { dataset: {} },
            getElementById: element,
            querySelector: selector => element(selector),
            querySelectorAll: () => []
        },
        localStorage: { getItem: () => null, setItem() {} },
        getComputedStyle: () => ({ getPropertyValue: () => '#123456' }),
        fetch: async url => ({ ok: true, json: async () => JSON.parse(String(url).includes('bmri-q3') ? quarter : valuation) }),
        console: { error: error => errors.push(error), log() {} },
        URL, Intl, setTimeout, clearTimeout
    });
    vm.runInContext(script, context, { filename: version });
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(errors, [], 'startup must not log errors');
    return { charts, element, quarter: JSON.parse(quarter) };
}

test('Q3 source keeps million-IDR YTD results and consolidation scopes distinct', async () => {
    const facts = JSON.parse(await read('data/bmri-q3-2026.json'));
    assert.equal(facts.currency, 'IDR');
    assert.equal(facts.unit, 'million');
    assert.equal(facts.periodEnd, '2026-09-30');
    assert.equal(facts.bankOnly.current.netProfit, 41968253);
    assert.equal(facts.bankOnly.previous.netProfit, 34795956);
    assert.equal(facts.consolidated.current.attributableProfit, 45534001);
    assert.equal(facts.consolidated.previous.attributableProfit, 37730142);
    assert.notEqual(facts.bankOnly.current.netProfit, facts.consolidated.current.attributableProfit);
    for (const period of ['current', 'previous']) {
        const bank = facts.bankOnly[period];
        assert.equal(bank.deposits, bank.giro + bank.savings + bank.timeDeposits);
        assert.equal(bank.nii, bank.interestIncome - bank.interestExpense);
        assert.ok(Math.abs(bank.casa - (bank.giro + bank.savings) / bank.deposits * 100) < 1e-9);
        assert.ok(Math.abs(bank.derivedLdr - bank.loans / bank.deposits * 100) < 1e-9);
    }
    assert.equal(facts.reportedBankRatios.unit, 'percent');
    assert.equal(facts.reportedBankRatios.current.nim, 4.21);
    assert.equal(facts.reportedBankRatios.previous.nim, 4.59);
    assert.equal(facts.reportedBankRatios.current.ldr, 91.2);
    assert.notEqual(facts.reportedBankRatios.current.ldr, facts.bankOnly.current.derivedLdr);
    assert.match(facts.caveats.join(' '), /BSI deconsolidated/);
    assert.match(facts.caveats.join(' '), /not standalone Q3/);
});

test('Charts default to BMRI, append verified September, and leave other banks unavailable', async () => {
    const { charts, element } = await app();
    const credit = charts.get('credit-chart'), profit = charts.get('profit-chart');
    assert.equal(credit.data.labels.length, 9);
    assert.match(credit.data.labels.at(-1), /Sep/i);
    assert.match(credit.data.datasets[0].label, /BMRI/);
    assert.equal(credit.data.datasets[0].data.at(-1), 1384.539056);
    assert.equal(credit.data.datasets[1].data.at(-1), 1605.839379);
    assert.equal(profit.data.datasets[0].data.at(-1), 34.795956);
    assert.equal(profit.data.datasets[1].data.at(-1), 41.968253);
    assert.match(element('coverage-note').textContent, /September|Sept|9M|Q3/i);
    const matrix = element('fundamental-table-body').innerHTML;
    assert.equal((matrix.match(/Report unavailable/g) || []).length, 8);
    assert.match(matrix, /1\.605,84/);
    for (const code of ['BBCA', 'BBNI', 'BNGA', 'NISP']) {
        element('bank-filter').handlers.click({ target: { closest: () => ({ dataset: { bank: code } }) } });
        for (const id of ['credit-chart', 'profit-chart']) {
            const data = charts.get(id).data;
            assert.equal(data.labels.length, 9);
            for (const dataset of data.datasets) {
                assert.equal(dataset.data.length, 9, `${code} ${id}: consistent month axis`);
                assert.equal(dataset.data.at(-1), null, `${code}: September must not be invented`);
            }
        }
    }
});

test('Published HTML selects the new immutable asset and retains annual valuation methodology', async () => {
    const html = await read('fundamentals.html');
    assert.ok(html.includes(`/assets/${version}`));
    assert.ok(!html.includes('/assets/fundamentals.20260930-bnga-nisp-aug-v1.js'));
    assert.match(html, /<th>Sep<\/th>/);
    assert.match(html, /bank.only|bank individual|individual.bank/i);
    assert.match(html, /rasio memakai laba bersih FY/);
    assert.match(html, /bukan trailing twelve months/);
});
