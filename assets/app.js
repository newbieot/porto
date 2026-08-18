(() => {
    'use strict';

    const DATA_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSGDMnOz1BMqtSnIkMxUpBDaqr7xsZdVmL8grhHQ5HWtJ0waZyoY_XfzrrKPtRX6M4bYnZ3x1HwfJUE/pub?gid=247687098&single=true&output=csv';

    const allocation = [
        { code: 'B***', label: 'Bank *****', value: 32.6, color: '#f97316' },
        { code: 'B***', label: 'Bank *****', value: 21.9, color: '#eab308' },
        { code: 'B***', label: 'Bank *****', value: 17.9, color: '#3b82f6' },
        { code: 'B***', label: 'Bank *****', value: 17.1, color: '#ef4444' },
        { code: 'N***', label: 'Bank *****', value: 10.5, color: '#06b6d4' }
    ];

    const state = {
        records: [],
        range: 'all',
        performanceChart: null,
        allocationChart: null,
        loading: false
    };

    const els = {
        syncPill: document.getElementById('sync-pill'),
        syncLabel: document.getElementById('sync-label'),
        latestDate: document.getElementById('latest-date'),
        latestDetail: document.getElementById('latest-detail'),
        refreshButton: document.getElementById('refresh-data'),
        net: document.getElementById('val-net-pct'),
        floating: document.getElementById('val-floating-pct'),
        floatingCard: document.getElementById('floating-card'),
        versus: document.getElementById('val-vs-ihsg'),
        records: document.getElementById('val-records'),
        recordPeriod: document.getElementById('record-period'),
        statsBody: document.getElementById('key-stats-body'),
        performanceLoading: document.getElementById('performance-loading'),
        rangeControl: document.getElementById('range-control'),
        themeToggle: document.getElementById('theme-toggle'),
        historyToggle: document.getElementById('history-toggle'),
        eventList: document.getElementById('event-list'),
        toast: document.getElementById('toast')
    };

    function cssVar(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    function showToast(message) {
        els.toast.textContent = message;
        els.toast.classList.add('is-visible');
        window.clearTimeout(showToast.timer);
        showToast.timer = window.setTimeout(() => els.toast.classList.remove('is-visible'), 3000);
    }

    function setTheme(theme) {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem('idx-theme', theme);
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#080d18' : '#f3f6fb');
        if (state.records.length) renderCharts();
    }

    function toggleTheme() {
        setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    }

    function setStatus(type, label) {
        els.syncPill.classList.remove('is-loading', 'is-online', 'is-error');
        els.syncPill.classList.add(type);
        els.syncLabel.textContent = label;
    }

    function setLoading(isLoading) {
        state.loading = isLoading;
        els.refreshButton.disabled = isLoading;
        els.refreshButton.setAttribute('aria-busy', String(isLoading));
        if (isLoading) {
            setStatus('is-loading', 'Menghubungkan');
            els.performanceLoading.hidden = false;
        }
    }

    function parseCsv(text) {
        const rows = [];
        let row = [];
        let field = '';
        let quoted = false;

        for (let i = 0; i < text.length; i += 1) {
            const char = text[i];
            const next = text[i + 1];

            if (char === '"' && quoted && next === '"') {
                field += '"';
                i += 1;
            } else if (char === '"') {
                quoted = !quoted;
            } else if (char === ',' && !quoted) {
                row.push(field);
                field = '';
            } else if ((char === '\n' || char === '\r') && !quoted) {
                if (char === '\r' && next === '\n') i += 1;
                row.push(field);
                if (row.some(cell => cell.trim() !== '')) rows.push(row);
                row = [];
                field = '';
            } else {
                field += char;
            }
        }

        row.push(field);
        if (row.some(cell => cell.trim() !== '')) rows.push(row);
        return rows;
    }

    function parseNumber(value) {
        if (value === null || value === undefined) return 0;
        const cleaned = String(value).trim().replace(/%/g, '').replace(/\s/g, '');
        if (!cleaned) return 0;
        const normalized = cleaned.includes(',') && !cleaned.includes('.')
            ? cleaned.replace(',', '.')
            : cleaned.replace(/,/g, '');
        const number = Number.parseFloat(normalized);
        return Number.isFinite(number) ? number : 0;
    }

    function parseDate(value) {
        const raw = String(value || '').trim().split(' ')[0];
        const parts = raw.split(/[-/]/).map(part => Number.parseInt(part, 10));
        if (parts.length < 3 || parts.some(Number.isNaN)) return null;

        let year;
        let month;
        let day;
        if (String(raw.split(/[-/]/)[0]).length === 4) {
            [year, month, day] = parts;
        } else {
            [day, month, year] = parts;
            if (year < 100) year += 2000;
        }

        const date = new Date(year, month - 1, day);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function recordsFromCsv(text) {
        const rows = parseCsv(text);
        if (rows.length < 2) throw new Error('Google Sheet tidak mengembalikan baris yang dapat digunakan.');

        const records = rows.slice(1).map(row => {
            if (row.length < 6) return null;
            const date = parseDate(row[0]);
            const floating = parseNumber(row[4]);
            if (!date || String(row[4] ?? '').trim() === '') return null;
            return {
                date,
                ihsg: parseNumber(row[1]),
                sri: parseNumber(row[2]),
                idx30: parseNumber(row[3]),
                floating,
                net: parseNumber(row[5])
            };
        }).filter(Boolean);

        records.sort((a, b) => a.date - b.date);
        const unique = new Map(records.map(record => [record.date.toISOString().slice(0, 10), record]));
        const normalized = [...unique.values()];
        if (!normalized.length) throw new Error('Tidak ditemukan catatan portofolio yang valid.');
        return normalized;
    }

    async function fetchWithTimeout(url, timeoutMs = 15000) {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
            if (!response.ok) throw new Error(`Permintaan data gagal (${response.status}).`);
            return await response.text();
        } finally {
            window.clearTimeout(timeout);
        }
    }

    async function loadData({ silent = false } = {}) {
        if (state.loading) return;
        setLoading(true);
        if (!silent) els.latestDetail.textContent = 'Membaca kumpulan data portofolio yang dipublikasikan…';

        try {
            let text;
            let finalError;
            for (let attempt = 0; attempt < 2; attempt += 1) {
                try {
                    text = await fetchWithTimeout(DATA_URL);
                    break;
                } catch (error) {
                    finalError = error;
                    if (attempt === 0) await new Promise(resolve => window.setTimeout(resolve, 900));
                }
            }
            if (!text) throw finalError || new Error('Kumpulan data tidak dapat diambil.');

            state.records = recordsFromCsv(text);
            renderDashboard();
            setStatus('is-online', 'CSV langsung');
            els.performanceLoading.hidden = true;
            if (!silent) showToast('Data portofolio telah diperbarui.');
        } catch (error) {
            console.error(error);
            setStatus('is-error', 'Data tidak tersedia');
            els.latestDate.textContent = 'Tidak dapat terhubung';
            els.latestDetail.textContent = 'Periksa Google Sheet yang dipublikasikan atau coba kembali beberapa saat lagi.';
            els.performanceLoading.innerHTML = '<span></span>Data tidak tersedia — gunakan Segarkan data untuk mencoba kembali.';
            els.performanceLoading.hidden = false;
            if (!silent) showToast('Kumpulan data langsung tidak dapat dimuat.');
        } finally {
            state.loading = false;
            els.refreshButton.disabled = false;
            els.refreshButton.setAttribute('aria-busy', 'false');
        }
    }

    function formatPercent(value, { sign = true } = {}) {
        if (!Number.isFinite(value)) return '—';
        const prefix = sign && value > 0 ? '+' : '';
        return `${prefix}${value.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
    }

    function formatLongDate(date) {
        return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
    }

    function formatShortDate(date) {
        return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(date);
    }

    function setMetric(element, value, positiveClassTarget = null) {
        element.textContent = value;
        element.classList.add('is-loaded');
        if (positiveClassTarget) {
            positiveClassTarget.classList.toggle('metric-positive', Number.parseFloat(value) >= 0);
            positiveClassTarget.classList.toggle('metric-negative', Number.parseFloat(value) < 0);
        }
    }

    function renderDashboard() {
        const first = state.records[0];
        const latest = state.records[state.records.length - 1];
        const spread = latest.net - latest.ihsg;

        setMetric(els.net, formatPercent(latest.net), els.net.closest('.metric-card'));
        setMetric(els.floating, formatPercent(latest.floating), els.floatingCard);
        setMetric(els.versus, formatPercent(spread));
        els.versus.closest('.metric-card')?.classList.toggle('metric-positive', spread >= 0);
        els.versus.closest('.metric-card')?.classList.toggle('metric-negative', spread < 0);
        setMetric(els.records, new Intl.NumberFormat('id-ID').format(state.records.length));

        els.latestDate.textContent = formatLongDate(latest.date);
        els.latestDetail.textContent = `Nilai terakhir: bersih ${formatPercent(latest.net)} dan mengambang ${formatPercent(latest.floating)}.`;
        els.recordPeriod.textContent = `${formatLongDate(first.date)} – ${formatLongDate(latest.date)}`;

        renderAllocation();
        renderKeyStats();
        renderCharts();
    }

    function getThemeColors() {
        return {
            text: cssVar('--text'),
            soft: cssVar('--chart-tick'),
            grid: cssVar('--chart-grid'),
            panel: cssVar('--bg-elevated'),
            border: cssVar('--border')
        };
    }

    function getSelectedRecords() {
        if (state.range === 'all') return state.records;
        const count = Number.parseInt(state.range, 10);
        return state.records.slice(Math.max(0, state.records.length - count));
    }

    function rebase(values) {
        const base = values[0] || 0;
        return values.map(value => value - base);
    }

    function chartDataset(label, data, color, options = {}) {
        return {
            label,
            data,
            borderColor: color,
            backgroundColor: options.fill ? `${color}18` : color,
            borderWidth: options.width || 2,
            borderDash: options.dash || [],
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHitRadius: 12,
            tension: .2,
            fill: Boolean(options.fill),
            spanGaps: true
        };
    }

    function renderCharts() {
        if (!window.Chart || !state.records.length) return;
        renderPerformanceChart();
        renderAllocationChart();
    }

    function renderPerformanceChart() {
        const records = getSelectedRecords();
        const colors = getThemeColors();
        const labels = records.map(record => formatShortDate(record.date));
        const datasets = [
            chartDataset('Imbal hasil bersih', rebase(records.map(record => record.net)), '#20c98a', { fill: true, width: 2.6 }),
            chartDataset('Laba-rugi mengambang', rebase(records.map(record => record.floating)), '#f06472', { dash: [6, 5], width: 2.2 }),
            chartDataset('IHSG', rebase(records.map(record => record.ihsg)), '#5d8ff2', { width: 1.8 })
        ];

        if (records.some(record => record.sri !== 0)) datasets.push(chartDataset('SRI-KEHATI', rebase(records.map(record => record.sri)), '#ec68c5', { width: 1.7 }));
        if (records.some(record => record.idx30 !== 0)) datasets.push(chartDataset('IDX30', rebase(records.map(record => record.idx30)), '#27bbb5', { width: 1.7 }));

        state.performanceChart?.destroy();
        state.performanceChart = new Chart(document.getElementById('performance-chart'), {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                animation: { duration: 450 },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: colors.soft, usePointStyle: true, pointStyle: 'circle', boxWidth: 7, boxHeight: 7, padding: 18, font: { size: 11, weight: '600' } }
                    },
                    tooltip: {
                        backgroundColor: colors.panel,
                        titleColor: colors.text,
                        bodyColor: colors.soft,
                        borderColor: colors.border,
                        borderWidth: 1,
                        padding: 12,
                        callbacks: { label: context => `${context.dataset.label}: ${formatPercent(context.raw)}` }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: colors.soft, maxTicksLimit: window.innerWidth < 640 ? 5 : 11, font: { size: 10 } }, border: { display: false } },
                    y: { grid: { color: colors.grid }, ticks: { color: colors.soft, callback: value => `${Number(value).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`, font: { size: 10 } }, border: { display: false } }
                }
            }
        });
    }

    function renderAllocation() {
        const list = document.getElementById('allocation-list');
        list.replaceChildren(...allocation.map(item => {
            const row = document.createElement('div');
            row.className = 'allocation-row';

            const dot = document.createElement('span');
            dot.className = 'allocation-dot';
            dot.style.backgroundColor = item.color;

            const label = document.createElement('div');
            const code = document.createElement('strong');
            code.textContent = item.code;
            const description = document.createElement('span');
            description.textContent = item.label;
            label.append(code, description);

            const value = document.createElement('b');
            value.textContent = `${item.value.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
            row.append(dot, label, value);
            return row;
        }));
    }

    function renderAllocationChart() {
        if (!window.Chart) return;
        const colors = getThemeColors();
        state.allocationChart?.destroy();
        state.allocationChart = new Chart(document.getElementById('allocation-chart'), {
            type: 'doughnut',
            data: { labels: allocation.map(item => item.code), datasets: [{ data: allocation.map(item => item.value), backgroundColor: allocation.map(item => item.color), borderWidth: 0, hoverOffset: 4 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '76%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: colors.panel,
                        titleColor: colors.text,
                        bodyColor: colors.soft,
                        borderColor: colors.border,
                        borderWidth: 1,
                        callbacks: { label: context => `${context.label}: ${context.raw.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` }
                    }
                }
            }
        });
    }

    function calculateWindow(values, tradingDays) {
        const last = values.length - 1;
        const prior = last - tradingDays;
        if (prior < 0) return null;
        const start = values[prior];
        const end = values[last];
        if (!Number.isFinite(start) || !Number.isFinite(end) || (1 + start / 100) === 0) return null;
        return ((1 + end / 100) / (1 + start / 100) - 1) * 100;
    }

    function renderReturnCell(value) {
        const td = document.createElement('td');
        if (value === null || !Number.isFinite(value)) {
            td.textContent = '—';
            td.className = 'return-neutral';
        } else {
            td.textContent = formatPercent(value);
            td.className = value >= 0 ? 'return-positive' : 'return-negative';
        }
        return td;
    }

    function renderKeyStats() {
        const series = [
            { name: 'Imbal hasil bersih', key: 'net', color: '#20c98a' },
            { name: 'Laba-rugi mengambang', key: 'floating', color: '#f06472' },
            { name: 'IHSG', key: 'ihsg', color: '#5d8ff2' },
            { name: 'SRI-KEHATI', key: 'sri', color: '#ec68c5' },
            { name: 'IDX30', key: 'idx30', color: '#27bbb5' }
        ];

        const rows = series.filter(item => state.records.some(record => record[item.key] !== 0)).map(item => {
            const values = state.records.map(record => record[item.key]);
            const tr = document.createElement('tr');
            const name = document.createElement('td');
            name.className = 'indicator-cell';
            const dot = document.createElement('span');
            dot.className = 'series-dot';
            dot.style.backgroundColor = item.color;
            const label = document.createElement('span');
            label.textContent = item.name;
            name.append(dot, label);
            tr.append(
                name,
                renderReturnCell(calculateWindow(values, 1)),
                renderReturnCell(calculateWindow(values, 5)),
                renderReturnCell(calculateWindow(values, 21)),
                renderReturnCell(calculateWindow(values, 63)),
                renderReturnCell(values.at(-1))
            );
            return tr;
        });

        els.statsBody.replaceChildren(...rows);
    }

    function handleRangeClick(event) {
        const button = event.target.closest('button[data-range]');
        if (!button) return;
        state.range = button.dataset.range;
        els.rangeControl.querySelectorAll('button').forEach(item => {
            const active = item === button;
            item.classList.toggle('is-active', active);
            item.setAttribute('aria-pressed', String(active));
        });
        renderPerformanceChart();
    }

    function toggleHistory() {
        const expanded = els.historyToggle.getAttribute('aria-expanded') === 'true';
        els.historyToggle.setAttribute('aria-expanded', String(!expanded));
        els.historyToggle.textContent = expanded ? 'Tampilkan semua peristiwa' : 'Tampilkan lebih sedikit';
        els.eventList.classList.toggle('is-collapsed', expanded);
    }

    function init() {
        els.themeToggle.addEventListener('click', toggleTheme);
        els.refreshButton.addEventListener('click', () => loadData());
        els.rangeControl.addEventListener('click', handleRangeClick);
        els.historyToggle.addEventListener('click', toggleHistory);
        renderAllocation();

        if (!window.Chart) {
            setStatus('is-error', 'Pustaka grafik tidak tersedia');
            els.latestDate.textContent = 'Grafik tidak dapat dimulai';
            els.latestDetail.textContent = 'Segarkan halaman atau periksa sumber Chart.js eksternal.';
            return;
        }
        loadData({ silent: true });
    }

    init();
})();