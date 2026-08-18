import { mkdir, writeFile } from 'node:fs/promises';

const DAY_MS = 86_400_000;
const REPORTING_LAG_DAYS = 90;
const OUTPUT_PATH = new URL('../data/valuation-bands.json', import.meta.url);
const USER_AGENT = 'IDX-Portfolio-Monitor/1.0 (+https://idx.posnew.com)';

const holdings = [
    { code: 'BBCA', symbol: 'BBCA.JK', name: 'Bank Central Asia', shares: 18_900 },
    { code: 'BBNI', symbol: 'BBNI.JK', name: 'Bank Negara Indonesia', shares: 62_500 },
    { code: 'BMRI', symbol: 'BMRI.JK', name: 'Bank Mandiri', shares: 39_200 },
    { code: 'BNGA', symbol: 'BNGA.JK', name: 'CIMB Niaga', shares: 77_700 },
    { code: 'NISP', symbol: 'NISP.JK', name: 'OCBC Indonesia', shares: 64_100 }
];

const fundamentalTypes = [
    'annualNetIncomeCommonStockholders',
    'annualStockholdersEquity',
    'annualDilutedAverageShares',
    'annualBasicAverageShares',
    'annualOrdinarySharesNumber'
];

const round = (value, digits = 4) => Number(value.toFixed(digits));
const isoDate = value => new Date(value).toISOString().slice(0, 10);

function addDays(date, days) {
    return isoDate(new Date(`${date}T00:00:00Z`).getTime() + days * DAY_MS);
}

function subtractYears(date, years) {
    const value = new Date(`${date}T00:00:00Z`);
    value.setUTCFullYear(value.getUTCFullYear() - years);
    return isoDate(value);
}

async function fetchJson(url, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            const response = await fetch(url, {
                headers: { Accept: 'application/json', 'User-Agent': USER_AGENT }
            });
            if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
            const payload = await response.json();
            if (payload?.chart?.error || payload?.timeseries?.error) {
                throw new Error(JSON.stringify(payload.chart?.error || payload.timeseries?.error));
            }
            return payload;
        } catch (error) {
            lastError = error;
            if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, attempt * 1_000));
        }
    }
    throw new Error(`Unable to fetch ${url}: ${lastError?.message || lastError}`);
}

function extractSeries(payload) {
    const seriesByType = new Map();
    for (const entry of payload?.timeseries?.result || []) {
        const type = Array.isArray(entry.meta?.type) ? entry.meta.type[0] : entry.meta?.type;
        if (!type || !Array.isArray(entry[type])) continue;
        seriesByType.set(type, new Map(entry[type].map(item => [
            item.asOfDate,
            Number(item.reportedValue?.raw)
        ]).filter(([, value]) => Number.isFinite(value))));
    }
    return seriesByType;
}

function buildFundamentals(payload) {
    const byType = extractSeries(payload);
    const netIncome = byType.get('annualNetIncomeCommonStockholders') || new Map();
    const equity = byType.get('annualStockholdersEquity') || new Map();
    const diluted = byType.get('annualDilutedAverageShares') || new Map();
    const basic = byType.get('annualBasicAverageShares') || new Map();
    const ordinary = byType.get('annualOrdinarySharesNumber') || new Map();

    return [...netIncome.keys()].sort().map(asOfDate => {
        const earningsShares = diluted.get(asOfDate) || basic.get(asOfDate);
        const bookShares = ordinary.get(asOfDate) || earningsShares;
        const annualProfit = netIncome.get(asOfDate);
        const annualEquity = equity.get(asOfDate);
        if (![earningsShares, bookShares, annualProfit, annualEquity].every(value => Number.isFinite(value) && value > 0)) return null;
        return {
            fiscalYear: Number(asOfDate.slice(0, 4)),
            asOfDate,
            availableDate: addDays(asOfDate, REPORTING_LAG_DAYS),
            eps: annualProfit / earningsShares,
            bvps: annualEquity / bookShares
        };
    }).filter(Boolean);
}

function basisForDate(fundamentals, date) {
    let match = null;
    for (const item of fundamentals) {
        if (item.availableDate <= date) match = item;
        else break;
    }
    return match;
}

