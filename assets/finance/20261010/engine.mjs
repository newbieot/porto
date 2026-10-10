export const sum=(a,fn=x=>x)=>a.reduce((s,x)=>s+fn(x),0);
export const iso=d=>d.toISOString().slice(0,10);
export const date=s=>new Date(s+'T00:00:00Z');
export const addDays=(s,n)=>iso(new Date(+date(s)+n*86400000));
export const monthEnd=s=>iso(new Date(Date.UTC(+s.slice(0,4),+s.slice(5,7),0)));
export function shiftMonth(s,n){const d=date(s),v=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+n,1));return iso(new Date(Date.UTC(v.getUTCFullYear(),v.getUTCMonth(),Math.min(d.getUTCDate(),+monthEnd(iso(v)).slice(8)))));}
export const shiftYear=(s,n)=>shiftMonth(s,n*12);
export const pct=(now,before)=>before>0?(now-before)/before:null;
export function previousPeriod(start,end){if(start.slice(8)==='01'&&start.slice(0,7)===end.slice(0,7))return {start:shiftMonth(start,-1),end:end===monthEnd(end)?addDays(start,-1):shiftMonth(end,-1)};const days=(date(end)-date(start))/86400000+1;return {start:addDays(start,-days),end:addDays(start,-1)};}
export const KINDS={income:'Pendapatan',expense:'Belanja',transfer:'Transfer internal',investmentBuy:'Pembelian investasi',investmentSell:'Penjualan aset / pokok',loanIn:'Pencairan utang',loanOut:'Pemberian pinjaman',repayment:'Pembayaran pokok',collection:'Pengembalian pokok',interest:'Bunga / biaya',dividend:'Dividen tercatat',realized:'Hasil investasi tercatat',refund:'Refund / reimbursement',prepaidPayment:'Pembayaran sewa di muka',accrualExpense:'Beban nonkas',accrualIncome:'Pendapatan nonkas',accrualOffset:'Jurnal pengimbang',opening:'Saldo awal',adjustment:'Penyesuaian / valuasi',review:'Perlu klasifikasi',excluded:'Dikecualikan'};
const incomes=new Set(['Salary','Award','Other Income','Collect Interest','Rent Income','Gifts','Hasil Investasi','Hasil Trading']);
const expenses=new Set(['Family','Belanja Bulanan','Jajan/Makan','Makan Weekend','Petrol','Water Bill','Electricity Bill','Internet Bill','Bills & Utilities','Rentals','Phone Bill','Vehicle Maintenance','Fees & Charges','Other Expense','Travel','Transportation','Business','Gifts & Donations','Shopping','Children & Babies','Friends & Lover','Entertainment','Minus Trading','Doctor','Parking Fees','Clothing','Food & Beverage','Health & Fitness','Education']);
export const isCash=(account,c)=>c.accounts.find(a=>a.name===account)?.cashFlow===true;
function matches(t,rule){return (!rule.category||t.category===rule.category)&&(!rule.account||t.account===rule.account)&&(!rule.noteIncludes||t.note.toLowerCase().includes(rule.noteIncludes.toLowerCase()))&&(!rule.start||t.date>=rule.start)&&(!rule.end||t.date<=rule.end)&&(!Number.isSafeInteger(rule.amount)||t.amount===rule.amount);}
export function classify(t,c){
  const override=c.overrides?.[t.uid],rule=c.rules?.find(r=>matches(t,r));
  let kind=override?.kind||rule?.kind,reason=override?'Koreksi pemilik':rule?.reason||'Kategori sumber';
  if(!kind){
    if(/^adjust balance|floating gain|floating loss|^rekon$/i.test(t.note))kind='adjustment';
    else if(t.category==='Saldo Awal')kind='opening';
    else if(['Incoming transfer','Outgoing transfer','Withdrawal'].includes(t.category))kind='transfer';
    else if(t.category==='Debt')kind='loanIn';else if(t.category==='Loan')kind='loanOut';else if(t.category==='Repayment')kind='repayment';else if(t.category==='Debt Collection')kind='collection';
    else if(t.excluded)kind='excluded';
    else if(t.category==='Selling')kind=/capital gain/i.test(t.note)?'realized':'investmentSell';
    else if(t.category==='Hasil Investasi')kind=/dividen/i.test(t.note)||t.account==='Saham Stockbit'?'dividend':'realized';
    else if(t.category==='Hasil Trading')kind='realized';
    else if(t.category==='Fees & Charges')kind='interest';
    else if(incomes.has(t.category)&&t.amount>=0)kind='income';
    else if(expenses.has(t.category)&&t.amount<=0)kind='expense';
    else kind='review';
  }
  let accounting=0;
  if(['income','expense','interest','dividend','realized','accrualExpense','accrualIncome'].includes(kind))accounting=t.amount;
  // Refund is a reversal only after a real original expense has been linked.
  if(kind==='refund'&&override?.originalUid)accounting=t.amount;
  const noncash=['accrualExpense','accrualIncome','accrualOffset','opening','adjustment'];
  const cash=isCash(t.account,c)&&!noncash.includes(kind)?t.amount:0;
  return {...t,kind,reason,accounting,cash,review:kind==='review'||kind==='refund'&&!override?.originalUid||kind==='investmentSell'&&!override,originalUid:override?.originalUid||null};
}
export function ledger(rows,c){return rows.map(t=>classify(t,c));}
export const select=(rows,start,end,account='')=>rows.filter(t=>t.date>=start&&t.date<=end&&(!account||t.account===account));
export function aggregate(rows){
  let income=0,expense=0,cashIn=0,cashOut=0,noncashIncome=0,noncashExpense=0,review=0;
  for(const t of rows){if(t.kind==='refund'&&t.originalUid)expense-=t.accounting;else{income+=Math.max(0,t.accounting);expense+=Math.max(0,-t.accounting);}cashIn+=Math.max(t.cash,0);cashOut+=Math.max(-t.cash,0);if(t.kind==='accrualIncome')noncashIncome+=t.accounting;if(t.kind==='accrualExpense')noncashExpense-=t.accounting;if(t.review)review++;}
  // Cash transfers can inflate gross legs; net remains exact. Gross is not labeled operational income.
  return {income,expense,net:income-expense,savingRate:income>0?(income-expense)/income:null,cashIn,cashOut,cashNet:cashIn-cashOut,noncashIncome,noncashExpense,review,count:rows.length};
}
export function periodKey(s,group='monthly',weekStart=1){const d=date(s);if(group==='weekly')return addDays(s,-((d.getUTCDay()-weekStart+7)%7));if(group==='yearly')return s.slice(0,4);if(group==='quarterly')return s.slice(0,4)+'-Q'+Math.ceil(+s.slice(5,7)/3);return s.slice(0,7);}
export function grouped(rows,start,end,group='monthly',weekStart=1){
  const groups=new Map();for(let day=start;day<=end;day=addDays(day,1)){const k=periodKey(day,group,weekStart);if(!groups.has(k))groups.set(k,{period:k,start:day,end:day,rows:[]});else groups.get(k).end=day;}
  for(const t of rows){if(t.date<start||t.date>end)continue;groups.get(periodKey(t.date,group,weekStart))?.rows.push(t);}
  return [...groups.values()].map(g=>({...g,...aggregate(g.rows)}));
}
export function categories(rows,kind='expense'){const m=new Map();for(const t of rows){let amount=kind==='income'?Math.max(t.accounting,0):Math.max(-t.accounting,0);if(kind==='expense'&&t.kind==='refund'&&t.originalUid)amount=-t.accounting;if(amount)m.set(t.category,(m.get(t.category)||0)+amount);}return [...m].map(([category,amount])=>({category,amount})).sort((a,b)=>b.amount-a.amount);}
export function compare(rows,start,end,coverage,account=''){return [0,-1,-2].map(n=>{const from=shiftYear(start,n),to=shiftYear(end,n),covered=from>=coverage.start&&to<=coverage.end;return {year:+end.slice(0,4)+n,start:from,end:to,covered,...(covered?aggregate(select(rows,from,to,account)):{income:null,expense:null,net:null,savingRate:null})};});}
export function moneyProduct(quantity,price){if(price===null||!Number.isFinite(price))return null;const s=String(quantity);if(!/^\d+(\.\d{1,8})?$/.test(s))throw new Error('Jumlah BTC maksimal 8 desimal');const [a,b='']=s.split('.');const sats=BigInt(a)*100000000n+BigInt(b.padEnd(8,'0'));return Number((sats*BigInt(Math.round(price))+50000000n)/100000000n);}
export function position(c,market={},family=false){
  const a=c.accounts,liquid=sum(a.filter(x=>x.liquid),x=>x.balance),cash=sum(a.filter(x=>x.cashFlow&&x.kind!=='deposit'),x=>x.balance),book=sum(a,x=>x.balance);
  const financialLiabilities=sum(c.liabilities.filter(x=>x.kind!=='deferred'),x=>x.amount),deferred=sum(c.liabilities.filter(x=>x.kind==='deferred'),x=>x.amount),custody=sum(c.liabilities.filter(x=>x.kind==='custody'),x=>x.amount);
  const prepaid=sum(c.prepaids,x=>x.balance),receivable=sum(c.receivables,x=>x.amount),property=c.property.value;
  const stocks=a.find(x=>x.kind==='stock')?.balance||0,crypto=a.find(x=>x.kind==='crypto')?.balance||0;
  const code=s=>String(s).replace(/\.JK$/,'');
  const holdingValues=c.holdings.filter(x=>family||x.beneficiary==='personal').map(h=>({ ...h,price:market.holdings?.find(p=>code(p.symbol||p.code)===code(h.symbol))?.currentPrice??null}));
  const stockMarket=holdingValues.every(h=>Number.isFinite(h.price))?sum(holdingValues,h=>h.shares*h.price):null;
  const childCost=family?sum(c.holdings.filter(x=>x.beneficiary!=='personal'),x=>x.cost||0):0,childCostMissing=family&&c.holdings.some(x=>x.beneficiary!=='personal'&&x.cost===null);
  const btcMarket=moneyProduct(c.btcQuantity,market.btcIdr??null),marketComplete=stockMarket!==null&&btcMarket!==null;
  const liabilities=financialLiabilities+deferred,nl=liquid-financialLiabilities;
  return {liquid,cash,book,financialLiabilities,deferred,custody,prepaid,receivable,property,stocks,crypto,stockMarket,btcMarket,marketComplete,childCostMissing,holdings:holdingValues,nl,
    bookWorth:childCostMissing?null:book+childCost+prepaid+receivable+(property||0)-liabilities,
    marketWorth:marketComplete?book-stocks-crypto+stockMarket+btcMarket+prepaid+receivable+(property||0)-liabilities:null,
    financialAssetsMarket:marketComplete?book-stocks-crypto+stockMarket+btcMarket:null,liabilities,propertyMissing:property===null};
}
export function reconciliation(rows,c){
  const bal=new Map();for(const t of rows)if(t.date<=c.asOf)bal.set(t.account,(bal.get(t.account)||0)+t.amount);
  return c.accounts.map(a=>({name:a.name,recorded:bal.get(a.name)||0,confirmed:a.balance,difference:a.balance-(bal.get(a.name)||0)}));
}
export function amortization(schedule){let balance=schedule.principal;const amounts=schedule.amounts||Array.from({length:schedule.months},(_,i)=>Math.floor(schedule.principal/schedule.months)+(i<schedule.principal%schedule.months?1:0));return amounts.map((amount,i)=>{balance-=amount;return {date:shiftMonth(schedule.start,i),amount,balance};});}
export function challenge(c,month=c.asOf.slice(0,7),snapshots=[]){const targets=c.challenges.find(x=>x.month===month);if(!targets)return null;const p=position(c),closed=snapshots.find(s=>s.closed&&s.asOf===monthEnd(month+'-01')),current=month===c.asOf.slice(0,7)?p.nl:closed?.nl??null;return {...targets,current,gap:current===null?null:current-targets.gold,days:Math.max(0,(date(monthEnd(month+'-01'))-date(c.asOf))/86400000),status:current===null?'Belum ada snapshot':current>=targets.gold?'Ahead':'At Risk',final:!!closed,forecast:null};}
export function budget(c,rows,month){const plan=c.budgets.find(x=>x.month===month)||{month,amount:c.household.monthlyBudget,categories:[]};const actual=aggregate(rows.filter(t=>t.date.startsWith(month))).expense;const elapsed=month===c.asOf.slice(0,7)?+c.asOf.slice(8):+monthEnd(month+'-01').slice(8),days=+monthEnd(month+'-01').slice(8);return {...plan,actual,remaining:plan.amount-actual,utilization:plan.amount?actual/plan.amount:null,forecast:Math.round(actual/elapsed*days),forecastMethod:'Laju belanja harian tercatat, bukan komitmen tagihan'};}
export function carry(c){const x=c.carry,gross=Math.round(x.principal*x.grossRate),tax=Math.round(gross*x.taxRate),net=gross-tax-x.annualFees-Math.round(x.principal*x.borrowRate),p=position(c),debt=c.liabilities.find(l=>l.name===x.liabilityName),reserve=sum(c.liabilities.filter(l=>l.kind!=='deferred'&&l.name!==x.liabilityName),l=>l.amount),available=Math.max(0,p.cash-reserve);return {gross,tax,net,repayment:debt?.amount??0,available,coverage:debt?.amount?available/debt.amount:null,dueDate:debt?.dueDate||null};}
export function dividendSeries(rows){const map=new Map();for(const t of rows)if(t.kind==='dividend'){const year=t.date.slice(0,4);map.set(year,(map.get(year)||0)+t.amount);}return [...map].sort().map(([year,amount],i,a)=>({year,amount,yoy:i?pct(amount,a[i-1][1]):null}));}
export function insights(c,rows,market,range){const p=position(c,market),a=aggregate(select(rows,range.start,range.end)),recon=reconciliation(rows,c),gap=sum(recon,x=>x.difference),b=budget(c,rows,c.asOf.slice(0,7)),ch=challenge(c);const out=[];
  const add=(title,detail,action,confidence,tone='neutral')=>out.push({title,detail,action,confidence,tone});
  add('Uang yang bebas digunakan',`Aset likuid ${p.liquid} dikurangi kewajiban finansial ${p.financialLiabilities}; termasuk titipan kantor ${p.custody}.`,`Pisahkan rekening dana titipan dan lengkapi jadwal setornya.`, 'Snapshot pemilik · provisional','positive');
  if(gap||recon.some(x=>x.difference))add('Ledger dan saldo perlu dicocokkan',`Selisih total ${gap}; ${recon.filter(x=>x.difference).length} rekening belum cocok.`,`Ekspor Money Lover dengan transaksi yang dikecualikan dari laporan, lalu rekonsiliasi.`, 'Tinggi · perbandingan dua sumber','warning');
  if(ch)add('Posisi terhadap target Gold',`Selisih saat ini ${ch.gap??0}. Pencapaian final baru dinilai pada penutupan bulan.`,`Jaga ruang likuiditas; hindari memasukkan uang muka kantor yang belum kembali.`, 'Provisional · tanggal snapshot',ch.gap>=0?'positive':'warning');
  add('Belanja dan kebutuhan keluarga',`Belanja bulan ini ${b.actual} dari rencana ${b.amount}; sisa ${b.remaining}.`,`Tinjau kategori terbesar sebelum mengurangi kebutuhan kesehatan, anak, atau keluarga.`, 'Sedang · kategori ledger','neutral');
  if(a.noncashIncome||a.noncashExpense)add('Surplus bukan seluruhnya uang baru',`Pendapatan nonkas ${a.noncashIncome}; beban nonkas ${a.noncashExpense}.`,`Gunakan cash flow untuk kemampuan bayar dan net income untuk biaya periode.`, 'Tinggi · aturan akrual pemilik');
  const due=c.liabilities.filter(x=>x.kind!=='deferred'&&!x.dueDate);if(due.length)add('Jadwal pembayaran belum lengkap',`${due.length} kewajiban belum memiliki tanggal jatuh tempo.`,`Isi tanggal dan bunga; urutan pelunasan belum dapat ditentukan dengan andal.`, 'Tinggi · field kosong','warning');
  if(p.stockMarket!==null&&p.financialAssetsMarket)add('Konsentrasi aset',`${Math.round(p.stockMarket/p.financialAssetsMarket*100)}% aset finansial terukur berada pada saham.`,`Pantau likuiditas dan fundamental bank bersama kebutuhan keluarga; jangan menjual hanya karena target bulanan.`, 'Sedang · harga bertanggal');
  const prev=previousPeriod(range.start,range.end),pa=aggregate(select(rows,prev.start,prev.end));if(pa.expense>0)add('Perubahan kebiasaan belanja',`Belanja ${Math.round((a.expense-pa.expense)/pa.expense*100)}% dibanding periode sebelumnya yang setara.`,`Buka kategori dan transaksi terbesar untuk membedakan kebutuhan sekali waktu dan kebiasaan berulang.`, 'Sedang · perbandingan periode');
  return out;
}
