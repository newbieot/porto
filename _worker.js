const API_ORIGIN='https://porto-finance-api.ikhsanradiansyah.workers.dev';
function financeFetch(input,init,env){
  if(!env.FINANCE_API)throw new Error('Private finance service binding is unavailable.');
  return env.FINANCE_API.fetch(input,init);
}
const privateHeaders={'cache-control':'private, no-store','cloudflare-cdn-cache-control':'no-store','x-robots-tag':'noindex, nofollow','x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'same-origin','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"};
export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    if(url.pathname.startsWith('/api/finance/')) {
      const upstream=new URL(url.pathname,API_ORIGIN);
      const headers=new Headers(request.headers);
      headers.delete('host');headers.delete('authorization');
      try {
        const response=await financeFetch(new Request(upstream, {method:request.method,headers,
          body:['GET','HEAD'].includes(request.method)?undefined:request.body,redirect:'error'}),undefined,env);
        const result=new Response(response.body,response);
        for(const [key,value] of Object.entries(privateHeaders))result.headers.set(key,value);
        return result;
      }catch{return new Response(JSON.stringify({error:'Layanan keuangan sementara tidak tersedia.',code:env.FINANCE_API?'BACKEND_UNAVAILABLE':'SERVICE_NOT_CONFIGURED'}),{status:503,headers:{...privateHeaders,'content-type':'application/json'}});}
    }
    if(['/finance','/finance/','/finance.html'].includes(url.pathname)) {
      let response;
      try {response=await financeFetch(API_ORIGIN+'/api/finance/session',{headers:{cookie:request.headers.get('cookie')||''},redirect:'error',signal:AbortSignal.timeout(12000)},env);}
      catch{return new Response('Layanan sementara tidak tersedia. Coba kembali.',{status:503,headers:privateHeaders});}
      if(response.status===401)return new Response(null,{status:302,headers:{...privateHeaders,location:'/finance-login'}});
      if(response.status!==200)return new Response('Layanan sementara tidak tersedia. Coba kembali.',{status:503,headers:privateHeaders});
      const assetURL=new URL('/finance',url.origin);
      const page=await env.ASSETS.fetch(new Request(assetURL,request));
      const result=new Response(page.body,page);
      for(const [key,value] of Object.entries(privateHeaders))result.headers.set(key,value);
      return result;
    }
    if(['/finance-login','/finance-login/','/finance-login.html'].includes(url.pathname)) {
      const page=await env.ASSETS.fetch(new Request(new URL('/finance-login',url.origin),request));
      const result=new Response(page.body,page);
      for(const [key,value] of Object.entries(privateHeaders))result.headers.set(key,value);
      return result;
    }
    return env.ASSETS.fetch(request);
  }
};
