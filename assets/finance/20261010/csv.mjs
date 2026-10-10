// Shared by the browser preview and the authoritative private import service.
export const FIELDS=['id','date','amount','category','account','currency','note','event','excluded','type'];
const ALIASES={id:['id','transaction id'],date:['date','tanggal'],amount:['amount','jumlah','nominal'],category:['category','kategori'],account:['account','wallet','rekening','dompet'],currency:['currency','mata uang'],note:['note','notes','catatan'],event:['event'],excluded:['exclude report','excluded'],type:['type','jenis']};
export function decodeCSV(bytes,encoding='auto') {
  const b=new Uint8Array(bytes);let detected=encoding;
  if(encoding==='auto') {
    detected=b[0]===255&&b[1]===254?'utf-16le':b[0]===254&&b[1]===255?'utf-16be':'utf-8';
    try{new TextDecoder(detected,{fatal:true}).decode(b);}catch{detected='windows-1252';}
  }
  return {text:new TextDecoder(detected,{fatal:true}).decode(b).replace(/^\uFEFF/,''),encoding:detected};
}
export function rowsCSV(text,delimiter=',') {
  const rows=[];let row=[],value='',quoted=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else if(quoted||!value)quoted=!quoted;else value+=c;}
    else if(c===delimiter&&!quoted){row.push(value);value='';}
    else if((c==='\n'||c==='\r')&&!quoted){row.push(value);if(row.some(x=>x.trim()))rows.push(row);row=[];value='';if(c==='\r'&&text[i+1]==='\n')i++;}
    else value+=c;
  }
  if(quoted)throw new Error('Tanda kutip CSV belum ditutup.');
  row.push(value);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
