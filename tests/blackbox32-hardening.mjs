// Additional acceptance gaps. No browser claims: injected Responses, local Git,
// synthetic PNGs. Always execute under run-blackbox32.py's inherited socket denial.
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,cp} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {deflateSync} from 'node:zlib';
const unintended=[];globalThis.fetch=url=>{unintended.push(String(url));throw Error('Uninjected network denied');};
const {readCatalogueComponents,boundedResponseBytes}=await import('../dist/backend/catalogue-image-delivery.mjs');
const {invalidatePublicReads}=await import('../dist/backend/public-read.mjs');
const {planImageAssets,writeImageAssets}=await import('../scripts/catalogue-image-assets.mjs');
const {preparePublication,verifyArchive,sha}=await import('../scripts/trusted-image-publisher.mjs');
const {retainedCatalogueSnapshot}=await import('../scripts/retained-catalogue-snapshot.mjs');
const {openStore,commitStore,exportStore}=await import('../scripts/durable-image-store.mjs');
const {readGeneratorCatalogue}=await import('../scripts/generate-product-pages.mjs');
const exec=promisify(execFile),root=await mkdtemp(join(tmpdir(),'blackbox32-'));
const cases=[],failures=[],metrics={};
async function test(name,fn){try{await fn();cases.push(name);}catch(error){failures.push({name,error:String(error),classification:'application defect'});}}
// Fully formed 1x1 RGBA PNG, CRC32 included. Fixtures are generated, never captured.
function png(r,g,b){
 const chunk=(type,data)=>{const name=Buffer.from(type),bytes=Buffer.concat([name,data]);let crc=0xffffffff;
  for(const v of bytes){crc^=v;for(let n=0;n<8;n++)crc=crc&1?(crc>>>1)^0xedb88320:crc>>>1;}
  const size=Buffer.alloc(4),sum=Buffer.alloc(4);size.writeUInt32BE(data.length);sum.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([size,bytes,sum]);};
 const head=Buffer.alloc(13);head.writeUInt32BE(1,0);head.writeUInt32BE(1,4);head[8]=8;head[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('IDAT',deflateSync(Buffer.from([0,r,g,b,255]))),chunk('IEND',Buffer.alloc(0))]);
}
const red=png(255,0,0),blue=png(0,0,255),data=b=>'data:image/png;base64,'+b.toString('base64');
const records=[{id:'red',image:data(red)},{id:'blue',image:data(blue)}],plan=planImageAssets(records);
const row=(id='red',image=data(red),extra={})=>({id,sku:id,name:'Fixture '+id,category:'capacitors',manufacturer:'Fixture',description:'Synthetic',specs:{Value:'0.022uF'},product_content:{},individually:true,in_kits:true,sale_price:500,kit_price:300,kit_price_quantity:2,stock:8,image_identity:image===null?null:sha(image),image_reference:null,...extra});
const delivery={enabled:true,assetOrigin:'https://images.blackbox32.invalid',manifestPath:'/assets/catalogue-images/manifest.json'};
const config={url:'https://catalogue.blackbox32.invalid',publishableKey:'sb_publishable_fixture'};
const revise=entries=>({version:1,revision:sha(JSON.stringify(entries)),entries});
function transport({rows=[row()],manifest=plan.manifest,asset,manifestError,manifestResponse}={}){
 const calls=[];const request=async(url,options={})=>{const u=new URL(url);calls.push({url,path:u.pathname,cache:options.cache});
  if(u.origin===config.url){assert.equal(u.pathname,'/rest/v1/catalogue_delivery_v2');assert(!u.searchParams.get('select').split(',').includes('image'));return Response.json(rows);}
  assert.equal(u.origin,delivery.assetOrigin);assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');
  if(u.pathname.endsWith('.json')){if(manifestError)throw manifestError;return manifestResponse?manifestResponse():Response.json(manifest);}
  if(asset)return asset(u,options);const entry=Object.values(manifest.entries).find(e=>e.path===u.pathname);assert(entry);return new Response(plan.assets.get(entry.path),{headers:{'content-type':entry.mime}});
 };return {request,calls};
}
const missing=async()=>new Response(null,{status:404});
const unavailable=r=>{assert.equal(r.image,null);assert.equal(r.imageDeliveryState,'unavailable');};
try{
 await test('wrong photo with valid revision and forged source label fails closed',async()=>{
  const entries={red:{...plan.manifest.entries.blue,sourceHash:plan.manifest.entries.red.sourceHash}},t=transport({manifest:revise(entries)});
  unavailable((await readCatalogueComponents({config,request:t.request,delivery}))[0]);
 });
 await test('shared URL cannot reuse verification for contradictory source identity',async()=>{
  const manifest=revise({red:plan.manifest.entries.red,blue:{...plan.manifest.entries.red,sourceHash:plan.manifest.entries.blue.sourceHash}}),t=transport({rows:[row(),row('blue',data(blue))],manifest});
  const [a,b]=await readCatalogueComponents({config,request:t.request,delivery});assert.equal(a.imageDeliveryState,'static');unavailable(b);
 });
 await test('shared URL cannot bypass a contradictory byte-count contract',async()=>{
  const manifest=revise({red:plan.manifest.entries.red,other:{...plan.manifest.entries.red,bytes:red.length+1}}),t=transport({rows:[row(),row('other')],manifest});
  const [a,b]=await readCatalogueComponents({config,request:t.request,delivery});assert.equal(a.imageDeliveryState,'static');unavailable(b);
 });
 await test('two legitimate products sharing bytes coalesce to one asset GET',async()=>{
  const manifest=revise({red:plan.manifest.entries.red,other:plan.manifest.entries.red}),t=transport({rows:[row(),row('other')],manifest});
  const results=await Promise.all([1,2,3].map(()=>readCatalogueComponents({config,request:t.request,delivery})));assert(results.flat().every(r=>r.imageDeliveryState==='static'));assert.equal(t.calls.length,3);metrics.concurrentConsumers={metadataGET:1,manifestGET:1,assetGET:1,embeddedGET:0};
 });
 await test('interrupted asset stream fails to placeholder without fallback',async()=>{
  const t=transport({asset:async()=>new Response(new ReadableStream({start(c){c.enqueue(red.subarray(0,10));c.error(Error('Synthetic interruption'));}}),{headers:{'content-type':'image/png'}})});
  unavailable((await readCatalogueComponents({config,request:t.request,delivery}))[0]);assert.equal(t.calls.length,3);
 });
 await test('manifest invalid JSON, rejection and redirects fail closed',async()=>{
  for(const options of [{manifestResponse:()=>new Response('{')},{manifestError:Error('Synthetic outage')},{manifestResponse:()=>{const r=Response.json(plan.manifest);Object.defineProperty(r,'redirected',{value:true});return r;}}]){
   const t=transport(options);unavailable((await readCatalogueComponents({config,request:t.request,delivery}))[0]);assert.equal(t.calls.length,2);
  }
 });
 await test('redirected or wrong-MIME asset cannot become a photograph',async()=>{
  for(const redirected of [false,true]){const t=transport({asset:async()=>{const r=new Response(red,{headers:{'content-type':redirected?'image/png':'text/plain'}});Object.defineProperty(r,'redirected',{value:redirected});return r;}});unavailable((await readCatalogueComponents({config,request:t.request,delivery}))[0]);}
 });
 await test('oversized streaming body is rejected and cancelled',async()=>{
  let cancelled=false;const response=new Response(new ReadableStream({pull(c){c.enqueue(new Uint8Array(9));},cancel(){cancelled=true;}}));
  await assert.rejects(boundedResponseBytes(response,8),/exceeds/);assert(cancelled);
 });
 await test('failed asset is coalesced briefly then recovers after retry expiry',async()=>{
  const realNow=Date.now;let now=realNow(),missingAsset=true;Date.now=()=>now;try{
   const t=transport({asset:async()=>missingAsset?missing():new Response(red,{headers:{'content-type':'image/png'}})});
   unavailable((await readCatalogueComponents({config,request:t.request,delivery}))[0]);missingAsset=false;
   unavailable((await readCatalogueComponents({config,request:t.request,delivery}))[0]);assert.equal(t.calls.length,3);
   now+=2001;assert.equal((await readCatalogueComponents({config,request:t.request,delivery}))[0].imageDeliveryState,'static');assert.equal(t.calls.length,4);
   metrics.retry={firstRead:3,immediateAdditional:0,afterExpiryAdditional:1};
  }finally{Date.now=realNow;}
 });
 await test('fresh replacement identity never displays cached old photo',async()=>{
  let changed=false;const t=transport(),original=t.request,request=async(url,options)=>{
   if(changed&&url.startsWith(config.url))return Response.json([row('red',data(blue))]);
   if(changed&&url.endsWith('.json'))return Response.json(revise({red:plan.manifest.entries.blue}));return original(url,options);
  };
  assert.equal((await readCatalogueComponents({config,request,delivery}))[0].image.key,plan.manifest.entries.red.assetHash);
  changed=true;invalidatePublicReads(request);assert.equal((await readCatalogueComponents({config,request,delivery}))[0].image.key,plan.manifest.entries.blue.assetHash);
 });
 await test('pinned image rollback preserves current authoritative price and stock',async()=>{
  const t=transport({rows:[row('red',data(red),{sale_price:777,stock:2})]}),d={...delivery,manifestPath:'/assets/catalogue-images/manifest.'+plan.manifest.revision+'.json'};
  const [r]=await readCatalogueComponents({config,request:t.request,delivery:d});assert.equal(r.imageDeliveryState,'static');assert.equal(r.sale_price,777);assert.equal(r.stock,2);
 });
 const empty=join(root,'empty'),first=join(root,'first'),second=join(root,'second');await mkdir(empty);
 const firstRows=[row()],inv={items:[{id:'red',source_sha256:sha(data(red)),asset_sha256:sha(red),decoded_bytes:red.length,mime:'image/png'}]};
 await preparePublication({rows:firstRows,previousRoot:empty,outputRoot:first,initial:true,inventory:inv,fetchImage:async id=>({id,image:data(red)})});
 let sourceFetches=0;
 await preparePublication({rows:[row('red',data(blue))],previousRoot:first,outputRoot:second,fetchImage:async id=>{sourceFetches++;return {id,image:data(blue)};}});
 await test('ordinary capture-disabled assemblies retain both versions and current metadata',async()=>{
  const remote=join(root,'archive.git');await exec('git',['init','--bare','-q',remote]);const writer=join(root,'writer');await openStore({root:writer,remote,initial:true});const initial=await commitStore({root:writer,preparedRoot:first,expectedHead:null});await commitStore({root:writer,preparedRoot:second,expectedHead:initial.commit});
  const fresh=join(root,'fresh'),opened=await openStore({root:fresh,remote});const before=sourceFetches;
  for(const name of ['ordinary-1','ordinary-2','application-rollback']){
   const output=join(root,name);await mkdir(output);await writeFile(join(output,'index.html'),name);await exportStore({root:fresh,destination:output,expectedCommit:opened.head});
   for(const bytes of [red,blue])assert.deepEqual(await readFile(join(output,'assets/catalogue-images/'+sha(bytes)+'.png')),bytes);
   assert.equal((await verifyArchive(output)).history.length,2);
   const [r]=await retainedCatalogueSnapshot([row('red',data(red),{sale_price:888,stock:1})],output,{revision:JSON.parse(await readFile(join(first,'assets/catalogue-images/manifest.json'))).revision});assert.equal(r.sale_price,888);assert.equal(r.stock,1);
  }
  assert.equal(sourceFetches,before);metrics.ordinaryAssemblies={count:3,newSourceImageReads:0,historicalVersionsRetained:2};
 });
 await test('uninitialised archive permits legacy preparation without image capture',async()=>{
  const remote=join(root,'uninitialised.git');await exec('git',['init','--bare','-q',remote]);const state=await openStore({root:join(root,'legacy-reader'),remote,allowUninitialised:true});assert.equal(state.uninitialised,true);assert.equal(state.head,null);
 });
 await test('missing immutable manifest blocks generator before metadata request',async()=>{
  const broken=join(root,'missing-manifest');await cp(second,broken,{recursive:true});const m=JSON.parse(await readFile(join(broken,'assets/catalogue-images/manifest.json')));await rm(join(broken,'assets/catalogue-images/manifest.'+m.revision+'.json'));
  let requests=0;await assert.rejects(readGeneratorCatalogue({config,request:async()=>{requests++;throw Error('No read allowed');},root:broken,staticImages:true}),/immutable manifest/);assert.equal(requests,0);
 });
 await test('missing historical image blocks archive and retained generator',async()=>{
  const broken=join(root,'missing-old-image');await cp(second,broken,{recursive:true});await rm(join(broken,'assets/catalogue-images/'+sha(red)+'.png'));
  await assert.rejects(verifyArchive(broken));let requests=0;await assert.rejects(readGeneratorCatalogue({config,request:async()=>{requests++;throw Error('No read allowed');},root:broken,staticImages:true}));assert.equal(requests,0);
 });
 await test('mislabelled source is also rejected by offline archive verification',async()=>{
  const broken=join(root,'wrong-map'),bad={red:{...plan.manifest.entries.blue,sourceHash:plan.manifest.entries.red.sourceHash}};
  await writeImageAssets({manifest:revise(bad),assets:new Map([[plan.manifest.entries.blue.path,blue]])},broken);await assert.rejects(verifyArchive(broken),/source identity mismatch/);
 });
 assert.equal(unintended.length,0);
 console.log(JSON.stringify({suite:'blackbox32-hardening',runtime:process.version,passed:cases.length,failed:failures.length,cases,failures,measurements:metrics,syntheticAssets:{red:{bytes:red.length,sha256:sha(red)},blue:{bytes:blue.length,sha256:sha(blue)}},unintendedFetchAttempts:unintended.length,productionRequests:0,browserAcceptance:false}));
 if(failures.length)process.exitCode=1;
}finally{await rm(root,{recursive:true,force:true});}
