import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import * as E from '../assets/finance/20261009/engine.mjs';

const tx=(date,amount,category='Salary',excluded=false,account='Cash',note='')=>({id:date+amount,date,amount,category,excluded,account,note});
test('CSV preserves quoted notes, repeated content and signed IDR values',()=>{
 const csv='\uFEFFID,Note,Amount,Category,Account,Currency,Date,Event,Exclude Report\r\n1,"a, b\n""quoted""",100,Salary,Cash,IDR,09/10/2026,,False\r\n2,same,-50,Food,Cash,IDR,09/10/2026,,True\r\n3,same,-50,Food,Cash,IDR,09/10/2026,,True';
 const rows=E.parseCSV(csv);assert.equal(rows.length,3);assert.equal(rows[0].note,'a, b\n"quoted"');assert.equal(rows[0].date,'2026-10-09');assert.equal(rows[1].amount,-50);assert.equal(rows[1].excluded,true);
 assert.throws(()=>E.parseCSV(csv.replace('09/10/2026','31/02/2026')));assert.throws(()=>E.parseCSV(csv.replace(',100,',',100.5,')));assert.throws(()=>E.parseCSV(csv.replace(',IDR,',',USD,')));
});
test('Reports separate internal movement from income while wallet balances include every row',()=>{
 const rows=[tx('2026-01-01',1000),tx('2026-01-02',-200,'Food'),tx('2026-01-03',500,'Incoming transfer'),tx('2026-01-04',-500,'Outgoing transfer',true),tx('2026-01-05',300,'Debt'),tx('2026-01-06',100,'Gift',true),tx('2026-01-07',-50,'Other',false,'Cash','Adjust balance'),tx('2026-01-08',200,'Saldo Awal')];
 const normal=E.aggregate(rows);assert.equal(normal.income,1000);assert.equal(normal.expense,250);assert.equal(normal.surplus,750);assert.equal(normal.savingsRate,.75);assert.equal(E.aggregate(rows,{includeAdjustments:false}).expense,200);assert.equal(E.balances(rows,'2026-01-08')[0].amount,1350);assert.equal(E.role(rows[2]),'transfer');assert.equal(E.role(rows[4]),'debt');
});
test('YTD and MTD compare matching cutoffs, leap days clamp and missing periods stay null',()=>{
 const data={coverage:{start:'2024-01-01',end:'2026-10-09'},transactions:[tx('2026-10-09',300),tx('2025-10-09',100),tx('2025-10-10',900),tx('2024-10-09',50)]};
 const result=E.comparablePeriods(data,'2026-01-01','2026-10-09');assert.deepEqual(result.map(x=>x.income),[300,100,50]);assert.equal(E.shiftYear('2024-02-29',1),'2025-02-28');assert.deepEqual(E.previousPeriod('2026-10-01','2026-10-09'),{start:'2026-09-01',end:'2026-09-09'});assert.deepEqual(E.previousPeriod('2026-09-01','2026-09-30'),{start:'2026-08-01',end:'2026-08-31'});assert.deepEqual(E.previousMonthPeriod('2026-02-01','2026-02-28'),{start:'2026-01-01',end:'2026-01-31'});assert.equal(E.percentageChange(200,0),null);assert.equal(E.percentageChange(200,100),1);assert.equal(E.comparablePeriods(data,'2024-01-01','2024-10-09')[1].income,null);
});
test('Net worth replaces investment capital with market values and never fabricates missing prices',()=>{
 const data={coverage:{end:'2026-10-09'},position:{btcQuantity:.02,payables:[{amount:40}],receivables:[{amount:10}]},transactions:[tx('2026-01-01',100,'Saldo Awal',false,'Cash'),tx('2026-01-01',200,'Saldo Awal',false,'Saham Stockbit'),tx('2026-01-01',50,'Saldo Awal',false,'Bitcoin Tokocrypto')]};
 assert.equal(E.worth(data,{},'book').netWorth,320);assert.equal(E.worth(data,{stockValue:150}).netWorth,null);assert.equal(E.worth(data,{stockValue:150,btcIdr:1000}).netWorth,240);assert.equal(E.worth(data,{},'book').cash,100);
 const history=E.historicalBalances(data,'2026-02-01','2026-03-09');assert.deepEqual(history.map(x=>x.amount),[350,350]);assert.equal(history.at(-1).date,'2026-03-09');
});
test('Finance auth rejects anonymous, cross-origin, tampered, expired and non-owner identities',async()=>{
 const code=(await readFile(new URL('../server/finance-worker.mjs',import.meta.url),'utf8')).replace("import snapshot from './finance-private.mjs';","const snapshot={schemaVersion:1,privateFixture:'owner-only'};");
 const worker=(await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).default;
 const env={FINANCE_SESSION_SECRET:'test-only-secret-which-is-never-used-in-production'};
 const originalFetch=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url,init)=>{calls++;assert.equal(url,'https://mile.posnew.com/api/auth/login');assert.equal(init.redirect,'manual');return new Response(JSON.stringify({ok:true,user:{email:'ikhsan@posnew.com'}}),{headers:{'content-type':'application/json'}});};
 const req=(path,method='GET',body,headers={})=>new Request('https://idx.posnew.com/api/finance/'+path,{method,headers:{...headers},body:body===undefined?undefined:JSON.stringify(body)});
 const loginHeaders={origin:'https://idx.posnew.com','content-type':'application/json','sec-fetch-site':'same-origin'};
 try {
  let res=await worker.fetch(req('data'),env);assert.equal(res.status,401);assert.ok(!(await res.text()).includes('owner-only'));
  assert.equal((await worker.fetch(req('login','POST',{email:'ikhsan@posnew.com',password:'12345678'},{origin:'https://evil.example'}),env)).status,403);
  assert.equal((await worker.fetch(req('login','POST',null,loginHeaders),env)).status,400);
  assert.equal((await worker.fetch(req('login','POST',{email:'other@example.com',password:'12345678'},loginHeaders),env)).status,401);assert.equal(calls,0);
  res=await worker.fetch(req('login','POST',{email:'ikhsan@posnew.com',password:'12345678'},loginHeaders),env);assert.equal(res.status,200);const cookie=res.headers.get('set-cookie').split(';')[0];assert.match(res.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);
  res=await worker.fetch(req('data','GET',undefined,{cookie}),env);assert.equal(res.status,200);assert.equal((await res.json()).privateFixture,'owner-only');assert.equal(res.headers.get('cache-control'),'private, no-store');
  assert.equal((await worker.fetch(req('data','GET',undefined,{cookie:cookie+'bad'}),env)).status,401);
  const signed=async payload=>{const body=Buffer.from(JSON.stringify(payload)).toString('base64url');const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.FINANCE_SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);return '__Host-porto_finance='+body+'.'+Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(body))).toString('base64url');};
  const now=Math.floor(Date.now()/1000);
  for(const payload of [{email:'ikhsan@posnew.com',iat:now-100,exp:now-1},{email:'other@example.com',iat:now,exp:now+100},{email:'ikhsan@posnew.com',iat:now,exp:now+50000}])assert.equal((await worker.fetch(req('data','GET',undefined,{cookie:await signed(payload)}),env)).status,401);
  globalThis.fetch=async()=>new Response(JSON.stringify({ok:true,user:{email:'other@example.com'}}));assert.equal((await worker.fetch(req('login','POST',{email:'ikhsan@posnew.com',password:'12345678'},loginHeaders),env)).status,401);
  assert.equal((await worker.fetch(req('logout','POST',{},loginHeaders),env)).headers.get('set-cookie').includes('Max-Age=0'),true);
 } finally {globalThis.fetch=originalFetch;}
});
test('Pages serves private HTML only after the internal backend approves its session',async()=>{
 const source=await readFile(new URL('../_worker.js',import.meta.url),'utf8');
 const pages=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
 let authenticated=false,assetCalls=0;
 const env={FINANCE_API:{fetch:async(input,init)=>{const req=new Request(input,init);assert.equal(req.redirect,'manual');return new Response(JSON.stringify({email:authenticated?'ikhsan@posnew.com':null}),{status:authenticated?200:401,headers:{'content-type':'application/json'}});}},ASSETS:{fetch:async()=>{assetCalls++;return new Response('<html>static shell</html>');}}};
 const req=path=>new Request('https://idx.posnew.com'+path);
 let response=await pages.fetch(req('/finance'),env);assert.equal(response.status,302);assert.equal(response.headers.get('location'),'/finance-login');assert.equal(assetCalls,0);
 response=await pages.fetch(req('/api/finance/data'),env);assert.equal(response.status,401);assert.equal(response.headers.get('cache-control'),'private, no-store');
 assert.equal((await pages.fetch(req('/finance-login'),env)).status,200);
 authenticated=true;response=await pages.fetch(req('/finance.html'),env);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.match(response.headers.get('content-security-policy'),/frame-ancestors 'none'/);
 assert.equal((await pages.fetch(req('/'),env)).status,200);
 assert.equal((await pages.fetch(req('/finance'),{ASSETS:env.ASSETS})).status,503);
});
