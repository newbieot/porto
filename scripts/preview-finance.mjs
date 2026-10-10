// Owner-local preview only. No production credentials or public listening socket.
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomBytes,createHmac} from 'node:crypto';
import {FinanceDatabase} from '../server/finance-store.mjs';
import {localContext} from './finance-sqlite-adapter.mjs';
const root=resolve(import.meta.dirname,'..'),privateDir=resolve(root,'.finance');await mkdir(privateDir,{recursive:true});
const seed=JSON.parse(await readFile(resolve(privateDir,'bootstrap-v2.json'),'utf8'));
const ctx=localContext(resolve(privateDir,'preview.sqlite')),store=new FinanceDatabase(ctx,seed);await store.ready;
const token=randomBytes(24).toString('hex'),secret=randomBytes(48).toString('hex');
const iat=Math.floor(Date.now()/1000),body=Buffer.from(JSON.stringify({email:'ikhsan@posnew.com',iat,exp:iat+43200})).toString('base64url');
const workerCookie='__Host-porto_finance='+body+'.'+createHmac('sha256',secret).update(body).digest('base64url');
let source=await readFile(resolve(root,'server/finance-worker.mjs'),'utf8');
source=source.replace("import snapshot from './finance-private.mjs';",'const snapshot={preview:true};').replace("import {bootstrap} from './finance-private.mjs';",'const bootstrap={};').replace("'./finance-store.mjs'",JSON.stringify(pathToFileURL(resolve(root,'server/finance-store.mjs')).href));
const worker=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
const env={FINANCE_SESSION_SECRET:secret,FINANCE_DB:{idFromName:x=>x,get:()=>store}};
const allowedOrigin='http://127.0.0.1:8765';
createServer(async(req,res)=>{try{
 const url=new URL(req.url,allowedOrigin),send=(status,body='',headers={})=>{res.writeHead(status,{'cache-control':'no-store','x-content-type-options':'nosniff',...headers});res.end(body);};
 if(req.headers.host!=='127.0.0.1:8765')return send(403,'Host rejected');
 if(url.pathname==='/preview-unlock'&&url.searchParams.get('key')===token)return send(302,'',{'set-cookie':`finance_preview=${token}; Path=/; HttpOnly; SameSite=Strict`,location:'/finance'});
 const authorized=(req.headers.cookie||'').split(';').some(x=>x.trim()==='finance_preview='+token);
 if(url.pathname.startsWith('/api/finance/')){
   if(!authorized)return send(401,JSON.stringify({error:'Buka tautan preview privat dari sesi pengembangan.'}),{'content-type':'application/json'});
   if(req.method==='POST'&&req.headers.origin!==allowedOrigin)return send(403,'Origin rejected');
   if(url.pathname.endsWith('/logout'))return send(200,'{"ok":true}',{'content-type':'application/json','set-cookie':'finance_preview=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict'});
   let data='',bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>20000000)return send(413,'Too large');data+=chunk;}
   const request=new Request('https://idx.posnew.com'+url.pathname,{method:req.method,headers:{'content-type':'application/json',cookie:workerCookie,origin:'https://idx.posnew.com','sec-fetch-site':'same-origin'},...(!['GET','HEAD'].includes(req.method)?{body:data}: {})});
   const response=await worker.fetch(request,env);return send(response.status,Buffer.from(await response.arrayBuffer()),Object.fromEntries(response.headers));
 }
 if(['/finance','/finance.html','/'].includes(url.pathname)&&!authorized)return send(302,'',{location:'/finance-login'});
 let path=url.pathname;if(path==='/'||path==='/finance')path='/finance.html';if(path==='/finance-login')path='/finance-login.html';
 if(!['/finance.html','/finance-login.html','/favicon.svg','/data/valuation-bands.json','/data/portfolio-positions.json'].includes(path)&&!path.startsWith('/assets/finance/'))return send(404,'Not found');
 const file=resolve(root,'.'+decodeURIComponent(path));if(!file.startsWith(root+'\\')&&!file.startsWith(root+'/'))return send(403,'Path rejected');
 const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.mjs':'application/javascript','.json':'application/json','.svg':'image/svg+xml'};
 send(200,await readFile(file),{'content-type':types[extname(file)]||'application/octet-stream'});
 }catch{res.writeHead(500,{'cache-control':'no-store'});res.end('Local preview request failed');}}).listen(8765,'127.0.0.1',async()=>{
 const url=allowedOrigin+'/preview-unlock?key='+token;await writeFile(resolve(privateDir,'preview-url'),url);console.log('Private preview ready on http://127.0.0.1:8765; entry URL saved to .finance/preview-url');
});