export function inspectCSV(text,delimiter) {
  text=text.replace(/^\uFEFF/,'');
  const sep=delimiter||[',',';','\t','|'].map(d=>({d,n:rowsCSV(text.slice(0,text.indexOf('\n')+1)||text,d)[0]?.length||0})).sort((a,b)=>b.n-a.n)[0].d;
  const rows=rowsCSV(text,sep),headers=(rows.shift()||[]).map(x=>x.trim());
  const mapping=Object.fromEntries(FIELDS.map(f=>[f,headers.find(h=>ALIASES[f].includes(h.toLowerCase()))||'']));
  return {headers,rows,mapping,delimiter:sep};
}
export function parseDate(value,order='DMY') {
  const s=String(value).trim();let y,m,d;
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))[y,m,d]=s.split('-').map(Number);
  else {const p=s.split(/[/.\-]/).map(Number);if(p.length!==3)throw new Error('Tanggal tidak valid');if(order==='MDY')[m,d,y]=p;else if(order==='YMD')[y,m,d]=p;else[d,m,y]=p;}
  if(!(y>=1900&&y<=2200))throw new Error('Tahun harus empat digit');
  const result=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  if(!Number.isFinite(new Date(result+'T00:00:00Z').getTime())||new Date(result+'T00:00:00Z').toISOString().slice(0,10)!==result)throw new Error('Tanggal tidak valid');
  return result;
}
export function parseMoney(value,locale='auto') {
  let s=String(value).trim().replace(/(?:Rp|IDR|\s)/gi,'');if(/^\(.*\)$/.test(s))s='-'+s.slice(1,-1);
  if(locale==='id'){s=s.replace(/\./g,'').replace(',','.');}
  else if(locale==='en'){s=s.replace(/,/g,'');}
  else if(/^-?\d{1,3}(,\d{3})+(\.0+)?$/.test(s))s=s.replace(/,/g,'');
  else if(/^-?\d{1,3}(\.\d{3})+(,0+)?$/.test(s))s=s.replace(/\./g,'').replace(',','.');
  if(!/^[+-]?\d+(?:\.0+)?$/.test(s)||!Number.isSafeInteger(Number(s)))throw new Error('Nominal harus rupiah bulat; periksa pemisah angka');
  return Number(s);
}
export const signature=t=>JSON.stringify([t.date,t.amount,t.category,t.account,t.currency||'IDR',t.note||'',t.event||'',!!t.excluded,t.type||'']);
// Two independent 32-bit lanes; complete signatures are used for equality, never hashes alone.
export function shortHash(s){let a=2166136261,b=2246822519;for(let i=0;i<s.length;i++){a=Math.imul(a^s.charCodeAt(i),16777619);b=Math.imul(b^s.charCodeAt(i),3266489917);}return(a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
export function identify(rows){const seen=new Map();return rows.map(t=>{const s=signature(t),n=(seen.get(s)||0)+1;seen.set(s,n);return {...t,uid:`${shortHash(s)}-${n}`};});}
export function parseCSV(text,options={}) {
  const info=inspectCSV(text,options.delimiter),mapping={...info.mapping,...options.mapping};
  for(const f of ['date','amount','category','account'])if(!mapping[f]||!info.headers.includes(mapping[f]))throw new Error(`Petakan kolom ${f}.`);
  const errors=[],records=[];
  info.rows.forEach((row,i)=>{try{
    if(row.length!==info.headers.length)throw new Error('Jumlah kolom berbeda dari header');
    const get=f=>mapping[f]?String(row[info.headers.indexOf(mapping[f])]??'').trim():'';
    const currency=get('currency')||'IDR';if(currency!=='IDR')throw new Error('Mata uang selain IDR memerlukan konversi eksplisit');
    const flag=get('excluded').toLowerCase();if(flag&&!['true','false','1','0','yes','no'].includes(flag))throw new Error('Exclude Report tidak valid');
    let amount=parseMoney(get('amount'),options.numberLocale||'auto');
    const type=get('type');if(options.unsignedAmounts&&/expense|outflow|pengeluaran/i.test(type))amount=-Math.abs(amount);
    const record={id:get('id')||String(i+1),date:parseDate(get('date'),options.dateOrder||'DMY'),amount,category:get('category'),account:get('account'),currency,note:get('note'),event:get('event'),excluded:['true','1','yes'].includes(flag),type};
    if(!record.account||!record.category)throw new Error('Rekening / kategori kosong');
    records.push(record);
  }catch(e){errors.push({row:i+2,error:e.message});}});
  const sequential=records.length>0&&records.every((t,i)=>Number(t.id)===i+1);
  return {records:identify(records),errors,headers:info.headers,mapping,delimiter:info.delimiter,sourceRows:info.rows.length,idStrategy:options.trustIds?'explicit-stable-id':sequential?'export-row-number':'fingerprint',reportOnly:records.every(t=>!t.excluded)};
}
export function importPlan(current,parsed,options={}) {
  if(!['replace','incremental'].includes(options.mode||'incremental'))throw new Error('Mode impor tidak valid');
  const old=identify(current),incoming=parsed.records,counts=new Map();
  if(options.trustIds&&parsed.idStrategy==='explicit-stable-id'&&incoming.every((t,i)=>Number(t.id)===i+1))throw new Error('ID ekspor berurutan bukan ID transaksi permanen. Nonaktifkan opsi ID tepercaya.');
  for(const t of old){const s=signature(t);counts.set(s,(counts.get(s)||0)+1);}
  let added=0,duplicates=0,changed=0;const seen=new Map();
  const trust=!!options.trustIds;
  if(trust&&(new Set(old.map(t=>t.id)).size!==old.length||new Set(incoming.map(t=>t.id)).size!==incoming.length))throw new Error('ID tidak unik. Gunakan fingerprint.');
  const oldIds=new Map(old.map(t=>[t.id,t])), additions=[];
  for(const t of incoming){const s=signature(t),n=(seen.get(s)||0)+1;seen.set(s,n);
    if(trust&&oldIds.has(t.id)){if(signature(oldIds.get(t.id))===s)duplicates++;else{changed++;additions.push(t);}}
    else if(!trust&&n<=(counts.get(s)||0))duplicates++;
    else {added++;additions.push(t);}
  }
  let records;
  if((options.mode||'incremental')==='replace'){
    records=[...incoming];if(options.preserveExcluded&&parsed.reportOnly)records.push(...old.filter(t=>t.excluded));
  }else records=[...old.filter(t=>!trust||!additions.some(x=>x.id===t.id)),...additions];
  records=identify(records).sort((a,b)=>a.date.localeCompare(b.date)||a.uid.localeCompare(b.uid));
  const resultSignatures=new Map();for(const t of records){const s=signature(t);resultSignatures.set(s,(resultSignatures.get(s)||0)+1);}
  let removed=0;for(const [s,n] of counts)removed+=Math.max(0,n-(resultSignatures.get(s)||0));
  const noChange=removed===0&&records.length===old.length&&added===0&&changed===0;
  const ranges=records.map(t=>t.date).sort();
  const key=t=>JSON.stringify([t.date,t.account,t.category,t.note,t.excluded]);
  const oldKeys=new Map(old.map(t=>[key(t),t]));
  const correctionCandidates=additions.filter(t=>oldKeys.has(key(t))&&oldKeys.get(key(t)).amount!==t.amount).map(t=>({date:t.date,account:t.account,category:t.category,before:oldKeys.get(key(t)).amount,after:t.amount}));
  const priorDates=old.filter(t=>!(options.preserveExcluded&&parsed.reportOnly&&t.excluded)).map(t=>t.date).sort(), incomingDates=incoming.map(t=>t.date).sort();
  const truncated=priorDates.length>0&&((incomingDates[0]||'9999')>priorDates[0]||(incomingDates.at(-1)||'')<priorDates.at(-1));
  return {records,counts:{added,changed,duplicates,removed,errors:parsed.errors.length,before:old.length,after:records.length},noChange,correctionCandidates,truncated,reportOnly:parsed.reportOnly,coverage:{start:ranges[0]||null,end:ranges.at(-1)||null},idStrategy:parsed.idStrategy,errors:parsed.errors,retainedSupport:options.preserveExcluded&&parsed.reportOnly?old.filter(t=>t.excluded).length:0};
}
export async function sha256(text){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
