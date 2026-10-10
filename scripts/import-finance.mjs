import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash,randomBytes} from 'node:crypto';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseCSV,balances,role} from '../assets/finance/20261009/engine.mjs';
const args=process.argv.slice(2);
if(args.includes('--deploy'))throw new Error('Legacy deploy is disabled for finance v2. Use the reviewed private Worker package; production deployment requires owner approval.');
const option=name=>args[args.indexOf(name)+1];
if(!args.includes('--csv')||!args.includes('--position'))throw new Error('Gunakan --csv <full-history.csv> --position <private-position.json> [--deploy].');
const root=fileURLToPath(new URL('..',import.meta.url));
const privateDir=join(root,'.finance');
await mkdir(privateDir,{recursive:true});
const sourcePath=resolve(option('--csv'));
const raw=await readFile(sourcePath,'utf8');
const transactions=parseCSV(raw).sort((a,b)=>a.date.localeCompare(b.date)||Number(a.id)-Number(b.id));
if(!transactions.length)throw new Error('CSV kosong.');
const ids=new Set(transactions.map(t=>t.id));
if(ids.size!==transactions.length)throw new Error('ID ganda dalam satu ekspor. Periksa sebelum impor.');
const position=JSON.parse(await readFile(resolve(option('--position')),'utf8'));
if(!Number.isFinite(position.btcQuantity)||position.btcQuantity<0||!/^\d{4}-\d{2}-\d{2}$/.test(position.asOf||'')||!Array.isArray(position.payables)||!Array.isArray(position.receivables))throw new Error('Snapshot posisi tidak lengkap.');
for(const item of [...position.payables,...position.receivables])if(typeof item.name!=='string'||!item.name.trim()||!Number.isSafeInteger(item.amount)||item.amount<0)throw new Error('Saldo utang/piutang tidak valid.');
for(const [items,expected] of [[position.payables,position.confirmedPayableTotal],[position.receivables,position.confirmedReceivableTotal]])if(expected!==undefined&&items.reduce((s,x)=>s+x.amount,0)!==expected)throw new Error('Rincian utang/piutang belum cocok dengan total terkonfirmasi.');
const coverage={start:transactions[0].date,end:transactions.at(-1).date};
let previous;
try {previous=JSON.parse(await readFile(join(privateDir,'current.json'),'utf8'));}catch{}
if(previous&&(coverage.start>previous.coverage.start||coverage.end<previous.coverage.end))throw new Error('Ekspor ini memotong histori yang sudah ada. Kirim ekspor seluruh periode.');
const signature=new Map();
for(const t of transactions){const fingerprint=JSON.stringify([t.date,t.amount,t.category,t.account,t.note,t.excluded]);signature.set(fingerprint,(signature.get(fingerprint)||0)+1);}
const snapshot={schemaVersion:1,importedAt:new Date().toISOString(),coverage,position,
  source:{filename:sourcePath.split(/[\\/]/).at(-1),sha256:createHash('sha256').update(raw).digest('hex'),timezone:'Asia/Jakarta',rowCount:transactions.length},
  quality:{similarAdditionalRows:[...signature.values()].reduce((s,n)=>s+Math.max(n-1,0),0),adjustments:transactions.filter(t=>role(t)==='adjustment').length,
    excluded:transactions.filter(t=>t.excluded).length,policy:'Money Lover reporting flags, with transfers, debt movements and opening balances separate. Balance adjustments are included by default and can be excluded in the dashboard.'},
  transactions};
const text=JSON.stringify(snapshot);
await writeFile(join(privateDir,'current.json'),text);
await writeFile(join(privateDir,`${coverage.end}-${snapshot.source.sha256.slice(0,12)}.json`),text);
console.log(JSON.stringify({rows:transactions.length,coverage,recordedWalletTotal:balances(transactions,coverage.end).reduce((s,w)=>s+w.amount,0),positionDate:position.asOf,privateBytes:Buffer.byteLength(text)}));
if(args.includes('--deploy')) {
  const config=await readFile(join(process.env.APPDATA,'xdg.config/.wrangler/config/default.toml'),'utf8');
  const oauth=config.match(/^oauth_token\s*=\s*"([^"\r\n]+)"/m)?.[1];
  if(!oauth)throw new Error('Cloudflare login belum tersedia.');
  let secret;try {secret=await readFile(join(privateDir,'session-secret'),'utf8');}catch {secret=randomBytes(48).toString('base64url');await writeFile(join(privateDir,'session-secret'),secret);}
  const form=new FormData();
  form.set('metadata',new Blob([JSON.stringify({main_module:'index.mjs',compatibility_date:'2026-10-09',compatibility_flags:['global_fetch_strictly_public'],bindings:[{type:'secret_text',name:'FINANCE_SESSION_SECRET',text:secret.trim()}]})],{type:'application/json'}));
  form.set('index.mjs',new Blob([await readFile(join(root,'server/finance-worker.mjs'),'utf8')],{type:'application/javascript+module'}),'index.mjs');
  form.set('finance-private.mjs',new Blob(['export default '+text+';'],{type:'application/javascript+module'}),'finance-private.mjs');
  const endpoint='https://api.cloudflare.com/client/v4/accounts/01505ab3bea2f372002e420a5887adf4/workers/scripts/porto-finance-api';
  const upload=await fetch(endpoint,{method:'PUT',headers:{authorization:`Bearer ${oauth}`},body:form});
  const result=await upload.json();
  if(!upload.ok||result.success===false)throw new Error(`Deploy ditolak (${upload.status}): ${(result.errors||[]).map(e=>e.message).join(', ')}`);
  const enable=await fetch(endpoint+'/subdomain',{method:'POST',headers:{authorization:`Bearer ${oauth}`,'content-type':'application/json'},body:JSON.stringify({enabled:true,previews_enabled:false})});
  const enabled=await enable.json();
  if(!enable.ok||enabled.success===false)throw new Error('Worker terunggah tetapi endpoint privat belum aktif.');
  console.log(JSON.stringify({deployed:true,version:result.result?.version_id,worker:'porto-finance-api',privateSourceStoredInGit:false}));
}
