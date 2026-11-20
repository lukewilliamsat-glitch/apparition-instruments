import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {Pool}=require(process.env.DOMINION_PG_MODULE);
const {chromium}=require(process.env.DOMINION_PLAYWRIGHT);
const db=new Pool({host:'127.0.0.1',port:55478,database:'dominion79_fixture',user:'postgres',connectionTimeoutMillis:3000,statement_timeout:5000,max:3});
const Q=(s,p)=>db.query(s,p);
const value=async(s,p)=>Object.values((await Q(s,p)).rows[0])[0];
assert.equal(await value('select current_database()'),'dominion79_fixture');
await Q(await readFile(new URL('./workshop82.read.review.sql',import.meta.url),'utf8'));
const uid=await value('select user_id from public.admin_members limit 1');
const buyer=await value('select id from auth.users where id <> $1 limit 1',[uid]);
const order=await value("select id from public.orders where external_reference='F79-EBAY-PAID'");
const packed=await value("select order_id from quartermaster79.packing where tracking='SYNTHETIC-79'");
assert.ok(uid&&buyer&&order&&packed);
const routeRead='select public.quartermaster82_review($1)';
async function rpc(role,actor,sql,args,write=false){
 assert.ok(['authenticated','anon','service_role'].includes(role));
 const c=await db.connect();
 try{
  await c.query(write?'begin':'begin read only');
  await c.query('set local role '+role);
  if(actor)await c.query("select set_config('request.jwt.claim.sub',$1,true)",[actor]);
  const result=(await c.query(sql,args)).rows[0];
  await c.query('commit');
  return Object.values(result)[0];
 } catch(e){await c.query('rollback');throw e;}
 finally{c.release();}
}
for(const [role,user] of [['anon',null],['service_role',null],['authenticated',buyer]])
 await assert.rejects(rpc(role,user,routeRead,[order]),{code:'42501'});
const preserve="select md5(jsonb_build_array((select jsonb_agg(i order by i.component_id) from public.inventory i),(select jsonb_agg(o order by o.id) from public.orders o),(select count(*) from quartermaster79.movement),(select count(*) from public.order_financial_revisions))::text)";
await Q("select quartermaster79.reserve(o.id,$2,'F79-LABEL',dominion79.requirements(o.items)) from public.orders o where id=$1",[order,randomUUID()]);
const before=await value(preserve);
const root=resolve(process.env.DOMINION_STATIC_FIXTURE);
const mime={'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const file=resolve(root,'.'+url.pathname+(url.pathname.endsWith('/')?'index.html':''));
 if(req.method!=='GET'||!file.startsWith(root+'/'))return res.writeHead(403).end();
 try{res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream'}).end(await readFile(file));}
 catch{res.destroy();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port, token='local-workshop82-synthetic', writeCalls=[], errors=[];
const browser=await chromium.launch({executablePath:process.env.DOMINION_CHROMIUM,headless:true,args:['--no-sandbox','--disable-background-networking']});
const urlFor=id=>origin+'/admin/quartermaster/?order='+id;
async function open({permit=true,mobile=false}={}){
 const ctx=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1360,height:850}});
 await ctx.addInitScript(({t})=>localStorage.setItem('apparition.admin.supabase-session.v1',JSON.stringify({access_token:t,refresh_token:t,expires_at:Math.floor(Date.now()/1000)+7200})),{t:permit?token:'local-synthetic-buyer'});
 await ctx.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.origin===origin)return route.continue();
  if(u.origin!=='https://acdxpxvksvdwfajntzfx.supabase.co')return route.abort();
  const reply=(json,status=200)=>route.fulfill({json,status,headers:{'access-control-allow-origin':origin}});
  const verified=req.headers().authorization==='Bearer '+token;
  const actor=verified?uid:buyer;
  if(u.pathname==='/auth/v1/user')return reply({id:actor});
  if(u.pathname==='/rest/v1/admin_members')return reply(verified?[{user_id:actor}]:[]);
  try{
   if(u.pathname==='/rest/v1/rpc/quartermaster82_review'&&req.method()==='GET')
    return reply(await rpc('authenticated',actor,routeRead,[u.searchParams.get('p_order')]));
   if(u.pathname==='/rest/v1/rpc/quartermaster80_pick'&&req.method()==='POST'){
    const x=req.postDataJSON();writeCalls.push(x);
    return reply(await rpc('authenticated',actor,'select public.quartermaster80_pick($1,$2,$3,$4,$5)',[x.p_order,x.p_request,x.p_component,x.p_expected,x.p_quantity],true));
   }
   return route.abort();
  }catch(e){return reply({},e.code==='42501'?403:409);}
 });
 const page=await ctx.newPage();page.setDefaultTimeout(6000);page.on('pageerror',e=>errors.push(e.message));
 return [ctx,page];
}
try{
 const [denied,d]=await open({permit:false});await d.goto(urlFor(order));
 await d.getByText('This account is not authorised for Admin access.').waitFor();await denied.close();
 const [desktop,p]=await open();
 await Q("update quartermaster79.rollout set mode='disabled'");
 await p.goto(urlFor(order));await p.getByText(/Packing is disabled/).waitFor();
 assert.equal(await p.getByRole('button',{name:'Save picked count'}).count(),0);
 await Q("update quartermaster79.rollout set mode='observe'");
 await p.reload();await p.getByText(/Read-only packing review/).waitFor();
 assert.equal(await p.getByRole('button',{name:'Save picked count'}).count(),0);
 await p.goto(urlFor(packed));
 await p.getByText('Postage estimate: £1.15').waitFor();
 await p.getByText('Recorded postage: £1.09').waitFor();
 await p.getByText('Tracking evidence: SYNTHETIC-79').waitFor();
 assert.equal(await p.locator('[data-workspace=orders]').getAttribute('aria-current'),'page');
 await desktop.close();
 await Q("update quartermaster79.rollout set mode='workshop'");
 const [mobile,m]=await open({mobile:true});
 await m.goto(urlFor(order));await m.getByText(/Workshop picking enabled/).waitFor();
 const input=m.locator('#quartermaster-workshop input[type=number]').first();
 await input.fill('1');
 await Promise.all([m.waitForResponse(r=>r.url().endsWith('/quartermaster80_pick')&&r.status()===200),m.getByRole('button',{name:'Save picked count'}).first().click()]);
 await m.getByText(/Workshop picking enabled/).waitFor();
 assert.equal(await input.inputValue(),'1');
 await m.reload();await m.getByText(/Workshop picking enabled/).waitFor();
 assert.equal(await input.inputValue(),'1');
 assert.ok(await m.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 const x=writeCalls[0];assert.equal(writeCalls.length,1);
 assert.equal(await value('select picked from quartermaster79.pick_progress where order_id=$1',[order]),1);
 const stale=[order,randomUUID(),x.p_component,0,2];
 await assert.rejects(rpc('authenticated',uid,'select public.quartermaster80_pick($1,$2,$3,$4,$5)',stale,true),{code:'40001'});
 assert.equal(await value('select count(*)::int from quartermaster79.pick_events where order_id=$1',[order]),1);
 assert.equal(await value(preserve),before);
 await mobile.close();assert.deepEqual(errors,[]);
 console.log('PASS Quartermaster: exact scoped workshop bytes, native deny/disabled/observe, packed tracking and cost evidence, mobile picking/resume and stale rejection; no order, stock, movement or finance effects');
}finally{await browser.close();await db.end();await new Promise(r=>server.close(r));}