async function loadEntity(holding, period1, period2) {
    const chartUrl = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${holding.symbol}`);
    chartUrl.search = new URLSearchParams({
        period1: String(period1),
        period2: String(period2),
        interval: '1d',
        events: 'splits'
    });

    const fundamentalsUrl = new URL(`https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${holding.symbol}`);
    fundamentalsUrl.search = new URLSearchParams({
        symbol: holding.symbol,
        type: fundamentalTypes.join(','),
        period1: String(Math.floor(Date.UTC(2021, 0, 1) / 1_000)),
        period2: String(period2)
    });

    const [chartPayload, fundamentalsPayload] = await Promise.all([
        fetchJson(chartUrl),
        fetchJson(fundamentalsUrl)
    ]);

    const chart = chartPayload?.chart?.result?.[0];
    const timestamps = chart?.timestamp || [];
    const closes = chart?.indicators?.quote?.[0]?.close || [];
    const fundamentals = buildFundamentals(fundamentalsPayload);
    if (fundamentals.length < 4) throw new Error(`${holding.code}: fewer than four annual fundamental periods`);

    const series = timestamps.map((timestamp, index) => {
        const close = Number(closes[index]);
        const date = isoDate(timestamp * 1_000);
        const basis = basisForDate(fundamentals, date);
        if (!basis || !Number.isFinite(close) || close <= 0 || basis.eps <= 0 || basis.bvps <= 0) return null;
        return [date, round(close, 2), round(close / basis.eps), round(close / basis.bvps), basis.fiscalYear];
    }).filter(Boolean);

    if (series.length < 700) throw new Error(`${holding.code}: insufficient daily valuation history (${series.length} rows)`);
    return { ...holding, fundamentals, series };
}

function buildPortfolio(entities) {
    const maps = new Map(entities.map(entity => [entity.code, new Map(entity.series.map(row => [row[0], row]))]));
    const commonDates = entities[0].series.map(row => row[0]).filter(date => entities.every(entity => maps.get(entity.code).has(date))).sort();
    const latestDate = commonDates.at(-1);
    const cutoffDate = subtractYears(latestDate, 3);
    const portfolioSeries = [];

    for (const date of commonDates) {
        if (date < cutoffDate) continue;
        let marketValue = 0;
        let earnings = 0;
        let bookValue = 0;
        for (const entity of entities) {
            const [, close, pe, pbv] = maps.get(entity.code).get(date);
            const positionValue = close * entity.shares;
            marketValue += positionValue;
            earnings += (positionValue / pe);
            bookValue += (positionValue / pbv);
        }
        if (earnings > 0 && bookValue > 0) portfolioSeries.push([
            date,
            round(marketValue, 0),
            round(marketValue / earnings),
            round(marketValue / bookValue)
        ]);
    }

    if (portfolioSeries.length < 700) throw new Error(`Portfolio: insufficient aligned history (${portfolioSeries.length} rows)`);
    return { latestDate, cutoffDate, portfolioSeries };
}

function latestSnapshot(entities, latestDate) {
    const rows = entities.map(entity => {
        const latest = entity.series.findLast(row => row[0] === latestDate);
        if (!latest) throw new Error(`${entity.code}: missing latest common date ${latestDate}`);
        const marketValue = latest[1] * entity.shares;
        return { entity, latest, marketValue };
    });
    const total = rows.reduce((sum, row) => sum + row.marketValue, 0);
    return rows.map(({ entity, latest, marketValue }) => ({
        code: entity.code,
        symbol: entity.symbol,
        name: entity.name,
        shares: entity.shares,
        currentPrice: latest[1],
        marketValue: round(marketValue, 0),
        weight: round(marketValue / total, 6),
        pe: latest[2],
        pbv: latest[3],
        fiscalYearBasis: latest[4]
    }));
}

async function main() {
    const period2 = Math.floor((Date.now() + DAY_MS) / 1_000);
    const period1 = Math.floor((Date.now() - 4 * 366 * DAY_MS) / 1_000);
    const entities = await Promise.all(holdings.map(holding => loadEntity(holding, period1, period2)));
    const { latestDate, cutoffDate, portfolioSeries } = buildPortfolio(entities);
    const snapshot = latestSnapshot(entities, latestDate);

    const output = {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        priceDate: latestDate,
        periodStart: cutoffDate,
        methodology: {
            fundamentalBasis: 'Latest available full-year net income and year-end equity, applied 90 days after fiscal year-end to avoid look-ahead bias.',
            portfolioAggregation: 'Daily market-value weighted harmonic P/E and P/BV, equivalent to total position value divided by attributable earnings or book value.',
            updateCadence: 'Scheduled after the Indonesia Stock Exchange close on trading weekdays.',
            caveat: 'Market data may be delayed. Annual-basis ratios are not trailing-twelve-month ratios.'
        },
        sources: {
            marketData: 'Yahoo Finance chart endpoint',
            fundamentals: 'Yahoo Finance fundamentals-timeseries endpoint'
        },
        columns: ['date', 'close_or_market_value', 'pe', 'pbv', 'fiscal_year_basis'],
        holdings: snapshot,
        entities: {
            PORTFOLIO: {
                code: 'PORTFOLIO',
                name: 'Portfolio aggregate',
                series: portfolioSeries
            },
            ...Object.fromEntries(entities.map(entity => [entity.code, {
                code: entity.code,
                name: entity.name,
                symbol: entity.symbol,
                series: entity.series.filter(row => row[0] >= cutoffDate),
                fundamentals: entity.fundamentals.map(item => ({
                    fiscalYear: item.fiscalYear,
                    asOfDate: item.asOfDate,
                    availableDate: item.availableDate,
                    eps: round(item.eps),
                    bvps: round(item.bvps)
                }))
            }]))
        }
    };

    await mkdir(new URL('../data/', import.meta.url), { recursive: true });
    await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${OUTPUT_PATH.pathname}: ${portfolioSeries.length} aligned days through ${latestDate}`);
}

await main();
