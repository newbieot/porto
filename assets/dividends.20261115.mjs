import { calculateForecast, calculateScenarios } from './dividend-forecast-engine.mjs?v=20261115';

const $ = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
const decimal = value => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value);
const percent = value => value === null ? '—' : `${decimal(value * 100)}%`;
const compact = value => `Rp${decimal(value / 1e6)} jt`;
const date = value => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00+07:00`));
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const colors = { BBCA: '#749de8', BBNI: '#e5a25c', BMRI: '#55c4af', BNGA: '#e7818f', NISP: '#b49be0' };
const state = { scenario: 'base', basis: 'cost', payoutOverrides: {}, additional2026InterimDps: {}, fy2027InterimDps: {}, taxRate: 0 };
let snapshot, forecast, bankChart, scenarioChart;

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('idx-theme', theme); } catch {}
  $('theme-toggle').setAttribute('aria-label', theme === 'dark' ? 'Aktifkan tema terang' : 'Aktifkan tema gelap');
  if (forecast) renderCharts();
}
$('theme-toggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
setTheme(document.documentElement.dataset.theme);

function options() {
  return { scenario: state.scenario, q4Multiplier: state.q4Multiplier, payoutOverrides: state.payoutOverrides,
    additional2026InterimDps: state.additional2026InterimDps, fy2027InterimDps: state.fy2027InterimDps, taxRate: state.taxRate };
}
function interimOptions() {
  return { additional2026InterimDps: state.additional2026InterimDps, fy2027InterimDps: state.fy2027InterimDps, taxRate: state.taxRate };
}
function yieldValue(result) { return result[state.basis === 'cost' ? 'yieldOnCost' : 'yieldOnMarket']; }
function bankCell(row) {
  return `<div class="bank-cell"><span class="bank-initial" style="--bank-color:${colors[row.code]}">${esc(row.code.slice(0, 2))}</span><span><strong>${esc(row.code)}</strong><small>${row.lots} lot · ${new Intl.NumberFormat('id-ID').format(row.shares)} saham</small></span></div>`;
}
function isCustom() {
  return state.q4Multiplier !== undefined || Object.keys(state.payoutOverrides).length > 0;
}
function render() {
  forecast = calculateForecast(snapshot, options());
  const t = forecast.totals;
  const preset = snapshot.scenarios[state.scenario];
  const custom = isCustom();
  const label = `${preset.label}${custom ? ' · kustom' : ''}`;
  $('active-scenario').textContent = label;
  $('total-cash').textContent = money(t.calendar2027Cash);
  $('total-yield').textContent = percent(yieldValue(t));
  $('yield-label').textContent = state.basis === 'cost' ? 'Yield terhadap modal' : 'Yield terhadap nilai pasar';
  $('yield-denominator').textContent = state.basis === 'cost' ? `Modal ${money(t.capital)}` : `${money(t.marketValue)} · ${date(snapshot.marketDate)}`;
  $('other-yield').textContent = state.basis === 'cost' ? `${percent(t.yieldOnMarket)} terhadap nilai pasar ${date(snapshot.marketDate)}` : `${percent(t.yieldOnCost)} terhadap modal pembelian`;
  $('annual-total').textContent = money(t.annualCash);
  $('interim-total').textContent = money(t.known2026InterimAtCurrentHoldings + t.additional2026InterimCash);
  $('net-total').textContent = money(t.netCash);
  $('summary-note').textContent = t.fy2027InterimCash > 0
    ? `${money(t.remainingFY26Cash)} sisa FY2026 + ${money(t.fy2027InterimCash)} asumsi interim FY2027.`
    : `Sisa FY2026 setelah interim yang dimodelkan. Interim FY2027 belum diasumsikan.`;
  $('table-yield-label').textContent = state.basis === 'cost' ? 'Yield / modal' : 'Yield / pasar';
  $('bank-rows').innerHTML = forecast.rows.map(row => `<tr><td>${bankCell(row)}</td><td>${decimal(row.eps9m)}<small class="cell-sub">Payout ${percent(row.payout)}</small></td><td>Rp${decimal(row.estimatedFY26Dps)}</td><td>Rp${decimal(row.total2026InterimDps)}<small class="cell-sub">${decimal(row.known2026InterimDps)} + ${decimal(row.additional2026InterimDps)}</small></td><td>Rp${decimal(row.remainingFY26Dps + row.fy2027InterimDps)}<small class="cell-sub">${decimal(row.remainingFY26Dps)} + ${decimal(row.fy2027InterimDps)}</small></td><td>${money(row.calendar2027Cash)}</td><td class="yield-cell">${percent(yieldValue(row))}</td></tr>`).join('');
  $('bank-total').innerHTML = `<tr><td colspan="5">Total portofolio · ${label}</td><td>${money(t.calendar2027Cash)}</td><td class="yield-cell">${percent(yieldValue(t))}</td></tr>`;
  $('mobile-bank-rows').innerHTML = forecast.rows.map(row => `<article class="mobile-bank"><div class="mobile-bank-head">${bankCell(row)}<div><strong>${money(row.calendar2027Cash)}</strong><small>${percent(yieldValue(row))} / ${state.basis === 'cost' ? 'modal' : 'pasar'}</small></div></div><dl><div><dt>EPS 9M / payout</dt><dd>Rp${decimal(row.eps9m)} / ${percent(row.payout)}</dd></div><div><dt>DPS total FY2026 · estimasi</dt><dd>Rp${decimal(row.estimatedFY26Dps)}</dd></div><div><dt>Interim FY26 · sudah + tambahan</dt><dd>Rp${decimal(row.known2026InterimDps)} + ${decimal(row.additional2026InterimDps)}</dd></div><div><dt>DPS 2027 · sisa FY26 + interim FY27</dt><dd>Rp${decimal(row.remainingFY26Dps)} + ${decimal(row.fy2027InterimDps)}</dd></div></dl></article>`).join('');
  const adjustments = Object.values(state.additional2026InterimDps).filter(value => value > 0).length + Object.values(state.fy2027InterimDps).filter(value => value > 0).length;
  $('adjustment-count').textContent = adjustments ? `${adjustments} asumsi interim` : custom ? 'Asumsi kustom' : `Skenario ${preset.label.toLowerCase()}`;
  $('q4-output').textContent = `${Math.round(forecast.q4Multiplier * 100)}%`;
  if (forecast.warnings.length) {
    $('input-error').textContent = forecast.warnings.map(warning => warning.message).join(' ');
  } else $('input-error').textContent = '';
  renderCharts();
  renderInsights();
  const invalid = $('assumption-rows').querySelector('input:invalid');
  $('export-csv').disabled = Boolean(invalid);
  if (invalid) $('input-error').textContent = 'Ada angka tidak valid. Tampilan masih memakai asumsi valid sebelumnya; perbaiki input sebelum mengunduh.';
}
function renderCharts() {
  const scenarios = calculateScenarios(snapshot, interimOptions());
  $('scenario-values').innerHTML = scenarios.map(result => `<div>${esc(snapshot.scenarios[result.scenario].label)}<strong>${compact(result.totals.calendar2027Cash)}</strong><small>${percent(yieldValue(result.totals))} / ${state.basis === 'cost' ? 'modal' : 'pasar'}</small></div>`).join('');
  if (typeof window.Chart !== 'function') {
    for (const id of ['bank-chart', 'scenario-chart']) {
      const canvas = $(id);
      if (canvas && !canvas.parentElement.querySelector('.chart-unavailable')) {
        const p = document.createElement('p'); p.className = 'chart-unavailable'; p.textContent = 'Grafik belum tersedia. Nilai lengkap tetap tersedia pada rincian.';
        canvas.replaceWith(p);
      }
    }
    return;
  }
  const css = getComputedStyle(document.documentElement), muted = css.getPropertyValue('--muted').trim(), grid = css.getPropertyValue('--border').trim();
  const palette = document.documentElement.dataset.theme === 'dark' ? colors : { BBCA: '#4265ae', BBNI: '#ad6929', BMRI: '#217e6e', BNGA: '#b74959', NISP: '#7a5bab' };
  const chartOptions = (horizontal = false) => ({ responsive: true, maintainAspectRatio: false, animation: { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 250 }, indexAxis: horizontal ? 'y' : 'x',
    plugins: { legend: { display: false }, tooltip: { displayColors: false, callbacks: { label: item => money(horizontal ? item.parsed.x : item.parsed.y) } } },
    scales: { x: { beginAtZero: horizontal, grid: { color: horizontal ? grid : 'transparent', drawBorder: false }, border: { display: false }, ticks: { color: muted, font: { size: 10 }, ...(horizontal ? { callback: value => `${value / 1e6} jt` } : {}) } },
      y: { beginAtZero: !horizontal, grid: { color: horizontal ? 'transparent' : grid }, border: { display: false }, ticks: { color: muted, font: { size: horizontal ? 12 : 10 }, ...(!horizontal ? { callback: value => `${value / 1e6} jt` } : {}) } } } });
  if (bankChart) bankChart.destroy();
  if (scenarioChart) scenarioChart.destroy();
  bankChart = new window.Chart($('bank-chart'), { type: 'bar', data: { labels: forecast.rows.map(row => row.code), datasets: [{ data: forecast.rows.map(row => row.calendar2027Cash), backgroundColor: forecast.rows.map(row => palette[row.code]), borderRadius: 5, maxBarThickness: 21 }] }, options: chartOptions(true) });
  const scenarioColors = ['#8190aa', palette.BMRI, palette.BBCA];
  scenarioChart = new window.Chart($('scenario-chart'), { type: 'bar', data: { labels: scenarios.map(result => snapshot.scenarios[result.scenario].label), datasets: [{ data: scenarios.map(result => result.totals.calendar2027Cash), backgroundColor: scenarioColors, borderRadius: 5, maxBarThickness: 48 }] }, options: chartOptions() });
}
function renderInsights() {
  const t = forecast.totals;
  const biggest = [...forecast.rows].sort((a, b) => b.calendar2027Cash - a.calendar2027Cash).slice(0, 2);
  const share = t.calendar2027Cash > 0 ? biggest.reduce((total, row) => total + row.calendar2027Cash, 0) / t.calendar2027Cash : 0;
  const nisp = forecast.rows.find(row => row.code === 'NISP');
  const bnga = forecast.rows.find(row => row.code === 'BNGA');
  const change = bnga.estimatedFY26Dps / bnga.previousFY2025Dps - 1;
  $('forecast-insights').innerHTML = `<article class="insight-item" style="--insight-color:var(--dividend-accent)"><h3>${esc(biggest.map(row => row.code).join(' + '))} menyumbang ${percent(share)}</h3><p>Keduanya menghasilkan ${compact(biggest.reduce((total, row) => total + row.calendar2027Cash, 0))} dari estimasi kas. Perubahan payout kedua bank paling terasa pada penerimaan portofolio.</p></article><article class="insight-item" style="--insight-color:var(--dividend-blue)"><h3>NISP: payout menjadi faktor utama</h3><p>Asumsi payout ${percent(nisp.payout)} menghasilkan DPS FY2026 sekitar Rp${decimal(nisp.estimatedFY26Dps)}. Basis pembagian FY2025 adalah 20,42%; payout 50% dari periode lama tidak digunakan sebagai skenario dasar.</p></article><article class="insight-item" style="--insight-color:var(--dividend-cinnabar)"><h3>BNGA: gunakan laba bank individual</h3><p>Estimasi DPS total Rp${decimal(bnga.estimatedFY26Dps)} ${change < 0 ? 'lebih rendah' : 'lebih tinggi'} ${percent(Math.abs(change))} dari Rp161,77 untuk FY2025. EPS bank individual Rp167,97 dipakai agar selaras dengan dasar pembagian laba.</p></article>`;
}
function fillAssumptions() {
  const preset = snapshot.scenarios[state.scenario];
  $('q4-multiplier').value = (state.q4Multiplier ?? preset.q4Multiplier) * 100;
  $('assumption-rows').innerHTML = snapshot.positions.map(row => `<tr><td><strong>${esc(row.code)}</strong></td><td><input type="number" min="0" max="100" step="0.01" value="${Number(((state.payoutOverrides[row.code] ?? preset.payout[row.code]) * 100).toFixed(2))}" data-code="${esc(row.code)}" data-assumption="payout" aria-label="Payout ${esc(row.code)} dalam persen" required></td><td><input type="number" min="0" max="100000" step="0.01" value="${state.additional2026InterimDps[row.code] ?? 0}" data-code="${esc(row.code)}" data-assumption="additional" aria-label="Tambahan interim FY2026 ${esc(row.code)} dibayar 2026 rupiah per saham" required></td><td><input type="number" min="0" max="100000" step="0.01" value="${state.fy2027InterimDps[row.code] ?? 0}" data-code="${esc(row.code)}" data-assumption="next" aria-label="Interim FY2027 ${esc(row.code)} dibayar 2027 rupiah per saham" required></td></tr>`).join('');
}
function updateFromInputs() {
  const inputs = [...$('assumption-rows').querySelectorAll('input')];
  if (inputs.some(input => !input.validity.valid)) {
    $('input-error').textContent = 'Isi angka valid: payout 0–100%, interim 0–100.000 rupiah per saham, maksimal dua desimal. Tampilan masih memakai asumsi valid sebelumnya.';
    $('export-csv').disabled = true;
    return;
  }
  const preset = snapshot.scenarios[state.scenario];
  state.payoutOverrides = {};
  for (const input of inputs) {
    const code = input.dataset.code, value = Number(input.value);
    if (input.dataset.assumption === 'payout') {
      if (Math.abs(value / 100 - preset.payout[code]) > 1e-9) state.payoutOverrides[code] = value / 100;
    } else state[input.dataset.assumption === 'additional' ? 'additional2026InterimDps' : 'fy2027InterimDps'][code] = value;
  }
  const q4 = Number($('q4-multiplier').value) / 100;
  state.q4Multiplier = Math.abs(q4 - preset.q4Multiplier) > 1e-9 ? q4 : undefined;
  render();
}
function exportCsv() {
  const t = forecast.totals;
  const rows = [
    ['Proyeksi dividen, bukan transaksi aktual'], ['Estimasi per', snapshot.asOf], ['Posisi per', snapshot.positionsAsOf], ['Harga pasar per', snapshot.marketDate],
    ['Skenario', snapshot.scenarios[state.scenario].label, isCustom() ? 'Kustom' : 'Preset'], ['Faktor laba Q4', forecast.q4Multiplier], ['Basis yield', state.basis], ['Tarif pajak simulasi', state.taxRate],
    ['Bank', 'Saham', 'Modal IDR', 'Harga pasar IDR', 'EPS9M IDR', 'Payout', 'DPS total FY26 estimasi', 'Interim FY26 sudah', 'Tambahan interim FY26 dibayar2026', 'Sisa DPS FY26 dibayar2027', 'Interim FY27 dibayar2027', 'Kas kalender2027 bruto IDR', 'Kas simulasi net IDR', 'Yield modal', 'Yield pasar'],
    ...forecast.rows.map(r => [r.code, r.shares, r.invested, r.marketPrice, r.eps9m, r.payout, r.estimatedFY26Dps, r.known2026InterimDps, r.additional2026InterimDps, r.remainingFY26Dps, r.fy2027InterimDps, r.calendar2027Cash, r.netCash, r.yieldOnCost, r.yieldOnMarket]),
    ['TOTAL', '', t.capital, '', '', '', '', '', '', '', '', t.calendar2027Cash, t.netCash, t.yieldOnCost, t.yieldOnMarket],
    ...forecast.warnings.map(warning => ['Peringatan asumsi', warning.code, warning.message]),
    ['Catatan', 'Interim FY26 dialokasikan per saham pada posisi sekarang; bukan kas historis pemilik. Angka interim belum diumumkan bernilai 0 berarti belum diasumsikan. Semua estimasi bergantung hasil FY dan RUPS.']
  ];
  const csv = '\ufeff' + rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `proyeksi-dividen-2027-${state.scenario}-${snapshot.asOf}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function init() {
  const response = await fetch('/data/dividend-forecast-2027.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error('Input proyeksi belum dapat dimuat.');
  snapshot = await response.json();
  $('snapshot-date').textContent = `Estimasi ${date(snapshot.asOf)} · posisi ${date(snapshot.positionsAsOf)} · harga ${date(snapshot.marketDate)} (snapshot)`;
  $('position-date').textContent = `Posisi ${date(snapshot.positionsAsOf)}`;
  $('source-list').innerHTML = snapshot.sources.map(source => {
    const url = source.url ?? source.reviewedData;
    const title = esc(source.title ?? source.label);
    const safeUrl = url && /^(https:\/\/|\/data\/)/.test(url) ? url : null;
    return `<li>${safeUrl ? `<a href="${esc(safeUrl)}" target="_blank" rel="noopener noreferrer">${title}</a>` : title}${source.file ? `<small>${esc(source.file)}${source.page ? ` · halaman ${esc(source.page)}` : ''}</small>` : ''}${source.note ? `<small>${esc(source.note)}</small>` : ''}</li>`;
  }).join('');
  fillAssumptions();
  document.querySelectorAll('input[name="scenario"]').forEach(input => input.addEventListener('change', () => {
    state.scenario = input.value; state.q4Multiplier = undefined; state.payoutOverrides = {};
    fillAssumptions(); render();
  }));
  $('yield-basis').addEventListener('change', event => { state.basis = event.target.value; render(); });
  $('tax-simulation').addEventListener('change', event => { state.taxRate = event.target.checked ? 0.1 : 0; render(); });
  $('q4-multiplier').addEventListener('input', updateFromInputs);
  $('assumption-rows').addEventListener('input', updateFromInputs);
  $('reset-assumptions').addEventListener('click', () => {
    state.scenario = 'base'; state.q4Multiplier = undefined; state.payoutOverrides = {}; state.additional2026InterimDps = {}; state.fy2027InterimDps = {};
    document.querySelector('input[name="scenario"][value="base"]').checked = true;
    fillAssumptions(); render();
  });
  $('export-csv').addEventListener('click', exportCsv);
  $('forecast-content').hidden = false;
  render();
  $('load-status').hidden = true;
}
init().catch(error => { $('load-status').hidden = false; $('load-status').classList.add('is-error'); $('load-status').textContent = `${error.message} Muat ulang halaman untuk mencoba kembali.`; $('export-csv').disabled = true; });
