
(() => {
'use strict';
const months=['January','February','March','April','May','June','July'];
const banks=[
 {code:'BMRI',name:'PT Bank Mandiri (Persero) Tbk'},
 {code:'BBCA',name:'PT Bank Central Asia Tbk'},
 {code:'BBNI',name:'PT Bank Negara Indonesia (Persero) Tbk'},
 {code:'BNGA',name:'PT Bank CIMB Niaga Tbk'},
 {code:'NISP',name:'PT Bank OCBC NISP Tbk'}
];
const data2025={
 credit:{
  BMRI:[1307.18,1307.64,1303.27,1308.44,1309.68,1327.536899,1336.592992],
  BBCA:[893.03,900.66,930.13,923.10,924.26,929.538706,923.512447],
  BBNI:[749.82,741.99,750.42,757.58,755.45,763.256772,null],
  BNGA:[155.31,157.13,160.11,160.20,161.20,161.591107,null],
  NISP:[158.23,161.03,162.31,162.32,158.35,165.847932,null]
 },
 profit:{
  BMRI:[4.01,7.59,11.63,15.19,19.65,22.801127,26.584511],
  BBCA:[4.73,8.98,14.15,20.21,25.16,29.890278,34.707591],
  BBNI:[1.63,3.29,5.38,6.87,8.45,10.140022,null],
  BNGA:[0.36,0.73,1.63,2.26,2.74,3.355858,null],
  NISP:[0.42,0.83,1.29,1.71,2.13,2.566129,null]
 }
};
const data2026={
 credit:{
  BMRI:[1511.41,1513.07,1530.16,1550.18,1579.94,1591.678057,1595.847870],
  BBCA:[948.96,953.22,980.59,965.02,969.10,1003.728384,1000.882825],
  BBNI:[894.29,882.22,903.34,919.50,940.88,952.842960,null],
  BNGA:[165.19,167.61,171.76,171.40,175.09,181.885583,null],
  NISP:[160.38,162.11,170.56,163.87,168.69,184.766903,null]
 },
 profit:{
  BMRI:[4.65,8.86,13.58,18.05,23.32,28.512231,33.014553],
  BBCA:[5.00,9.23,14.69,20.82,25.68,30.191956,35.252398],
  BBNI:[1.69,3.42,5.65,7.29,9.05,10.907257,null],
  BNGA:[0.58,1.07,1.73,2.28,2.71,3.190910,null],
  NISP:[0.44,0.86,1.36,1.82,2.26,2.730119,null]
 }
};
const state={selectedBank:'BBCA',creditChart:null,profitChart:null};
function setTheme(theme){
 document.documentElement.dataset.theme=theme; localStorage.setItem('idx-theme',theme);
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#090f1a':'#f4f7fb');
 renderCharts();
}
document.documentElement.dataset.theme=localStorage.getItem('idx-theme')||'light';
function growth(c,p){return Number.isFinite(c)&&Number.isFinite(p)&&p!==0?((c-p)/p)*100:null}
function formatGrowth(v){if(!Number.isFinite(v))return 'Comparison unavailable';return `${v>=0?'+':''}${v.toLocaleString('id-ID',{minimumFractionDigits:1,maximumFractionDigits:1})}% YoY`}
function selected(metric,year){return year[metric][state.selectedBank]}
function chartOptions(){
 const css=getComputedStyle(document.documentElement);const text=css.getPropertyValue('--text').trim(),muted=css.getPropertyValue('--muted').trim(),border=css.getPropertyValue('--border').trim(),panel=css.getPropertyValue('--panel').trim();
 return {responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'bottom',labels:{color:muted,usePointStyle:true,boxWidth:7}},
 tooltip:{backgroundColor:panel,titleColor:text,bodyColor:muted,borderColor:border,borderWidth:1,callbacks:{label:c=>`${c.dataset.label}: Rp${Number(c.raw).toLocaleString('id-ID',{maximumFractionDigits:2})} T`}}},
 scales:{x:{grid:{display:false},ticks:{color:muted}},y:{grid:{color:border},ticks:{color:muted,callback:v=>`${v} T`}}}}
}
function renderCharts(){
 if(!window.Chart)return;
 const c25=selected('credit',data2025),c26=selected('credit',data2026),p25=selected('profit',data2025),p26=selected('profit',data2026);
 state.creditChart?.destroy(); state.profitChart?.destroy();
 state.creditChart=new Chart(document.getElementById('credit-chart'),{type:'bar',data:{labels:months,datasets:[
  {label:`${state.selectedBank} 2025`,data:c25,backgroundColor:'rgba(93,143,242,.28)',borderColor:'#5d8ff2',borderWidth:1,borderRadius:6},
  {label:`${state.selectedBank} 2026`,data:c26,backgroundColor:'#5d8ff2',borderColor:'#5d8ff2',borderWidth:1,borderRadius:6}]},options:chartOptions()});
 state.profitChart=new Chart(document.getElementById('profit-chart'),{type:'bar',data:{labels:months,datasets:[
  {label:`${state.selectedBank} 2025`,data:p25,backgroundColor:'rgba(32,201,138,.26)',borderColor:'#20c98a',borderWidth:1,borderRadius:6},
  {label:`${state.selectedBank} 2026`,data:p26,backgroundColor:'#20c98a',borderColor:'#20c98a',borderWidth:1,borderRadius:6}]},options:chartOptions()});
 const note=document.getElementById('coverage-note');
 const notes={
  BBCA:'BBCA and BMRI are available through July 2026; this chart uses the bank-individual monthly series already maintained by the site.',
  BMRI:'BBCA and BMRI are available through July 2026; this chart uses the bank-individual monthly series already maintained by the site.',
  BBNI:'BBNI is available through June 2026; July is intentionally left blank until a comparable monthly report is added.',
  BNGA:'BNGA is available through June 2026; July is intentionally left blank until a comparable monthly report is added.',
  NISP:'NISP is available through June 2026; July is intentionally left blank until a comparable monthly report is added.'
 }; if(note)note.textContent=notes[state.selectedBank];
}
function renderFilters(){
 const el=document.getElementById('bank-filter'); if(!el)return;
 el.innerHTML=banks.map(b=>`<button type="button" data-bank="${b.code}" class="${b.code===state.selectedBank?'is-active':''}" aria-pressed="${b.code===state.selectedBank}">${b.code}</button>`).join('');
}
function createCell(cur,prior){
 if(!Number.isFinite(cur))return `<td class="matrix-pending"><span class="matrix-value">—</span><span class="matrix-yoy">Report unavailable</span></td>`;
 const g=growth(cur,prior),klass=Number.isFinite(g)?(g>=0?'return-positive':'return-negative'):'';
 return `<td><span class="matrix-value">${cur.toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2})}</span><span class="matrix-yoy ${klass}">${formatGrowth(g)}</span></td>`;
}
function renderMatrix(){
 const tbody=document.getElementById('fundamental-table-body'); if(!tbody)return;
 tbody.innerHTML=banks.map(b=>{
  const c=data2026.credit[b.code].map((v,i)=>createCell(v,data2025.credit[b.code][i])).join('');
  const p=data2026.profit[b.code].map((v,i)=>createCell(v,data2025.profit[b.code][i])).join('');
  return `<tr><td rowspan="2" class="bank-name">${b.code}<span class="sub">${b.name}</span></td><td>Loans</td>${c}</tr>
  <tr><td>YTD net profit</td>${p}</tr>`;
 }).join('');
}
document.getElementById('theme-toggle')?.addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
document.getElementById('bank-filter')?.addEventListener('click',e=>{const b=e.target.closest('[data-bank]');if(!b)return;state.selectedBank=b.dataset.bank;renderFilters();renderCharts()});
renderFilters();renderMatrix();renderCharts();
})();
