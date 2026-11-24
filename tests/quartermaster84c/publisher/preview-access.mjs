import assert from 'node:assert/strict';

export function createPreviewAccess(origin, project, {clientId,clientSecret}, request=fetch) {
 const u=new URL(origin), suffix='.'+project+'.pages.dev';
 const label=u.hostname.slice(0,-suffix.length);
 assert(project==='apparition-phoenix-preview'&&u.protocol==='https:'&&u.hostname.endsWith(suffix)&&/^[a-f0-9]{8,32}$/.test(label)&&
        !u.port&&!u.username&&!u.password&&u.pathname==='/'&&!u.search&&!u.hash,'Unexpected immutable preview origin.');
 assert(clientId&&clientSecret,'Preview Access service credentials are required.');
 function probe(path,authenticated){
  assert(typeof path==='string'&&path.startsWith('/')&&!path.startsWith('//'),'Preview path required.');
  const target=new URL(path,u);
  assert(target.origin===u.origin&&!target.username&&!target.password&&!target.search&&!target.hash,'Unexpected preview target.');
  return request(target,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000),headers:authenticated?{
    'CF-Access-Client-Id':clientId,'CF-Access-Client-Secret':clientSecret
  }:{}});
 }
 return {
  async assertProtected(){
   const response=await probe('/',false);
   const redirect=response.headers.get('location');
   let login=false;
   if(redirect&&response.status>=300&&response.status<400){
    const target=new URL(redirect,u);
    login=target.protocol==='https:'&&target.hostname.endsWith('.cloudflareaccess.com')&&target.pathname.startsWith('/cdn-cgi/access/login/');
   }
   await response.body?.cancel();
   assert(login||response.status===401||response.status===403,'Unauthenticated preview was not gated.');
  },
  async get(path,expectedStatus=200){
   assert(expectedStatus===200||expectedStatus===404,'Unexpected expected preview status.');
   const response=await probe(path,true);
   assert.equal(response.status,expectedStatus,'Preview Access or route check failed: '+path);
   return response;
  }
 };
}
