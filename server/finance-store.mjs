import {parseCSV,importPlan,sha256,identify,parseDate} from '../assets/finance/20261010/csv.mjs';
import {position,monthEnd,KINDS,reconciliation} from '../assets/finance/20261010/engine.mjs';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'private, no-store'}});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const copy=x=>JSON.parse(JSON.stringify(x));
export function validateConfig(c){
  if(!c||typeof c!=='object'||Array.isArray(c))fail('Konfigurasi tidak valid.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(c.asOf||'')||!Number.isFinite(Date.parse(c.asOf)))fail('Tanggal posisi tidak valid.');
  try{parseDate(c.asOf);}catch{fail('Tanggal posisi tidak valid.');}
  for(const key of ['accounts','liabilities','receivables','prepaids','holdings','rules','budgets','challenges'])if(!Array.isArray(c[key])||c[key].length>500)fail(`Daftar ${key} tidak valid.`);
  if(!c.household||!c.retirement||!c.car||!c.carry||!c.property||!c.profile)fail('Domain pengaturan belum lengkap.');
  const money=(n,name,nullable=false)=>{if(nullable&&n===null)return;if(!Number.isSafeInteger(n)||n<0||n>1e14)fail(`${name} harus rupiah bulat nonnegatif.`);};
  const rate=(n,name,max=1)=>{if(!Number.isFinite(n)||n<0||n>max)fail(`${name} di luar rentang.`);};
  const names=new Set();for(const a of c.accounts){if(!a.name||names.has(a.name)||!['cash','bank','deposit','stock','crypto','investment'].includes(a.kind))fail('Nama / jenis rekening tidak valid atau ganda.');names.add(a.name);money(a.balance,'Saldo rekening');if(typeof a.liquid!=='boolean'||typeof a.cashFlow!=='boolean')fail('Status likuiditas harus boolean.');if(['stock','crypto','investment'].includes(a.kind)&&(a.liquid||a.cashFlow))fail('Investasi tidak boleh menjadi kas atau Net Liquidity.');}
  for(const l of c.liabilities){money(l.amount,'Kewajiban');if(!['personal','credit','custody','deferred','review'].includes(l.kind))fail('Jenis kewajiban tidak valid.');if(l.dueDate&&!/^\d{4}-\d{2}-\d{2}$/.test(l.dueDate))fail('Tanggal jatuh tempo tidak valid.');if(l.rate!==null)rate(l.rate,'Bunga utang',5);}
  for(const r of c.receivables)money(r.amount,'Piutang');
  for(const p of c.prepaids){money(p.balance,'Prepaid');money(p.principal,'Pokok prepaid');if(!Array.isArray(p.amounts)||p.amounts.some(v=>!Number.isSafeInteger(v)||v<0)||p.amounts.reduce((s,v)=>s+v,0)!==p.principal)fail('Jadwal amortisasi harus tepat sama dengan pokok.');if(p.balance>p.principal)fail('Prepaid melebihi pokok.');}
  for(const h of c.holdings){money(h.shares,'Jumlah saham');money(h.cost,'Modal saham',true);if(!['personal','child1','child2'].includes(h.beneficiary))fail('Penerima manfaat tidak valid.');}
  if(!/^\d+(\.\d{1,8})?$/.test(String(c.btcQuantity)))fail('Jumlah BTC tidak valid.');
  money(c.property.value,'Nilai properti',true);money(c.household.monthlyBudget,'Anggaran');money(c.household.batamMonthlyAccrual,'Akrual sewa');
  for(const e of c.household.employment)money(e.amount,'Pendapatan rutin');
  for(const b of c.budgets){money(b.amount,'Anggaran');for(const x of b.categories||[])money(x.amount,'Anggaran kategori');}
  for(const t of c.challenges){for(const k of ['bronze','silver','gold','platinum'])money(t[k],'Target');if(!(t.bronze<=t.silver&&t.silver<=t.gold&&t.gold<=t.platinum))fail('Urutan target challenge tidak valid.');}
  for(const r of c.rules)if(!KINDS[r.kind]||(!r.category&&!r.account&&!r.noteIncludes))fail('Aturan perlu kondisi dan klasifikasi yang valid.');
  for(const o of Object.values(c.overrides||{}))if(!KINDS[o.kind])fail('Koreksi klasifikasi tidak valid.');
  const p=c.retirement;if(!/^\d{4}-\d{2}$/.test(p.retirementMonth)||p.retirementMonth<c.asOf.slice(0,7)||p.retirementMonth>'2100-12')fail('Bulan pensiun tidak valid.');
  try{parseDate(p.retirementMonth+'-01');}catch{fail('Bulan pensiun tidak valid.');}
  if(!Array.isArray(p.contributions)||p.contributions.length>50)fail('Maksimal 50 periode kontribusi.');
  for(const l of c.liabilities)if(l.dueDate){try{parseDate(l.dueDate);}catch{fail('Tanggal jatuh tempo tidak valid.');}}
  if(c.weekStart!==undefined&&![0,1].includes(c.weekStart))fail('Awal minggu harus Minggu (0) atau Senin (1).');
  for(const k of ['feeRate','returnTaxRate','inflation','dividendYield','dividendTaxRate','drawdownRate'])rate(p[k],k);
  for(const k of ['target','todayExpense','monthlyWithdrawal','oneOffWithdrawal'])money(p[k],k);
  for(const x of p.contributions){money(x.monthly,'Kontribusi');if(!Number.isInteger(x.from)||!Number.isInteger(x.to)||x.to<x.from||x.from<1900||x.to>2100)fail('Periode kontribusi tidak valid.');}
  const years=new Set();for(const x of p.contributions)for(let y=x.from;y<=x.to;y++){if(years.has(y))fail('Periode kontribusi bertumpuk.');years.add(y);if(years.size>200)fail('Periode kontribusi terlalu panjang.');}
  for(const k of ['price','downPayment','operatingMonthly','annualInsurance','annualTax','annualMaintenance','minAssets','minLiquidity','minInvestment'])money(c.car[k],k);
  rate(c.car.apr,'APR',5);rate(c.car.depreciationRate,'Depresiasi');if(!Number.isInteger(c.car.loanMonths)||c.car.loanMonths<1||c.car.loanMonths>120)fail('Tenor 1–120 bulan.');
  for(const k of ['principal','annualFees'])money(c.carry[k],k);for(const k of ['grossRate','taxRate','borrowRate'])rate(c.carry[k],k,5);
  return c;
}
// Versioned chunks keep source and normalized records immutable without rewriting
// 20,000 indexed rows on every import. SQLite transactions protect pointer changes.
export class FinanceDatabase {
  constructor(ctx,seed){this.ctx=ctx;this.sql=ctx.storage.sql;this.seed=seed;this.ready=ctx.blockConcurrencyWhile(async()=>this.initialize());}
  all(q,...p){return this.sql.exec(q,...p).toArray();}
  one(q,...p){return this.all(q,...p)[0];}
  get(k){const r=this.one('SELECT value FROM meta WHERE key = ?',k);return r?JSON.parse(r.value):null;}
  set(k,v){this.sql.exec('INSERT OR REPLACE INTO meta (key,value) VALUES (?,?)',k,JSON.stringify(v));}
  putBlob(id,kind,value){const text=typeof value==='string'?value:JSON.stringify(value);for(let i=0;i<text.length;i+=100000)this.sql.exec('INSERT INTO chunks (batch,kind,part,value) VALUES (?,?,?,?)',id,kind,i/100000,text.slice(i,i+100000));}
  blob(id,kind){return this.all('SELECT value FROM chunks WHERE batch = ? AND kind = ? ORDER BY part',id,kind).map(x=>x.value).join('');}
  rows(id=this.get('active')){return JSON.parse(this.blob(id,'records'));}
  audit(action,detail){this.sql.exec('INSERT INTO audit (at,action,detail) VALUES (?,?,?)',new Date().toISOString(),action,JSON.stringify(detail));}
  batch(meta,raw,records){this.sql.exec('INSERT INTO imports (id,metadata) VALUES (?,?)',meta.id,JSON.stringify(meta));this.putBlob(meta.id,'raw',raw);this.putBlob(meta.id,'records',records);}
  initialize(){
    for(const q of ['CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)','CREATE TABLE IF NOT EXISTS imports (id TEXT PRIMARY KEY, metadata TEXT NOT NULL)','CREATE TABLE IF NOT EXISTS chunks (batch TEXT NOT NULL, kind TEXT NOT NULL, part INTEGER NOT NULL, value TEXT NOT NULL, PRIMARY KEY(batch,kind,part))','CREATE TABLE IF NOT EXISTS settings (version INTEGER PRIMARY KEY, at TEXT NOT NULL, value TEXT NOT NULL)','CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY, value TEXT NOT NULL)','CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL)'])this.sql.exec(q);
    if(this.get('schema'))return;
    validateConfig(this.seed.config);
    this.ctx.storage.transactionSync(()=>{
      for(const b of this.seed.batches)this.batch(b.meta,b.raw,b.records);
      this.set('active',this.seed.active);this.set('config',this.seed.config);this.set('revision',1);this.set('schema',2);
      this.sql.exec('INSERT INTO settings VALUES (?,?,?)',1,new Date().toISOString(),JSON.stringify(this.seed.config));
      for(const s of this.seed.snapshots||[])this.sql.exec('INSERT INTO snapshots VALUES (?,?)',s.id,JSON.stringify(s));
      this.audit('migration',{schema:2,source:'Preserved legacy export and versioned accounting migration',batches:this.seed.batches.map(b=>b.meta.id)});
    });
  }
  state(){const active=this.get('active'),batches=this.all('SELECT metadata FROM imports').map(x=>JSON.parse(x.metadata));return {schemaVersion:2,revision:this.get('revision'),active,config:this.get('config'),transactions:this.rows(active),batches,snapshots:this.all('SELECT value FROM snapshots').map(x=>JSON.parse(x.value)).sort((a,b)=>a.asOf.localeCompare(b.asOf)),audit:this.all('SELECT * FROM audit ORDER BY id DESC LIMIT 100').map(x=>({...x,detail:JSON.parse(x.detail)})),configVersions:this.all('SELECT version,at FROM settings ORDER BY version DESC'),coverage:batches.find(x=>x.id===active)?.coverage};}
  check(revision){if(revision!==this.get('revision'))fail('Data berubah di sesi lain. Muat ulang lalu tinjau kembali.',409);}
  async plan(input){if(typeof input.raw!=='string'||new TextEncoder().encode(input.raw).length>15000000)fail('CSV maksimal 15 MB.');if(typeof input.filename!=='string'||input.filename.length>200)fail('Nama berkas tidak valid.');this.check(input.revision);const parsed=parseCSV(input.raw,input.options||{});if(parsed.sourceRows>100000)fail('Maksimal 100.000 transaksi per impor.');const p=importPlan(this.rows(),parsed,input.options||{});const digest=await sha256(JSON.stringify({raw:input.raw,options:input.options||{},revision:input.revision}));return {...p,digest,parsed};}
  async fetch(request){await this.ready;try{
    const action=new URL(request.url).pathname.split('/').at(-1);
    if(request.method==='GET'&&action==='state')return json(this.state());
    if(request.method==='GET'&&action==='backup')return json({schemaVersion:2,exportedAt:new Date().toISOString(),...this.state(),archives:this.all('SELECT metadata FROM imports').map(x=>{const meta=JSON.parse(x.metadata);return {meta,raw:this.blob(meta.id,'raw'),records:this.rows(meta.id)};}),settingsArchive:this.all('SELECT * FROM settings')});
    if(request.method!=='POST')return json({error:'Metode tidak diizinkan'},405);
    const input=await request.json();this.check(input.revision);
    if(action==='preview'){
      const p=await this.plan(input);return json({...p,records:p.records.slice(0,8),parsed:undefined,errors:p.errors.slice(0,100),previewToken:p.digest});
    }
    if(action==='import'){
      const p=await this.plan(input);if(p.digest!==input.previewToken)fail('Preview berubah. Tinjau CSV kembali.',409);if(p.errors.length)fail('Perbaiki seluruh baris yang error sebelum menyimpan.');
      if(p.correctionCandidates.length&&input.options?.mode!=='replace')fail('Ada kandidat koreksi nominal. Gunakan penggantian ekspor lengkap agar catatan lama tidak ikut terhitung.');
      if(p.truncated&&input.options?.mode==='replace')fail('Ekspor memotong histori. Gunakan seluruh periode atau impor inkremental.');
      this.check(input.revision);if(p.noChange)return json({ok:true,noChange:true,revision:this.get('revision'),counts:p.counts});
      const id=crypto.randomUUID(),parent=this.get('active'),meta={id,parent,filename:input.filename,at:new Date().toISOString(),sha256:await sha256(input.raw),counts:p.counts,coverage:p.coverage,reportOnly:p.reportOnly,retainedSupport:p.retainedSupport,options:input.options||{},idStrategy:p.idStrategy};
      this.ctx.storage.transactionSync(()=>{this.check(input.revision);this.batch(meta,input.raw,p.records);this.set('active',id);this.set('revision',input.revision+1);this.audit('import',meta);});return json({ok:true,id,counts:p.counts,revision:input.revision+1});
    }
    if(action==='rollback'){
      if(!this.one('SELECT id FROM imports WHERE id = ?',input.batchId))fail('Batch tidak ditemukan.');
      this.ctx.storage.transactionSync(()=>{this.check(input.revision);const before=this.get('active');this.set('active',input.batchId);this.set('revision',input.revision+1);this.audit('rollback',{before,after:input.batchId});});return json({ok:true});
    }
    if(action==='config'||action==='restore-config'){
      const c=action==='restore-config'?JSON.parse(this.one('SELECT value FROM settings WHERE version = ?',input.version)?.value||'null'):input.config;
      validateConfig(c);const raw=JSON.stringify(c);if(raw.length>500000)fail('Pengaturan terlalu besar.');
      // Refund links must refer to an existing negative expense, in a consistent category.
      const rows=this.rows(),index=new Map(rows.map(t=>[t.uid,t]));for(const [uid,o] of Object.entries(c.overrides||{}))if(o.kind==='refund'){const original=index.get(o.originalUid),refund=index.get(uid);if(!original||!refund||original.amount>=0||refund.amount<=0||original.category!==refund.category)fail('Refund harus ditautkan ke pengeluaran asli pada kategori yang sama.');}
      this.ctx.storage.transactionSync(()=>{this.check(input.revision);this.set('config',copy(c));this.set('revision',input.revision+1);this.sql.exec('INSERT INTO settings VALUES (?,?,?)',input.revision+1,new Date().toISOString(),raw);this.audit(action,{version:input.revision+1});});return json({ok:true});
    }
    if(action==='snapshot'){
      const c=this.get('config'),p=position(c),today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      if(input.closed&&(c.asOf!==monthEnd(c.asOf)||c.asOf>=today))fail('Penutupan membutuhkan posisi akhir bulan yang sudah berlalu.');
      if(!input.source||input.source.length>1000)fail('Tuliskan sumber posisi.');
      const ledgerReconciled=!reconciliation(this.rows(),c).some(x=>x.difference)&&!!this.state().coverage?.end&&this.state().coverage.end>=c.asOf;
      const s={id:crypto.randomUUID(),asOf:c.asOf,at:new Date().toISOString(),source:input.source,closed:!!input.closed,provisional:!input.reconciled||!ledgerReconciled,nl:p.nl,bookWorth:p.bookWorth,liquid:p.liquid,stocks:p.stocks,crypto:p.crypto,property:p.property,prepaid:p.prepaid,receivable:p.receivable,liabilities:p.liabilities,marketWorth:null,configVersion:input.revision,batch:this.get('active')};
      if(input.closed&&!input.reconciled)fail('Rekonsiliasi terlebih dahulu sebelum menutup bulan.');
      if(input.closed&&!ledgerReconciled)fail('Saldo atau cakupan ledger belum cocok; penutupan final ditolak.');
      this.ctx.storage.transactionSync(()=>{this.check(input.revision);this.sql.exec('INSERT INTO snapshots VALUES (?,?)',s.id,JSON.stringify(s));this.set('revision',input.revision+1);this.audit('snapshot',s);});return json({ok:true,snapshot:s});
    }
    return json({error:'Aksi tidak ditemukan'},404);
  }catch(e){return json({error:e.status?e.message:'Penyimpanan gagal. Periksa input dan coba lagi.'},e.status||400);}}
}
