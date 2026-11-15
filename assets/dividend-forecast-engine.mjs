// Forecasts only: this module never writes a transaction, an entitlement, or a cash balance.
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function number(value, name, min = 0, max = Infinity) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
        throw new RangeError(`${name} must be a finite number from ${min} to ${max}`);
    }
    return value;
}

function overrides(value, name, codes, max = Infinity) {
    if (value === undefined) return {};
    if (!value || Array.isArray(value) || typeof value !== 'object') throw new TypeError(`${name} must be an object`);
    for (const [code, amount] of Object.entries(value)) {
        if (!codes.has(code)) throw new RangeError(`${name}: unknown stock ${code}`);
        number(amount, `${name}.${code}`, 0, max);
    }
    return value;
}

function rate(amount, denominator) { return denominator > 0 ? amount / denominator : null; }

/** All rates use fractions (0.72 = 72%). Unknown future interim dividends default to
 * zero contribution to the model, not a claim that no such distribution will occur.
 * FY26 remaining distributions are separated from calendar-year 2027 cash.
 */
export function calculateForecast(snapshot, options = {}) {
    if (!snapshot || !Array.isArray(snapshot.positions) || snapshot.positions.length === 0) throw new TypeError('positions are required');
    const capital = number(snapshot.capital, 'capital', Number.MIN_VALUE);
    const codes = new Set(snapshot.positions.map(row => row.code));
    if (codes.size !== snapshot.positions.length || [...codes].some(code => typeof code !== 'string' || !code)) throw new RangeError('position codes must be unique nonempty strings');
    const scenario = options.scenario ?? 'base';
    if (!snapshot.scenarios || !own(snapshot.scenarios, scenario)) throw new RangeError(`Unknown scenario ${scenario}`);
    const preset = snapshot.scenarios[scenario];
    const q4Multiplier = number(options.q4Multiplier ?? preset.q4Multiplier, 'q4Multiplier', 0, 5);
    const payoutOverrides = overrides(options.payoutOverrides, 'payoutOverrides', codes, 1);
    const extraInterim = overrides(options.additional2026InterimDps, 'additional2026InterimDps', codes);
    const nextInterim = overrides(options.fy2027InterimDps, 'fy2027InterimDps', codes);
    const taxRate = number(options.taxRate ?? 0, 'taxRate', 0, 1);
    const warnings = [];
    const rows = snapshot.positions.map(position => {
        const { code } = position;
        const shares = number(position.shares, `${code}.shares`, 0);
        if (!Number.isSafeInteger(shares)) throw new RangeError(`${code}.shares must be a safe integer`);
        const invested = number(position.invested, `${code}.invested`);
        const marketPrice = number(position.marketPrice, `${code}.marketPrice`);
        const eps9m = number(position.eps9m, `${code}.eps9m`);
        const payout = number(payoutOverrides[code] ?? preset.payout[code], `${code}.payout`, 0, 1);
        const known2026InterimDps = number(position.known2026InterimDps, `${code}.known2026InterimDps`);
        const additional2026InterimDps = extraInterim[code] ?? 0;
        const fy2027InterimDps = nextInterim[code] ?? 0;
        const estimatedFY26Eps = eps9m + (eps9m / 3) * q4Multiplier;
        const estimatedFY26Dps = estimatedFY26Eps * payout;
        const total2026InterimDps = known2026InterimDps + additional2026InterimDps;
        const remainingFY26Dps = Math.max(0, estimatedFY26Dps - total2026InterimDps);
        if (total2026InterimDps > estimatedFY26Dps) warnings.push({ code, type: 'interim-exceeds-forecast', message: `${code}: dividen interim melebihi proyeksi total FY2026; sisa dibatasi nol. Tinjau asumsi laba/payout.` });
        const annualCash = shares * estimatedFY26Dps;
        const remainingFY26Cash = shares * remainingFY26Dps;
        const fy2027InterimCash = shares * fy2027InterimDps;
        const calendar2027Cash = remainingFY26Cash + fy2027InterimCash;
        const netCash = calendar2027Cash * (1 - taxRate);
        const marketValue = shares * marketPrice;
        return { ...position, lots: shares / 100, shares, invested, marketPrice, marketValue, eps9m, payout, q4Multiplier,
            estimatedFY26Eps, estimatedFY26Dps, known2026InterimDps, additional2026InterimDps,
            total2026InterimDps, remainingFY26Dps, fy2027InterimDps, annualCash,
            known2026InterimAtCurrentHoldings: shares * known2026InterimDps,
            additional2026InterimCash: shares * additional2026InterimDps,
            remainingFY26Cash, fy2027InterimCash, calendar2027Cash, netCash,
            yieldOnCost: rate(calendar2027Cash, invested), yieldOnMarket: rate(calendar2027Cash, marketValue),
            netYieldOnCost: rate(netCash, invested), netYieldOnMarket: rate(netCash, marketValue),
            annualYieldOnCost: rate(annualCash, invested), annualYieldOnMarket: rate(annualCash, marketValue) };
    });
    const sum = key => rows.reduce((total, row) => total + row[key], 0);
    const marketValue = sum('marketValue');
    const calendar2027Cash = sum('calendar2027Cash');
    const annualCash = sum('annualCash');
    const netCash = sum('netCash');
    const totals = { capital, investedRows: sum('invested'), capitalRoundingDifference: capital - sum('invested'), marketValue,
        annualCash, known2026InterimAtCurrentHoldings: sum('known2026InterimAtCurrentHoldings'),
        additional2026InterimCash: sum('additional2026InterimCash'), remainingFY26Cash: sum('remainingFY26Cash'),
        fy2027InterimCash: sum('fy2027InterimCash'), calendar2027Cash, netCash,
        yieldOnCost: rate(calendar2027Cash, capital), yieldOnMarket: rate(calendar2027Cash, marketValue),
        netYieldOnCost: rate(netCash, capital), netYieldOnMarket: rate(netCash, marketValue),
        annualYieldOnCost: rate(annualCash, capital), annualYieldOnMarket: rate(annualCash, marketValue) };
    const assumptions = { scenario, q4Multiplier, taxRate,
        payout: Object.fromEntries(rows.map(row => [row.code, row.payout])),
        additional2026InterimDps: Object.fromEntries(rows.map(row => [row.code, row.additional2026InterimDps])),
        fy2027InterimDps: Object.fromEntries(rows.map(row => [row.code, row.fy2027InterimDps])),
        unknownFutureInterimIsExcluded: true };
    return { scenario, q4Multiplier, taxRate, assumptions, asOf: snapshot.asOf, marketDate: snapshot.marketDate,
        positionsAsOf: snapshot.positionsAsOf, rows, totals, warnings };
}

export function calculateScenarios(snapshot, options = {}) {
    return Object.keys(snapshot.scenarios).map(scenario => calculateForecast(snapshot, { ...options, scenario }));
}
