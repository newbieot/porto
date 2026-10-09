// Deployed separately with a private JSON module; never publish that module to Git.
import snapshot from './finance-private.mjs';
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
  if(marketCache&&now-marketCache.fetchedAt<300000)return marketCache;
  try {
    const response=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=idr&include_last_updated_at=true',{signal:AbortSignal.timeout(9000),headers:{accept:'application/json'}});
    if(!response.ok)throw new Error('Price unavailable');
    const btc=(await response.json()).bitcoin;
    if(!(btc?.idr>0)||!Number.isFinite(btc.idr)||!btc.last_updated_at||now/1000-btc.last_updated_at>86400)throw new Error('Price stale');
    marketCache={btcIdr:btc.idr,btcUpdatedAt:new Date(btc.last_updated_at*1000).toISOString(),fetchedAt:now,source:'CoinGecko'};
    return marketCache;
  }catch{return {btcIdr:null,btcUpdatedAt:null,source:'CoinGecko',unavailable:true};}
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
    if(request.method!=='GET')return json({error:'Metode tidak diizinkan.'},405);
    if(path==='/api/finance/session')return json({email:user.email,expiresAt:new Date(user.exp*1000).toISOString()});
    if(path==='/api/finance/data')return new Response(snapshotBody,{headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','cloudflare-cdn-cache-control':'no-store','x-content-type-options':'nosniff','x-frame-options':'DENY'}});
    if(path==='/api/finance/bitcoin')return json(await bitcoinPrice());
    return json({error:'Halaman tidak ditemukan.'},404);
  }
};
