export const SPECIAL = new Set(['Incoming transfer', 'Outgoing transfer', 'Debt', 'Loan', 'Repayment', 'Debt Collection', 'Saldo Awal', 'Withdrawal']);
export const RECURRING = new Set(['Salary', 'Collect Interest', 'Rent Income']);
export const INVESTMENT_INCOME = new Set(['Collect Interest', 'Rent Income', 'Hasil Investasi', 'Hasil Trading']);
const dayMs = 86400000;
export const iso = d => d.toISOString().slice(0, 10);
export const date = s => new Date(`${s}T00:00:00Z`);
export const month = s => s.slice(0, 7);
export const addDays = (s, n) => iso(new Date(date(s).getTime() + n * dayMs));
export function shiftYear(s, years) {
  const [y,m,d] = s.split('-').map(Number);
  const last = new Date(Date.UTC(y+years,m,0)).getUTCDate();
  return iso(new Date(Date.UTC(y+years,m-1,Math.min(d,last))));
}
export function shiftMonth(s,n) {
  const d=date(s), day=d.getUTCDate();
  const start=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+n,1));
  const last=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0)).getUTCDate();
  return iso(new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth(),Math.min(day,last))));
}
export function parseCSV(text) {
  if (typeof text!=='string') throw new Error('CSV harus berupa teks.');
  text=text.replace(/^\uFEFF/,'');
  const rows=[]; let row=[],value='',quoted=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"') { if(quoted&&text[i+1]==='"'){value+='"';i++;} else if(quoted||value==='') quoted=!quoted; else value+=c; }
    else if(c===','&&!quoted){row.push(value);value='';}
    else if((c==='\n'||c==='\r')&&!quoted){row.push(value);value='';if(row.some(x=>x!==''))rows.push(row);row=[];if(c==='\r'&&text[i+1]==='\n')i++;}
    else value+=c;
  }
  if(quoted)throw new Error('Tanda kutip CSV tidak lengkap.');
  row.push(value);if(row.some(x=>x!==''))rows.push(row);
  const headers=rows.shift();
  const required=['ID','Note','Amount','Category','Account','Currency','Date','Event','Exclude Report'];
  if(!headers||required.some(h=>!headers.includes(h)))throw new Error('Format ekspor Money Lover tidak sesuai.');
  const col=Object.fromEntries(headers.map((h,i)=>[h,i]));
  return rows.map((r,i)=>{
    if(r.length!==headers.length)throw new Error(`Kolom tidak lengkap pada baris ${i+2}.`);
    const [d,m,y]=r[col.Date].split('/').map(Number);
    const stamp=iso(new Date(Date.UTC(y,m-1,d)));
    if(!y||!m||!d||stamp!==`${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`)throw new Error(`Tanggal tidak valid pada baris ${i+2}.`);
    const amount=Number(r[col.Amount]),flag=r[col['Exclude Report']].toLowerCase();
    if(!r[col.Amount].trim()||!Number.isSafeInteger(amount)||!['true','false'].includes(flag))throw new Error(`Nilai tidak valid pada baris ${i+2}.`);
    if(r[col.Currency]!=='IDR')throw new Error('Mata uang selain IDR memerlukan aturan konversi.');
    if(!r[col.Account]||!r[col.Category]||!r[col.ID])throw new Error(`Identitas transaksi kosong pada baris ${i+2}.`);
    return {id:r[col.ID],date:stamp,amount,category:r[col.Category],account:r[col.Account],note:r[col.Note],excluded:flag==='true'};
  });
}
export function role(t) {
  if(t.category==='Saldo Awal')return 'opening';
  if(['Incoming transfer','Outgoing transfer','Withdrawal'].includes(t.category))return 'transfer';
  if(['Debt','Loan','Repayment','Debt Collection'].includes(t.category))return 'debt';
  if(/^adjust balance/i.test(t.note))return 'adjustment';
  if(t.excluded)return 'excluded';
  return t.amount>=0?'income':'expense';
}
export function isEconomic(t, includeAdjustments=true) {
  return !t.excluded && !SPECIAL.has(t.category) && (includeAdjustments || !/^adjust balance/i.test(t.note));
}
export function select(transactions,start,end,accounts=[]) {
  return transactions.filter(t=>t.date>=start&&t.date<=end&&(!accounts.length||accounts.includes(t.account)));
}
export function aggregate(rows,{includeAdjustments=true}={}) {
  const economic=rows.filter(t=>isEconomic(t,includeAdjustments));
  const income=economic.reduce((s,t)=>s+Math.max(0,t.amount),0);
  const expense=economic.reduce((s,t)=>s+Math.max(0,-t.amount),0);
  return {income,expense,surplus:income-expense,savingsRate:income>0?(income-expense)/income:null,
    count:economic.length,investmentIncome:economic.filter(t=>INVESTMENT_INCOME.has(t.category)).reduce((s,t)=>s+Math.max(t.amount,0),0),
    recurringIncome:economic.filter(t=>RECURRING.has(t.category)).reduce((s,t)=>s+Math.max(t.amount,0),0),
    adjustments:economic.filter(t=>/^adjust balance/i.test(t.note)).length};
}
export const percentageChange=(now,before)=>before>0?(now-before)/before:null;
export function monthly(rows,start,end,options={}) {
  const groups=new Map();
  for(let key=start.slice(0,7);key<=end.slice(0,7);key=shiftMonth(`${key}-01`,1).slice(0,7))groups.set(key,[]);
  for(const t of rows){const k=month(t.date);if(groups.has(k))groups.get(k).push(t);}
  return [...groups].map(([period,items])=>({period,...aggregate(items,options)}));
}
export function categories(rows,kind,options={}) {
  const groups=new Map();
  for(const t of rows)if(isEconomic(t,options.includeAdjustments!==false)&&((kind==='income'&&t.amount>0)||(kind==='expense'&&t.amount<0))) {
    groups.set(t.category,(groups.get(t.category)||0)+Math.abs(t.amount));
  }
  return [...groups].map(([category,amount])=>({category,amount})).sort((a,b)=>b.amount-a.amount);
}
export function balances(rows,end) {
  const groups=new Map();
  for(const t of rows)if(t.date<=end)groups.set(t.account,(groups.get(t.account)||0)+t.amount);
  return [...groups].map(([account,amount])=>({account,amount})).sort((a,b)=>b.amount-a.amount);
}
export function comparablePeriods(data,start,end,accounts=[],options={}) {
  return [0,-1,-2].map(offset=>{
    const from=shiftYear(start,offset),to=shiftYear(end,offset);
    const covered=from>=data.coverage.start&&to<=data.coverage.end;
    return {year:Number(end.slice(0,4))+offset,start:from,end:to,covered,
      ...(covered?aggregate(select(data.transactions,from,to,accounts),options):{income:null,expense:null,surplus:null,savingsRate:null,count:0})};
  });
}
export function previousPeriod(start,end) {
  if(start.slice(8)==='01'&&start.slice(0,7)===end.slice(0,7))return previousMonthPeriod(start,end);
  const days=Math.round((date(end)-date(start))/dayMs)+1;
  return {start:addDays(start,-days),end:addDays(start,-1)};
}
export function previousMonthPeriod(start,end) {
  const fullMonth=start.slice(8)==='01'&&end===addDays(shiftMonth(start,1),-1);
  const from=shiftMonth(start,-1);
  return {start:from,end:fullMonth?addDays(start,-1):shiftMonth(end,-1)};
}
export function recentBaseline(data,accounts=[],options={},count=3) {
  const final=addDays(data.coverage.end.slice(0,7)+'-01',-1);
  const first=shiftMonth(final.slice(0,7)+'-01',-(count-1));
  const series=monthly(select(data.transactions,first,final,accounts),first,final,options);
  return {start:first,end:final,months:series.length,
    income:series.reduce((s,x)=>s+x.income,0)/series.length,
    recurringIncome:series.reduce((s,x)=>s+x.recurringIncome,0)/series.length,
    expense:series.reduce((s,x)=>s+x.expense,0)/series.length,series};
}
export function worth(data,market={},basis='market') {
  const wallets=balances(data.transactions,data.coverage.end);
  const bookAssets=wallets.reduce((s,w)=>s+w.amount,0);
  const stockBook=wallets.find(w=>w.account==='Saham Stockbit')?.amount||0;
  const btcBook=wallets.find(w=>w.account==='Bitcoin Tokocrypto')?.amount||0;
  const stockMarket=Number.isFinite(market.stockValue)?market.stockValue:null;
  const btcMarket=Number.isFinite(market.btcIdr)?Math.round(market.btcIdr*data.position.btcQuantity):null;
  const complete=stockMarket!==null&&btcMarket!==null;
  const assets=basis==='book'?bookAssets:complete?bookAssets-stockBook-btcBook+stockMarket+btcMarket:null;
  const payable=data.position.payables.reduce((s,p)=>s+p.amount,0);
  const receivable=data.position.receivables.reduce((s,p)=>s+p.amount,0);
  const cash=wallets.filter(w=>['Krom Bank','Neobank','Cash','Gopay','Pospay','BRI'].includes(w.account)).reduce((s,w)=>s+w.amount,0);
  return {assets,netWorth:assets===null?null:assets+receivable-payable,bookAssets,bookNetWorth:bookAssets+receivable-payable,
    payable,receivable,cash,stockBook,btcBook,stockMarket,btcMarket,complete,wallets};
}
export function historicalBalances(data,start,end) {
  const sorted=[...data.transactions].sort((a,b)=>a.date.localeCompare(b.date));
  let cursor=0,total=0; const result=[];
  for(let m=start.slice(0,7);m<=end.slice(0,7);m=shiftMonth(m+'-01',1).slice(0,7)) {
    const last=addDays(shiftMonth(m+'-01',1),-1),through=last<end?last:end;
    while(cursor<sorted.length&&sorted[cursor].date<=through){total+=sorted[cursor++].amount;}
    result.push({date:through,amount:total});
  }
  return result;
}
