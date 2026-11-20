import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const { chromium }=require(process.env.DOMINION_PLAYWRIGHT);
const root=resolve(process.env.DOMINION_STATIC_FIXTURE);
const mime={'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const fixtureOnly=process.env.STAGEB81_BROWSER_FIXTURE_ONLY==='1';
const authorized='synthetic-stage-b-admin';
const uid='81aa0000-0000-4000-8000-000000000081';
const dormant={schema:1,unity:{mode:'paused',holds:0,holdLines:0,measuredAllocations:0},quartermaster:{mode:'disabled',materials:0,packs:0,movements:0}};
const pool=fixtureOnly ? null : new (require(process.env.DOMINION_PG_MODULE).Pool)({
 host:'127.0.0.1',port:55478,database:'dominion79_fixture',user:'postgres',max:2,connectionTimeoutMillis:3000,statement_timeout:3500
});
if(pool)assert.equal((await pool.query('select current_database() db')).rows[0].db,'dominion79_fixture');
async function load() {
 if(!pool)return dormant;
 const c=await pool.connect();
 try{
  await c.query('begin read only');
  const actor=(await c.query('select user_id from public.admin_members limit 1')).rows[0].user_id;
  await c.query('set local role authenticated');
  await c.query("select set_config('request.jwt.claim.sub',$1,true)",[actor]);
  return (await c.query('select public.dominion81_status() snapshot')).rows[0].snapshot;
 }finally{await c.query('rollback');c.release();}
}

const server=createServer(async (req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 const file=resolve(root,'.'+path+(path.endsWith('/')?'index.html':''));
 if(req.method!=='GET'||!file.startsWith(root+'/'))return res.writeHead(403).end();
 try{const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','Cache-Control':'no-store'}).end(body);}
 catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.DOMINION_CHROMIUM,headless:true,args:['--no-sandbox','--disable-background-networking']});
const errors=[], failures=[], modules=new Set(), reads=[];
let resume, requestSeen;
async function context({permit=true,mobile=false,status=200,phase='native'}={}){
 const ctx=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1360,height:850}});
 await ctx.addInitScript(({token})=>{
  if(sessionStorage.getItem('stage81-seeded'))return;
  sessionStorage.setItem('stage81-seeded','true');
  localStorage.setItem('apparition.admin.supabase-session.v1',JSON.stringify({access_token:token,refresh_token:token,expires_at:Math.floor(Date.now()/1000)+7200}));
 },{token:permit?authorized:'synthetic-stage-b-buyer'});
 await ctx.route('**/*',async route=>{
  const r=route.request(),u=new URL(r.url());
  if(u.origin===origin){
   if(u.pathname==='/admin/application.mjs')modules.add(u.search);
   return route.continue();
  }
  if(u.hostname==='acdxpxvksvdwfajntzfx.supabase.co'){
   const reply=(json,code=200)=>route.fulfill({json,status:code,headers:{'access-control-allow-origin':origin}});
   if(u.pathname==='/auth/v1/user')return reply({id:uid});
   if(u.pathname==='/rest/v1/admin_members')return reply(r.headers().authorization==='Bearer '+authorized?[{user_id:uid}]:[]);
   if(u.pathname==='/auth/v1/logout')return reply({});
   if(u.pathname==='/auth/v1/token'&&r.method()==='POST'&&permit)return reply({access_token:authorized,refresh_token:authorized,expires_in:7200});
   if(u.pathname==='/rest/v1/rpc/dominion81_status'){
    reads.push([r.method(),r.headers().authorization===('Bearer '+authorized)]);
    if(phase==='loading'){
     requestSeen?.();
     await new Promise(resolve=>{resume=resolve;});
    }
    if(status!==200)return reply({},status);
    try{return await reply(phase==='malformed'?{schema:1}:phase==='empty'||phase==='loading'?dormant:await load());}
    catch(e){failures.push(String(e));return reply({},500);}
   }
   failures.push(r.method()+' '+u.pathname);
  }
  return route.abort();
 });
 const page=await ctx.newPage();page.setDefaultTimeout(6000);page.on('pageerror',e=>errors.push(e.message));
 return [ctx,page];
}
const path='/admin/dominion/';
const open=(p,url=path)=>p.goto(origin+url,{waitUntil:'domcontentloaded'});
const loaded=(p)=>p.getByText('Status loaded.',{exact:true}).waitFor();
try {
 const [denied,dp]=await context({permit:false});
 await open(dp);
 await dp.getByText('This account is not authorised for Admin access.').waitFor();
 assert.equal(reads.length,0);
 assert.equal(await dp.locator('#dominion-workspace h1').count(),0);
 await denied.close();

 const [desk,p]=await context();
 await open(p);
 await loaded(p);
 await p.getByRole('heading',{name:'Stock & packing status'}).waitFor();
 assert.equal(await p.locator('[data-workspace=dominion]').getAttribute('aria-current'),'page');
 assert.ok(await p.getByRole('link',{name:'IRONCLAD: Stock & purchasing'}).isVisible());
 assert.equal(await p.locator('#dominion-workspace button, #dominion-workspace form').count(),0);
 await p.getByRole('button',{name:'Sign Out',exact:true}).click();
 await p.getByRole('button',{name:'Sign In',exact:true}).waitFor();
 assert.equal(await p.locator('#dominion-workspace h1').count(),0);
 await p.getByRole('textbox',{name:'Email'}).fill('internal-fixture@example.invalid');
 await p.locator('input[type=password]').fill('local-fixture');
 await p.getByRole('button',{name:'Sign In',exact:true}).click();
 await loaded(p);
 await desk.close();

 const [mobile,m]=await context({mobile:true,phase:'empty'});
 await open(m);
 await loaded(m);
 await m.getByText('Paused',{exact:true}).waitFor();
 await m.getByText('Disabled',{exact:true}).waitFor();
 await m.getByText('No reservation records yet.').waitFor();
 await m.getByText('No packaging activity yet.').waitFor();
 await m.locator('[data-admin-menu]').click();
 assert.ok(await m.getByRole('link',{name:'Stock & packing status',exact:true}).isVisible());
 assert.ok(await m.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await mobile.close();

 const [waiting,w]=await context({phase:'loading'});
 const seen=new Promise(r=>{requestSeen=r;});
 await open(w);
 await seen;
 await w.getByText('Loading stock and packing status…').waitFor();
 resume();
 await loaded(w);
 await waiting.close();
 for(const [code,phase,message] of [
  [503,'native','Could not load status. Reload to try again.'],
  [200,'malformed','Could not load status. Reload to try again.'],
  [404,'native','Status is unavailable on this deployment.'],
  [403,'native','Sign in again with an authorised Admin account.']
 ]){
  const [ctx,page]=await context({status:code,phase});
  await open(page);
  await page.getByText(message,{exact:true}).waitFor();
  assert.equal(await page.locator('.dominion-mode').count(),0);
  await ctx.close();
 }
 assert.deepEqual([...modules],['?build=unification78b-81b1']);
 assert.ok(reads.length>=8);
 assert.ok(reads.every(([method,signed])=>method==='GET'&&signed));
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 console.log('PASS Stage B Chromium: authorised '+(fixtureOnly?'fixture':'native PostgreSQL')+' reads; denial; sign-out and re-auth; loading, empty, missing and error states; mobile menu; no workspace writes or duplicate shell identity');
}finally{await browser.close();if(pool)await pool.end();await new Promise(r=>server.close(r));}
