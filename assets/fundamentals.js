(() => {
    'use strict';

    const months = ['January', 'February', 'March', 'April', 'May'];
    const banks = [
        { code: 'BMRI', name: 'PT Bank Mandiri (Persero) Tbk', color: '#3976e8' },
        { code: 'BBCA', name: 'PT Bank Central Asia Tbk', color: '#f04b2f' },
        { code: 'BBNI', name: 'PT Bank Negara Indonesia (Persero) Tbk', color: '#d89713' },
        { code: 'BNGA', name: 'PT Bank CIMB Niaga Tbk', color: '#d94a59' },
        { code: 'NISP', name: 'PT Bank OCBC NISP Tbk', color: '#0b9f6a' }
    ];

    const data2025 = {
        credit: {
            BMRI: [1307.18, 1307.64, 1303.27, 1308.44, 1309.68],
            BBCA: [893.03, 900.66, 930.13, 923.10, 924.26],
            BBNI: [749.82, 741.99, 750.42, 757.58, 755.45],
            BNGA: [155.31, 157.13, 160.11, 160.20, 161.20],
            NISP: [158.23, 161.03, 162.31, 162.32, 158.35]
        },
        profit: {
            BMRI: [4.01, 7.59, 11.63, 15.19, 19.65],
            BBCA: [4.73, 8.98, 14.15, 20.21, 25.16],
            BBNI: [1.63, 3.29, 5.38, 6.87, 8.45],
            BNGA: [0.36, 0.73, 1.63, 2.26, 2.74],
            NISP: [0.42, 0.83, 1.29, 1.71, 2.13]
        }
    };

    const data2026 = {
        credit: {
            BMRI: [1511.41, 1513.07, 1530.16, 1550.18, 1579.94],
            BBCA: [948.96, 953.22, 980.59, 965.02, 969.10],
            BBNI: [894.29, 882.22, 903.34, 919.50, 940.88],
            BNGA: [165.19, 167.61, 171.76, 171.40, 175.09],
            NISP: [160.38, 162.11, 170.56, 163.87, 168.69]
        },
        profit: {
            BMRI: [4.65, 8.86, 13.58, 18.05, 23.32],
            BBCA: [5.00, 9.23, 14.69, 20.82, 25.68],
            BBNI: [1.69, 3.42, 5.65, 7.29, 9.05],
            BNGA: [0.58, 1.07, 1.73, 2.28, 2.71],
            NISP: [0.44, 0.86, 1.36, 1.82, 2.26]
        }
    };

    const state = { selectedBank: 'all', creditChart: null, profitChart: null };

    function cssVar(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    function yoy(current, prior) {
        if (!Number.isFinite(current) || !Number.isFinite(prior) || prior === 0) return null;
        return ((current - prior) / prior) * 100;
    }

    function formatYoy(value) {
        if (!Number.isFinite(value)) return 'N/A';
        return `${value > 0 ? '+' : ''}${value.toFixed(1)}% YoY`;
    }

    function setTheme(theme) {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem('idx-theme', theme);
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#080d18' : '#f3f6fb');
        renderCharts();
    }

    function toggleTheme() {
        setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    }

    function aggregate(metric, yearData) {
        return months.map((_, index) => banks.reduce((sum, bank) => sum + yearData[metric][bank.code][index], 0));
    }

    function selectedSeries(metric, yearData) {
        return state.selectedBank === 'all'
            ? aggregate(metric, yearData)
            : yearData[metric][state.selectedBank];
    }

    function chartOptions() {
        const text = cssVar('--text');
        const soft = cssVar('--chart-tick');
        const grid = cssVar('--chart-grid');
        const panel = cssVar('--bg-elevated');
        const border = cssVar('--border');
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            animation: { duration: 420 },
            plugins: {
                legend: { position: 'bottom', labels: { color: soft, usePointStyle: true, pointStyle: 'circle', boxWidth: 7, padding: 18, font: { size: 11, weight: '600' } } },
                tooltip: { backgroundColor: panel, titleColor: text, bodyColor: soft, borderColor: border, borderWidth: 1, padding: 12, callbacks: { label: context => `${context.dataset.label}: ${Number(context.raw).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}T` } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: soft, font: { size: 10 } }, border: { display: false } },
                y: { grid: { color: grid }, ticks: { color: soft, callback: value => `${Number(value).toLocaleString('en-US')}T`, font: { size: 10 } }, border: { display: false } }
            }
        };
    }

    function renderCharts() {
        if (!window.Chart) return;
        const label = state.selectedBank === 'all' ? 'Five-bank aggregate' : state.selectedBank;
        const credit25 = selectedSeries('credit', data2025);
        const credit26 = selectedSeries('credit', data2026);
        const profit25 = selectedSeries('profit', data2025);
        const profit26 = selectedSeries('profit', data2026);

        state.creditChart?.destroy();
        state.creditChart = new Chart(document.getElementById('credit-chart'), {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    { label: `${label} · 2025`, data: credit25, backgroundColor: 'rgba(93, 143, 242, .25)', borderColor: '#5d8ff2', borderWidth: 1, borderRadius: 7 },
                    { label: `${label} · 2026`, data: credit26, backgroundColor: '#5d8ff2', borderColor: '#5d8ff2', borderWidth: 1, borderRadius: 7 }
                ]
            },
            options: chartOptions()
        });

        state.profitChart?.destroy();
        state.profitChart = new Chart(document.getElementById('profit-chart'), {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    { label: `${label} · 2025`, data: profit25, backgroundColor: 'rgba(32, 201, 138, .25)', borderColor: '#20c98a', borderWidth: 1, borderRadius: 7 },
                    { label: `${label} · 2026`, data: profit26, backgroundColor: '#20c98a', borderColor: '#20c98a', borderWidth: 1, borderRadius: 7 }
                ]
            },
            options: chartOptions()
        });
    }

    function renderFilters() {
        const filter = document.getElementById('bank-filter');
        const options = [{ code: 'all', name: 'All banks' }, ...banks];
        filter.replaceChildren(...options.map(option => {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.bank = option.code;
            button.textContent = option.code === 'all' ? option.name : option.code;
            button.classList.toggle('is-active', option.code === state.selectedBank);
            button.setAttribute('aria-pressed', String(option.code === state.selectedBank));
            return button;
        }));
    }

    function selectBank(event) {
        const button = event.target.closest('button[data-bank]');
        if (!button) return;
        state.selectedBank = button.dataset.bank;
        renderFilters();
        renderCharts();
    }

    function renderSummary() {
        const mayIndex = months.length - 1;
        const profitGrowth = banks.map(bank => ({ bank, value: yoy(data2026.profit[bank.code][mayIndex], data2025.profit[bank.code][mayIndex]) })).sort((a, b) => b.value - a.value)[0];
        const largestLoan = banks.map(bank => ({ bank, value: data2026.credit[bank.code][mayIndex] })).sort((a, b) => b.value - a.value)[0];

        document.getElementById('strongest-profit').textContent = `${profitGrowth.bank.code} ${profitGrowth.value > 0 ? '+' : ''}${profitGrowth.value.toFixed(1)}%`;
        document.getElementById('strongest-profit-detail').textContent = 'May 2026 versus May 2025';
        document.getElementById('largest-loan').textContent = `${largestLoan.bank.code} ${largestLoan.value.toLocaleString('en-US', { maximumFractionDigits: 2 })}T`;
        document.getElementById('largest-loan-detail').textContent = 'May 2026 credit extended';
    }

    function createValueCell(current, prior) {
        const td = document.createElement('td');
        const value = document.createElement('span');
        value.className = 'matrix-value';
        value.textContent = current.toFixed(2);
        const change = yoy(current, prior);
        const yoyText = document.createElement('span');
        yoyText.className = `matrix-yoy ${change >= 0 ? 'return-positive' : 'return-negative'}`;
        yoyText.textContent = formatYoy(change);
        td.append(value, yoyText);
        return td;
    }

    function renderMatrix() {
        const tbody = document.getElementById('fundamental-table-body');
        const fragment = document.createDocumentFragment();

        banks.forEach(bank => {
            const creditRow = document.createElement('tr');
            const bankCell = document.createElement('td');
            bankCell.rowSpan = 2;
            bankCell.className = 'bank-name';
            bankCell.textContent = `${bank.name} (${bank.code})`;
            const creditMetric = document.createElement('td');
            creditMetric.className = 'metric-name';
            creditMetric.textContent = 'Credit extended';
            creditRow.append(bankCell, creditMetric);
            data2026.credit[bank.code].forEach((value, index) => creditRow.append(createValueCell(value, data2025.credit[bank.code][index])));

            const profitRow = document.createElement('tr');
            const profitMetric = document.createElement('td');
            profitMetric.className = 'metric-name';
            profitMetric.textContent = 'Current-period net profit';
            profitRow.append(profitMetric);
            data2026.profit[bank.code].forEach((value, index) => profitRow.append(createValueCell(value, data2025.profit[bank.code][index])));

            fragment.append(creditRow, profitRow);
        });

        tbody.replaceChildren(fragment);
    }

    function activateTab(button) {
        const tabName = button.dataset.tab;
        document.querySelectorAll('.tab-button').forEach(tab => {
            const active = tab === button;
            tab.classList.toggle('is-active', active);
            tab.setAttribute('aria-selected', String(active));
        });
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.hidden = panel.id !== `panel-${tabName}`;
        });
        history.replaceState(null, '', `#${tabName}`);
    }

    function handleTabKeys(event) {
        if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
        const tabs = [...document.querySelectorAll('.tab-button')];
        const current = tabs.indexOf(event.currentTarget);
        let next = current;
        if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        event.preventDefault();
        tabs[next].focus();
        activateTab(tabs[next]);
    }

    function initTabs() {
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => activateTab(button));
            button.addEventListener('keydown', handleTabKeys);
        });
        const requested = location.hash.replace('#', '');
        const matching = [...document.querySelectorAll('.tab-button')].find(button => button.dataset.tab === requested);
        if (matching) activateTab(matching);
    }

    function init() {
        document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
        document.getElementById('bank-filter').addEventListener('click', selectBank);
        renderSummary();
        renderFilters();
        renderMatrix();
        initTabs();
        renderCharts();
    }

    init();
})();
