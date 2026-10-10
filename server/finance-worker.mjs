// Deployed separately with a private JSON module; never publish that module to Git.
import snapshot from './finance-private.mjs';
import {bootstrap} from './finance-private.mjs';
import {FinanceDatabase} from './finance-store.mjs';
export class FinanceStore extends FinanceDatabase {constructor(ctx,env){super(ctx,bootstrap);}}
const snapshotBody=JSON.stringify(snapshot);
const OWNER='ikhsan@posnew.com';
const COOKIE='__Host-porto_finance';
const encoder=new TextEncoder(), decoder=new TextDecoder();
const encode=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
function json(body,status=200,extra={}) {
  return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','cloudflare-cdn-cache-control':'no-store','x-content-type-options':'nosniff','x-frame-options':'DENY',...extra}});
}
async function key(secret){return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
async function session(request,env) {
  const token=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  if(!token||token.length>2048||!env.FINANCE_SESSION_SECRET)return null;
  try {
    const [body,signature,extra]=token.split('.');if(extra||!body||!signature)return null;
    if(!await crypto.subtle.verify('HMAC',await key(env.FINANCE_SESSION_SECRET),decode(signature),encoder.encode(body)))return null;
    const data=JSON.parse(decoder.decode(decode(body)));
    const now=Math.floor(Date.now()/1000);
    if(data.email!==OWNER||!data.exp||data.exp<=now||!data.iat||data.iat>now+60||data.exp-data.iat>43200)return null;
    return data;
  } catch{return null;}
}
function allowedOrigin(request) {
  const origin=request.headers.get('origin');
  return origin==='https://idx.posnew.com'&&request.headers.get('sec-fetch-site')!=='cross-site';
}
let marketCache=null;
async function bitcoinPrice() {
  const now=Date.now();
  if(marketCache&&now-marketCache.fetchedAt<(marketCache.unavailable?30000:300000))return marketCache;
  // Prefer the exchange holding the asset; use a reference quote if it is unavailable.
  const sources=[
    {name:'Tokocrypto',url:'https://www.tokocrypto.site/api/v3/ticker/24hr?symbol=BTCIDR',maxAge:3600000,
      parse:data=>data.symbol==='BTCIDR'?{price:Number(data.lastPrice),updatedAt:Number(data.closeTime)}:null},
    {name:'CoinGecko',url:'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=idr&include_last_updated_at=true',maxAge:86400000,
      parse:data=>({price:data.bitcoin?.idr,updatedAt:data.bitcoin?.last_updated_at*1000})},
    {name:'Coinbase',url:'https://api.coinbase.com/v2/prices/BTC-IDR/spot',maxAge:300000,timestampKind:'quoted',
      parse:(data,response)=>data.data?.base==='BTC'&&data.data?.currency==='IDR'?{price:Number(data.data.amount),updatedAt:Date.parse(response.headers.get('date'))}:null}
  ];
  for(const source of sources)try {
    const response=await fetch(source.url,{redirect:'manual',signal:AbortSignal.timeout(6000),headers:{accept:'application/json','user-agent':'IkhsanFinance/1.0 (+https://idx.posnew.com/finance)'}});
    if(!response.ok)continue;
    const quote=source.parse(await response.json(),response);
    if(!quote||!(quote.price>0)||!Number.isFinite(quote.price)||!(quote.updatedAt>0)||!Number.isFinite(quote.updatedAt)||now-quote.updatedAt>source.maxAge||quote.updatedAt-now>60000)continue;
    marketCache={btcIdr:quote.price,btcUpdatedAt:new Date(quote.updatedAt).toISOString(),fetchedAt:now,source:source.name,timestampKind:source.timestampKind||'updated'};
    return marketCache;
  }catch{/* Try the next fixed public market-data source. */}
  marketCache={btcIdr:null,btcUpdatedAt:null,fetchedAt:now,source:null,unavailable:true};
  return marketCache;
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url),path=url.pathname;
    if(path==='/api/finance/login') {
      if(request.method!=='POST')return json({error:'Metode tidak diizinkan.'},405);
      if(!allowedOrigin(request))return json({error:'Permintaan lintas situs ditolak.'},403);
      if(!env.FINANCE_SESSION_SECRET)return json({error:'Konfigurasi autentikasi belum tersedia.'},503);
      if(Number(request.headers.get('content-length'))>8192)return json({error:'Permintaan terlalu besar.'},413);
      let input;try {const body=await request.text();if(encoder.encode(body).length>8192)return json({error:'Permintaan terlalu besar.'},413);input=JSON.parse(body);}catch{return json({error:'Permintaan tidak valid.'},400);}
      if(!input||typeof input!=='object'||Array.isArray(input))return json({error:'Permintaan tidak valid.'},400);
      const email=String(input.email||'').trim().toLowerCase(),password=String(input.password||'');
      if(email!==OWNER||password.length<8||password.length>256)return json({error:'Email atau password tidak benar.'},401);
      // Reuse the existing Firebase Email/Password authority in project mile-posnew-com.
      // The fixed server gateway validates the Firebase identity; passwords/tokens are never stored here.
      let response,result;
      try {
        response=await fetch('https://mile.posnew.com/api/auth/login',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(15000),
          headers:{'content-type':'application/json','origin':'https://mile.posnew.com'},body:JSON.stringify({email,password,remember:false})});
        if(response.status>=300&&response.status<400)throw new Error('Unexpected login gateway redirect');
        result=await response.json();
      }catch{return json({error:'Layanan login sementara tidak tersedia. Coba kembali.'},502);}
      if(!response.ok||result?.user?.email?.toLowerCase()!==OWNER||result.ok!==true)return json({error:response.status===429?'Terlalu banyak percobaan. Tunggu lalu coba lagi.':'Email atau password tidak benar.'},response.status===429?429:401);
      const iat=Math.floor(Date.now()/1000),payload={email:OWNER,iat,exp:iat+43200};
      const body=encode(encoder.encode(JSON.stringify(payload)));
      const signature=encode(new Uint8Array(await crypto.subtle.sign('HMAC',await key(env.FINANCE_SESSION_SECRET),encoder.encode(body))));
      return json({ok:true},200,{'set-cookie':`${COOKIE}=${body}.${signature}; Path=/; Max-Age=43200; HttpOnly; Secure; SameSite=Strict`});
    }
    if(path==='/api/finance/logout') {
      if(request.method!=='POST'||!allowedOrigin(request))return json({error:'Permintaan ditolak.'},403);
      return json({ok:true},200,{'set-cookie':`${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`});
    }
    const user=await session(request,env);
    if(!user)return json({error:'Silakan masuk untuk melanjutkan.'},401);
    if(['/api/finance/state','/api/finance/backup','/api/finance/preview','/api/finance/import','/api/finance/config','/api/finance/restore-config','/api/finance/rollback','/api/finance/snapshot'].includes(path)) {
      if(!env.FINANCE_DB)return json({error:'Penyimpanan privat belum tersedia.'},503);
      const reads=['/api/finance/state','/api/finance/backup'];
      if(reads.includes(path)?request.method!=='GET':request.method!=='POST')return json({error:'Metode tidak diizinkan.'},405);
      if(request.method==='POST'){
        if(!allowedOrigin(request))return json({error:'Permintaan lintas situs ditolak.'},403);
        if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Gunakan JSON.'},415);
        if(Number(request.headers.get('content-length'))>20000000)return json({error:'Berkas terlalu besar.'},413);
        const body=await request.text();if(encoder.encode(body).length>20000000)return json({error:'Berkas terlalu besar.'},413);
        request=new Request(request,{body});
      }
      const id=env.FINANCE_DB.idFromName('owner-ledger-v2');
      return env.FINANCE_DB.get(id).fetch(request);
    }
    if(request.method!=='GET')return json({error:'Metode tidak diizinkan.'},405);
    if(path==='/api/finance/session')return json({email:user.email,expiresAt:new Date(user.exp*1000).toISOString()});
    if(path==='/api/finance/data')return new Response(snapshotBody,{headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','cloudflare-cdn-cache-control':'no-store','x-content-type-options':'nosniff','x-frame-options':'DENY'}});
    if(path==='/api/finance/bitcoin')return json(await bitcoinPrice());
    return json({error:'Halaman tidak ditemukan.'},404);
  }
};
