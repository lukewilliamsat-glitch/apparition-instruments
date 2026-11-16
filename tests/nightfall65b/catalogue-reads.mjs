import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {extname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const [beforePath,afterPath]=process.argv.slice(2);
assert(beforePath&&afterPath,'Pass the exact before and after static roots.');
const imported=(root,name)=>import(pathToFileURL(resolve(root,name)).href);
const {initialComponents}=await imported(afterPath,'admin/data.mjs');
const {lesPaulKitAssembly}=await imported(afterPath,'admin/assemblies.mjs');
const {createAdminComponentRepository,createPublicComponentRepository}=await imported(afterPath,'backend/component-data.mjs');
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBAAZjF04AAAAASUVORK5CYII=';
const rows=initialComponents().map((p,i)=>({id:p.id,sku:'FIX-'+i,name:'Fixture '+p.id,category:p.category,manufacturer:'Fixture',description:'Fixture',specs:p.specs,product_content:{productTitle:'Fixture '+p.id,manufacturerKey:'fictional',technicalSpecs:p.technicalSpecs},active:true,individually:true,in_kits:true,sale_price:500+i,kit_price:300,kit_price_quantity:1,stock:10,image:png}));
const target=rows.find(row=>row.id==='bleed-cap');
assert(target);
const kit=lesPaulKitAssembly.kitDefinition;
const methods=[];
const admin=createAdminComponentRepository({async send(table,o){methods.push([table,o.query]);return Response.json([target]);}});
const [reference]=await admin.listReferences();
assert.deepEqual(methods,[['components','?select=id,name,category,manufacturer,specs,product_content']]);
assert.equal(reference.id,target.id);assert.equal(reference.manufacturerKey,'fictional');assert.deepEqual(reference.specs,target.specs);
const wrong=createPublicComponentRepository({request:async()=>Response.json([{id:'not-the-requested-id',image:png}])});
await assert.rejects(wrong.imageFor(target.id),/Invalid component image response/);
const {storefrontComponentRepository}=await imported(afterPath,'admin/component-repository.mjs');
const originalFetch=globalThis.fetch;
const queries=[];
try {
 globalThis.window={};
 globalThis.fetch=async url=>{
  const query=new URL(url).searchParams.get('select').split(',');
  queries.push(query);
  return Response.json([{...target,image:query.includes('image')?png:undefined}]);
 };
 const pageWith=id=>({getElementById:selector=>selector===id?{}:null});
 assert.equal((await storefrontComponentRepository(pageWith('basket-content')).list())[0].image,undefined);
 assert.equal((await storefrontComponentRepository(pageWith('checkout-content')).list())[0].image,undefined);
 assert.equal((await storefrontComponentRepository(pageWith('component-status')).list())[0].image,png);
 assert.equal((await storefrontComponentRepository(pageWith('kit-options')).list())[0].image,png);
 assert.deepEqual(queries.map(keys=>keys.includes('image')),[false,true]);
} finally { delete globalThis.window; globalThis.fetch=originalFetch; }
if(process.argv.includes('--unit-only')){
 console.log('PASS: Admin projection, target image identity, photo-capable routes and public request deduplication');
 process.exit(0);
}
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright-core');
let root=resolve(beforePath),origin,observed=[],bad=[],photoFailure=false;
const mime={'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,origin),p=url.pathname;
 const send=(code,body,type='application/json')=>{res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store'});res.end(body);};
 const json=body=>send(200,JSON.stringify(body));
 try{
  if(p==='/backend/public-config.mjs')return send(200,'export const publicBackendConfig='+JSON.stringify({url:origin,publishableKey:'sb_publishable_test'})+';','text/javascript');
  if(p==='/rest/v1/catalogue_components'&&req.method==='GET'){
   const keys=url.searchParams.get('select').split(','),id=url.searchParams.get('id')?.slice(3);
   observed.push({keys,id});
   if(photoFailure&&keys.join(',')==='id,image')return send(503,'{}');
   const data=rows.filter(row=>!id||row.id===id).map(row=>Object.fromEntries(keys.map(key=>[key,row[key]])));
   return json(data);
  }
  if(p==='/rest/v1/catalogue_wiring_kits')return json([{id:lesPaulKitAssembly.id,name:'Fixture kit',sku:'KIT',category:'kits',slug:'les-paul',base_price:1000,show_on_wiring_kits:true,builder_enabled:true,default_wiring_style:'modern',defaults:kit.defaults,builder_options:kit.builderOptions,component_resolvers:kit.componentResolvers}]);
  if(p==='/rest/v1/kit_permitted_components')return json(rows.map(r=>({assembly_id:lesPaulKitAssembly.id,component_id:r.id})));
  if(p==='/rest/v1/commerce_shipping')return json([{standard_delivery_pence:300,free_delivery_threshold_pence:3000}]);
  if(p==='/rest/v1/rpc/get_site_operations')return json({server_time:new Date().toISOString(),store:{state:'OPEN',desired_state:'OPEN'}});
  if(['/rest/v1/rpc/public_news','/rest/v1/rpc/public_commercial_destinations','/rest/v1/catalogue_options'].includes(p))return json([]);
  if(p.startsWith('/rest/')||p.startsWith('/auth/')||p.startsWith('/functions/')){bad.push([req.method,p]);return send(400,'{}');}
  const relative=/^\/products\/[^/]+\/$/.test(p)?'/products/index.html':p+(p.endsWith('/')?'index.html':'');
  const path=resolve(root,'.'+relative);
  assert(path.startsWith(root+'/'));
  try{return send(200,await readFile(path),mime[extname(path)]||'application/octet-stream');}catch(e){if(e.code!=='ENOENT')throw e;return send(404,'Not needed in fixture','text/plain');}
 }catch(e){bad.push(String(e));send(500,'{}');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',args:['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1','--no-proxy-server','--disable-background-networking']});
 const evidence={};
 const run=async(name,path,check)=>{
  observed=[];
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage();
  await page.addInitScript(()=>{localStorage.setItem('apparition.basket.v1',JSON.stringify({version:1,items:[{id:'fixture-basket-1',product:'component',sku:'bleed-cap',quantity:2}]}));});
  try{await page.goto(origin+path);await check(page);evidence[name]=observed.map(x=>({image:x.keys.includes('image'),photoOnly:x.keys.join(',')==='id,image',...(x.id?{id:x.id}:{})}));}
  finally{await context.close();}
 };
 const shown=(p,s)=>p.locator(s).first().waitFor({state:'visible',timeout:10000});
 const image=(p,s)=>p.waitForFunction(selector=>{const img=document.querySelector(selector);return img?.complete&&img.naturalWidth>0;},s,{timeout:10000});
 await run('detailBefore','/products/bleed-cap/',p=>image(p,'#product-detail img'));
 await run('basketBefore','/basket/',p=>shown(p,'.basket-total'));
 root=resolve(afterPath);
 await run('categoryAfter','/components/treble-bleeds/',p=>image(p,'#bleed-cap img'));
 await run('detailAfter','/products/bleed-cap/',async p=>{
  await image(p,'#product-detail img');
  const add=p.getByRole('button',{name:'Add to basket',exact:true});
  await add.click({timeout:10000});await shown(p,'.product-feedback a');
 });
 await run('basketAfter','/basket/',p=>shown(p,'.basket-total'));
 await run('checkoutAfter','/checkout/',p=>shown(p,'.basket-total'));
 await run('kitAfter','/les-paul-kits/',p=>shown(p,'#kit-options .kit-section summary'));
 photoFailure=true;
 await run('photoFailureAfter','/products/bleed-cap/',p=>shown(p,'#product-detail .product-image-fallback'));
 assert.deepEqual(bad,[]);
 const heavy={image:true,photoOnly:false},light={image:false,photoOnly:false},selected={image:true,photoOnly:true,id:target.id};
 assert.deepEqual(evidence.detailBefore,[heavy]);
 assert.deepEqual(evidence.basketBefore,[heavy]);
 assert.deepEqual(evidence.categoryAfter,[heavy]);
 assert.deepEqual(evidence.detailAfter,[light,selected]);
 assert.deepEqual(evidence.basketAfter,[light]);
 assert.deepEqual(evidence.checkoutAfter,[light]);
 assert.deepEqual(evidence.kitAfter,[heavy]);
 assert.deepEqual(evidence.photoFailureAfter,[light,selected]);
 console.log(JSON.stringify({browser:browser.version(),evidence,adminProjectionChecked:true,wrongPhotoIdentityRejected:true},null,2));
} finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
