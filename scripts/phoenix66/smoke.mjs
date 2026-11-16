import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';

const packageRoot=resolve(process.argv[2]),candidate=resolve(packageRoot,'nightfall');
const load=path=>import(pathToFileURL(resolve(candidate,path)).href);
const {initialComponents}=await load('admin/data.mjs');
const {lesPaulKitAssembly}=await load('admin/assemblies.mjs');
const {financeActivation}=await load('admin/orders/finance-activation.mjs');
const {createFinancialRepository}=await load('admin/orders/financial-record.mjs');
const {publicBackendConfig}=await load('backend/public-config.mjs');
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const orderId='11111111-1111-4111-8111-111111111111', adminId='22222222-2222-4222-8222-222222222222';
const record={version:1,orderId,orderBasisHash:'a'.repeat(64),revision:0,document:null,history:[]};
assert.equal(financeActivation.enabled,true);
const auth={async accessToken(){return 'fixture-admin-session';}};
const finance=createFinancialRepository({auth,request:async(url,options)=>{
 assert.equal(new URL(url).pathname,'/rest/v1/rpc/command63_financial_read');
 assert.equal(options.method,'POST');
 assert.equal(options.headers.Authorization,'Bearer fixture-admin-session');
 return Response.json(record);
}});
assert.equal((await finance.read(orderId)).record.orderId,orderId);
finance.dispose();
const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBAAZjF04AAAAASUVORK5CYII=';
const rows=initialComponents().map((x,i)=>({id:x.id,sku:'FIXTURE-'+i,name:'Fixture '+x.id,category:x.category,manufacturer:'Fixture',description:'Fictional component',specs:x.specs,
 product_content:{productTitle:'Fixture '+x.id,technicalSpecs:x.technicalSpecs},individually:true,in_kits:true,active:true,sale_price:500,kit_price:250,kit_price_quantity:1,stock:10,image:photo}));
const kit=lesPaulKitAssembly.kitDefinition;
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
let root=candidate;
const server=createServer(async(req,res)=>{
 const p=new URL(req.url,'http://localhost/').pathname;
 const send=(status,body,type)=>{res.writeHead(status,{'Content-Type':type,'X-Content-Type-Options':'nosniff'});res.end(body);};
 try{
  const suffix=p.endsWith('/')?'index.html':'';
  const file=resolve(root,'.'+p+suffix);
  assert(file.startsWith(root+'/'));
  send(200,await readFile(file),mime[extname(file)]||'application/octet-stream');
 }catch(e){send(404,await readFile(resolve(root,'404.html')),'text/html');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
const cases=[],blockedWrites=[];
let checkouts=0;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_BIN,args:['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1','--no-proxy-server','--disable-background-networking']});
 const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await ctx.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url()),p=url.pathname,method=req.method();
  if(url.origin===origin)return route.continue();
  if(url.origin!==publicBackendConfig.url)return route.abort();
  const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'apikey,authorization,content-type,prefer,x-client-info','access-control-allow-methods':'GET,POST,OPTIONS'};
  if(method==='OPTIONS')return route.fulfill({status:204,headers});
  const reply=(json,status=200)=>route.fulfill({headers,status,json});
  if(p==='/auth/v1/user'&&method==='GET')return reply({id:adminId});
  if(p==='/rest/v1/admin_members'&&method==='GET')return reply([{user_id:adminId}]);
  if(p==='/rest/v1/rpc/get_site_operations'&&method==='POST')return reply({server_time:new Date().toISOString(),store:{state:'OPEN',desired_state:'OPEN'}});
  if(p==='/functions/v1/create-checkout'&&method==='POST'){
   checkouts++;const payload=req.postDataJSON();assert(Array.isArray(payload.items)&&payload.items.length===1);
   return reply({message:'Fixture checkout reached. No order was created.'},400);
  }
  if(method==='POST'&&['/rest/v1/rpc/public_commercial_destinations','/rest/v1/rpc/public_news','/rest/v1/rpc/get_customer_aftercare'].includes(p))return reply([]);
  if(method!=='GET'){blockedWrites.push(p);return route.abort();}
  if(p==='/rest/v1/catalogue_components'){
   const id=url.searchParams.get('id')?.replace(/^eq\./,''),cols=url.searchParams.get('select').split(',');
   return reply(rows.filter(x=>!id||id===x.id).map(x=>Object.fromEntries(cols.map(k=>[k,x[k]]))));
  }
  if(p==='/rest/v1/catalogue_wiring_kits')return reply([{id:lesPaulKitAssembly.id,name:'Fixture kit',sku:'FIX-KIT',category:'kits',slug:'les-paul',base_price:1000,show_on_wiring_kits:true,builder_enabled:true,default_wiring_style:'modern',defaults:kit.defaults,builder_options:kit.builderOptions,component_resolvers:kit.componentResolvers}]);
  if(p==='/rest/v1/kit_permitted_components')return reply(rows.map(r=>({assembly_id:lesPaulKitAssembly.id,component_id:r.id})));
  if(p==='/rest/v1/commerce_shipping')return reply([{standard_delivery_pence:300,free_delivery_threshold_pence:3000}]);
  if(p==='/rest/v1/components')return reply(rows);
  if(p==='/rest/v1/inventory')return reply(rows.map(x=>({component_id:x.id,quantity:x.stock,stock_unit:'item'})));
  return reply([]);
 });
 const page=await ctx.newPage();
 const show=s=>page.locator(s).first().waitFor({state:'visible',timeout:10000});
 const go=async(path,selector)=>{await page.goto(origin+path);await show(selector);cases.push(path);};
 const decode=s=>page.waitForFunction(sel=>{const i=document.querySelector(sel);return i?.complete&&i.naturalWidth>0;},s,{timeout:10000});
 for(const variant of ['baseline','nightfall']){
  root=resolve(packageRoot,variant);
  await go('/','.site-header');
  await page.locator('.menu-button').click();
  await show('#mobile-nav');
  await go('/components/treble-bleeds/','#bleed-cap');
  await decode('#bleed-cap img');
  await go('/products/bleed-cap/','#product-detail');
  await decode('#product-detail img');
 }
 await page.locator('#product-detail button.button').click();
 await show('.product-feedback a');
 await go('/basket/','.basket-total');
 await go('/checkout/','#checkout-submit');
 await page.locator('#checkout-submit').click();
 await page.waitForFunction(()=>document.body.textContent.includes('Fixture checkout reached'),null,{timeout:10000});
 assert.equal(checkouts,1);
 await go('/wiring-generator/','#generator-mount svg');
 await go('/treble-bleed-designer/','#response-graph');
 await go('/les-paul-kits/','#kit-options .kit-section summary');
 await go('/circuit-forge/','#forge-diagram svg');
 await go('/admin/','.admin-access-gate input[name="password"]');
 await page.evaluate(()=>localStorage.setItem('apparition.admin.supabase-session.v1',JSON.stringify({access_token:'fixture-admin-session',refresh_token:'unused',expires_at:Math.floor(Date.now()/1000)+3600})));
 await go('/admin/?view=inventory','[data-component-id],#add-component:enabled');
 await go('/admin/orders/','#orders-empty');
 await go('/admin/hub-cms/','#cms-new');
 assert.deepEqual(blockedWrites,[]);
 await ctx.close();
 console.log(JSON.stringify({browser:browser.version(),routes:cases,blackLedgerSyntheticRead:true,checkoutFixtureCalls:checkouts,productionRequests:0}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
