import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve,extname } from 'node:path';
import { createRequire } from 'node:module';
import { marketplaceWalkthrough } from './reconciliation-fixture79.mjs';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.DOMINION_PLAYWRIGHT);
const {Pool}=require(process.env.DOMINION_PG_MODULE);
const root=resolve(process.env.DOMINION_STATIC_FIXTURE);
const local=new URL('./',import.meta.url);
const db=new Pool({host:'127.0.0.1',port:55478,database:'dominion79_fixture',user:'postgres',max:2,connectionTimeoutMillis:3000,statement_timeout:3500});
const Q=(s,p)=>db.query(s,p);
const [{name}]=(await Q('select current_database() name')).rows;
assert.equal(name,'dominion79_fixture');
const token='fixture-authorized-workshop-79',denied='fixture-denied-workshop-79';
const uid='79aa0000-0000-4000-8000-000000000079';
const mime={'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2'};
const fixtures=new Set(['workspace79.mjs','workspace79.css','quartermaster.mjs','contracts.mjs']);
const routes=new Set(['/admin/quartermaster/','/admin/marketplace/']);
let app=await readFile(root+'/admin/application.mjs','utf8');
const routeMark=" ['conjure','Conjure website editor'";
assert.equal(app.split(routeMark).length,2);
app=app.replace(routeMark," ['quartermaster','QUARTERMASTER: Packing','/admin/quartermaster/','Sales'],['marketplace','MARKETPLACE: Reconciliation','/admin/marketplace/','Sales'],\n"+routeMark);
const errors=[],apiCalls=[];
async function packing(orderId){
 const data=(await Q(`select o.id,o.reference,q.picked,q.measured_grams,q.measured_mm,q.postal_class,q.tracking,
 quartermaster79.cost_evidence(o.id) cost,quartermaster79.ready_stock(q.sku) stock
 from quartermaster79.packing q join public.orders o on o.id=q.order_id where q.state='packed' and (q.order_id=$1::uuid or $1::uuid is null and q.tracking='SYNTHETIC-79') order by o.id limit 2`,[orderId])).rows;
 assert.equal(data.length,1);
 const v=data[0], c=await db.connect();
 try{
  const actor=(await c.query('select user_id from public.admin_members limit 1')).rows[0].user_id;
  await c.query('begin read only');
  await c.query('set local role authenticated');
  await c.query("select set_config('request.jwt.claim.sub',$1,true)",[actor]);
  const row=(await c.query('select public.quartermaster80_order($1) as workspace',[v.id])).rows[0].workspace;
  return {...row,parcel:{grams:v.measured_grams,outerMm:v.measured_mm,postalClass:v.postal_class,tracking:v.tracking},stock:v.stock};
 }finally{await c.query('rollback');c.release();}
}
const server=createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');
 const reply=(status,body,type='application/json')=>res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store'}).end(body);
 try{
  if(req.method!=='GET')return reply(405,'{"message":"No write endpoint"}');
  if(['/_dominion-fixture/quartermaster','/_dominion-fixture/marketplace'].includes(u.pathname)){
   const authorized=req.headers.authorization==='Bearer '+token;
   apiCalls.push({path:u.pathname,authorized});
   if(!authorized)return reply(403,'{"message":"Admin required"}');
   const oid=u.searchParams.get('order');
   if(oid&&!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(oid))return reply(400,'{"message":"Invalid order identity"}');
   const value=u.pathname.endsWith('/quartermaster')?await packing(oid):await marketplaceWalkthrough(Q);
   return reply(200,JSON.stringify(value));
  }
  if(u.pathname==='/admin/application.mjs')return reply(200,app,mime['.mjs']);
  if(routes.has(u.pathname))return reply(200,await readFile(new URL('workspace79.html',local)),mime['.html']);
  if(u.pathname.startsWith('/admin/dominion-fixture/')){
   const key=u.pathname.split('/').at(-1);
   if(!fixtures.has(key))return reply(404,'{}');
   return reply(200,await readFile(new URL(key,local)),mime[extname(key)]);
  }
  const file=resolve(root,'.'+u.pathname+(u.pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+'/'))return reply(403,'{}');
  return reply(200,await readFile(file),mime[extname(file)]??'application/octet-stream');
 }catch(e){
  if(e.code!=='ENOENT')errors.push(e.message);
  reply(e.code==='ENOENT'?404:500,'{}');
 }
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.DOMINION_CHROMIUM,headless:true,args:['--no-sandbox','--disable-background-networking']});
const allErrors=[],modules=new Map();
async function context(isAdmin,mobile=false){
 const ctx=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1360,height:850}});
 await ctx.addInitScript(({session})=>{
  if(window.top!==window||sessionStorage.getItem('d79-init'))return;
  sessionStorage.setItem('d79-init','true');
  localStorage.setItem('apparition.admin.supabase-session.v1',JSON.stringify({access_token:session,refresh_token:session,expires_at:Math.floor(Date.now()/1000)+7200}));
 },{session:isAdmin?token:denied});
 await ctx.route('**/*',async route=>{
  const r=route.request(),u=new URL(r.url());
  if(u.origin===origin){
   if(u.pathname.endsWith('.mjs')){if(!modules.has(u.pathname))modules.set(u.pathname,new Set());modules.get(u.pathname).add(u.search);}
   return route.continue();
  }
  if(u.hostname==='acdxpxvksvdwfajntzfx.supabase.co'){
   const reply=(json,status=200)=>route.fulfill({json,status,headers:{'access-control-allow-origin':origin}});
   if(u.pathname==='/auth/v1/user')return reply({id:uid});
   if(u.pathname==='/rest/v1/admin_members')return reply(r.headers().authorization==='Bearer '+token?[{user_id:uid}]:[]);
   if(u.pathname==='/auth/v1/logout')return reply({});
   if(u.pathname==='/auth/v1/token'&&r.method()==='POST'&&isAdmin)return reply({access_token:token,refresh_token:token,expires_in:7200});
  }
  if(u.hostname==='apparitioninstruments.co.uk'&&['image','font','stylesheet'].includes(r.resourceType())){
   const p=resolve(root,'.'+u.pathname);
   if(p.startsWith(root+'/'))try{return await route.fulfill({body:await readFile(p),contentType:mime[extname(p)]??'application/octet-stream'});}catch{}
  }
  return route.abort();
 });
 const page=await ctx.newPage();page.on('pageerror',e=>allErrors.push(e.message));
 return [ctx,page];
}
const start=async(page,path)=>page.goto(origin+path,{waitUntil:'load'});
try{
 assert.equal((await fetch(origin+'/_dominion-fixture/quartermaster')).status,403);
 assert.equal((await fetch(origin+'/_dominion-fixture/marketplace',{method:'POST',headers:{Authorization:'Bearer '+token}})).status,405);
 const [blocked,blockedPage]=await context(false);
 await start(blockedPage,'/admin/quartermaster/');
 await blockedPage.getByText('This account is not authorised for Admin access.').waitFor();
 assert.equal(await blockedPage.getByRole('heading',{name:'QUARTERMASTER',exact:true}).count(),0);
 assert.equal(apiCalls.filter(x=>x.authorized).length,0);
 await blocked.close();

 const [desk,page]=await context(true);
 await start(page,'/admin/quartermaster/');
 await page.getByText('Actual packaging: £0.50').waitFor();
 await page.getByText('Estimated postage: £1.15').waitFor();
 await page.getByText('Actual postage: £1.09').waitFor();
 await page.getByText('5 / 5 picked',{exact:false}).waitFor();
 await page.getByText('Ready for dispatch review',{exact:true}).waitFor();
 for(const [label,value] of [['Length (mm)','100'],['Width (mm)','70'],['Height (mm)','10']])await page.getByLabel(label,{exact:true}).fill(value);
 await page.getByRole('button',{name:'Find packaging that fits'}).click();
 await page.getByText('Synthetic mailer (F79-LABEL)',{exact:true}).waitFor();
 assert.equal(await page.locator('[data-workspace=quartermaster]').getAttribute('aria-current'),'page');
 await page.getByRole('button',{name:'Review measured parcel'}).click();
 await page.getByText('Parcel fits the selected format. No dispatch recorded.').waitFor();
 await page.getByRole('button',{name:'Show 50 mm workshop label'}).click();
 await page.frameLocator('iframe[title="50 mm workshop label"]').getByText('F79-LABEL').waitFor();
 await page.getByRole('link',{name:'MARKETPLACE: Reconciliation'}).click();
 await page.getByText('Existing external order matched').waitFor();
 await page.getByText('Order-level shipping: £1.50').waitFor();await page.getByText('refund evidence: £1.50 (linked for review)').waitFor();
 assert.ok(await page.getByRole('listitem').filter({hasText:'1 × Unmapped listing'}).isVisible());
 await page.getByRole('button',{name:'Sign Out',exact:true}).click();
 await page.getByRole('button',{name:'Sign In',exact:true}).waitFor();
 assert.equal(await page.getByRole('heading',{name:'MARKETPLACE',exact:true}).count(),0);
 await page.getByRole('textbox',{name:'Email'}).fill('synthetic-owner@example.invalid');
 await page.locator('input[type=password]').fill('fixture-only');
 await page.getByRole('button',{name:'Sign In',exact:true}).click();
 await page.getByText('Existing external order matched').waitFor();
 await desk.close();

 const [mobile,p]=await context(true,true);
 await start(p,'/admin/marketplace/');
 await p.getByText('Existing external order matched').waitFor();
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 const menu=p.locator('[data-admin-menu]');await menu.click();
 await p.getByRole('link',{name:'QUARTERMASTER: Packing'}).click();
 await p.getByText('Actual packaging: £0.50').waitFor();
 assert.equal(await menu.getAttribute('aria-expanded'),'false');
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await mobile.close();

 assert.deepEqual([...modules.get('/admin/application.mjs')],['?build=unification78b-c1']);
 assert.equal(modules.get('/admin/dominion-fixture/workspace79.mjs').size,1);
 assert.deepEqual(allErrors,[]);assert.deepEqual(errors,[]);
 assert.equal(apiCalls.filter(x=>x.authorized).length,5);
 console.log('PASS Chromium: authorised native evidence, permission denial, responsive navigation, label/parcel review, eBay reconciliation, sign-out/re-entry, one shared Admin module URL');
}finally{await browser.close();await db.end();await new Promise(r=>server.close(r));}
