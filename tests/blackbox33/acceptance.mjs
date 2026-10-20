// Real Chrome acceptance of unchanged repository pages/modules. Fixtures replace
// only backend responses and the two served configuration modules, never source
// files. Requires a PASS from Stage A in this same loopback-only namespace.
import assert from 'node:assert/strict';import {createServer} from 'node:https';
import {readFile,writeFile,mkdir,readlink,stat} from 'node:fs/promises';
import {join,resolve,extname} from 'node:path';import {pathToFileURL} from 'node:url';
import {createHash,X509Certificate} from 'node:crypto';import {deflateSync,gzipSync} from 'node:zlib';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
const [output,executablePath,controller]=process.argv.slice(2),exec=promisify(execFile),root=resolve('dist');
const sha=v=>createHash('sha256').update(v).digest('hex');
const proof=JSON.parse(await readFile(join(output,'STAGE_A_RESULTS.json')));
assert.equal(proof.status,'PASS');assert.equal(proof.namespace,await readlink('/proc/self/ns/net'));
const report={sourceCommit:'870a99c8ed99f981728f26b1eedb415af218b424',stage:'B',status:'FAIL',browser:proof.browser,node:process.version,cases:[],failures:[],console:[],pageErrors:[],unexpected:[],serverRequests:[],browserNetwork:[],snapshots:[],limitations:['Existing catalogue has no text-search input; native category/manufacturer filters are exercised.','Existing basket item renderer has no product photograph; text-only basket is preserved.'],productionRequests:0};
let browser,server,mode='normal',phase='setup',origin;
const {initialComponents}=await import('../../dist/admin/data.mjs');
const {lesPaulKitAssembly}=await import('../../dist/admin/assemblies.mjs');
function png(r,g,b){
 const chunk=(type,data)=>{const body=Buffer.concat([Buffer.from(type),data]);let crc=0xffffffff;for(const v of body){crc^=v;for(let n=0;n<8;n++)crc=crc&1?(crc>>>1)^0xedb88320:crc>>>1;}const size=Buffer.alloc(4),sum=Buffer.alloc(4);size.writeUInt32BE(data.length);sum.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([size,body,sum]);};
 const h=Buffer.alloc(13);h.writeUInt32BE(64,0);h.writeUInt32BE(48,4);h[8]=8;h[9]=6;const scan=Buffer.alloc(48*(1+64*4));for(let y=0;y<48;y++)for(let x=0;x<64;x++){const n=y*(1+64*4)+1+x*4;scan[n]=r;scan[n+1]=g;scan[n+2]=b;scan[n+3]=255;}
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',h),chunk('IDAT',deflateSync(scan)),chunk('IEND',Buffer.alloc(0))]);
}
const colours=[[220,50,45],[220,50,45],[40,95,220],[45,170,85],[190,125,30],[140,65,200]],assets=new Map(),entries={};
const seeds=initialComponents(),products=[...seeds.filter(p=>p.category==='potentiometers').slice(0,4),...seeds.filter(p=>p.category==='capacitors').slice(0,5),...seeds.filter(p=>p.category==='treble-bleeds').slice(0,5)];
const rows=products.map((p,i)=>{const bytes=i<6?png(...colours[i]):null,data=bytes?'data:image/png;base64,'+bytes.toString('base64'):null;if(bytes){const e={sourceHash:sha(data),assetHash:sha(bytes),mime:'image/png',bytes:bytes.length,path:'/assets/catalogue-images/'+sha(bytes)+'.png'};entries[p.id]=e;assets.set(e.path,bytes);}return {id:p.id,sku:'FIXTURE-'+i,name:'Fixture '+String(i).padStart(2,'0'),category:p.category,manufacturer:i%2?'Fixture B':'Fixture A',description:'Synthetic browser acceptance component',specs:p.specs,product_content:{productTitle:'Fixture '+String(i).padStart(2,'0')},individually:true,in_kits:true,sale_price:500+i,kit_price:300,kit_price_quantity:1,stock:10+i,image_identity:data?sha(data):null,image_reference:null};});
assert.equal(rows.length,14);const target=rows[0],oldEntry=entries[target.id],secondEntry=entries[rows[2].id];
const manifest=e=>({version:1,revision:sha(JSON.stringify(e)),entries:e});const oldManifest=manifest(entries);
const replacement=png(25,185,190),newEntry={sourceHash:sha('data:image/png;base64,'+replacement.toString('base64')),assetHash:sha(replacement),mime:'image/png',bytes:replacement.length,path:'/assets/catalogue-images/'+sha(replacement)+'.png'};
assets.set(newEntry.path,replacement);const newerManifest=manifest({...entries,[target.id]:newEntry});
const manifests=new Map([[oldManifest.revision,oldManifest],[newerManifest.revision,newerManifest]]);
function state(){let current=structuredClone(rows),m=structuredClone(oldManifest);
 if(mode==='replacement'){current[0].image_identity=newEntry.sourceHash;m=structuredClone(newerManifest);}
 if(mode==='removed')current[0].image_identity=null;
 if(mode==='stale')current[0].image_identity=newEntry.sourceHash;
 if(mode==='wrong-mapping')m.entries[target.id]={...secondEntry,sourceHash:oldEntry.sourceHash};
 if(mode==='wrong-size')m.entries[target.id].bytes++;
 if(mode==='invalid-hash'){m.entries[target.id].assetHash='a'.repeat(64);m.entries[target.id].path='/assets/catalogue-images/'+ 'a'.repeat(64)+'.png';}
 if(mode==='invalid-origin')m.entries[target.id].path='https://unapproved.blackbox33.invalid/photo.png';
 if(mode==='unapproved-reference'){current[0].image_reference={kind:'object',url:'https://unapproved.blackbox33.invalid/photo.png'};current[0].image_identity=sha(current[0].image_reference.url);}
 if(mode==='rollback'){current[0].sale_price=777;current[0].stock=2;m=structuredClone(newerManifest);}
 m.revision=sha(JSON.stringify(m.entries));return {current,m};
}
const fixtureKit=lesPaulKitAssembly.kitDefinition;
const kits=[{id:lesPaulKitAssembly.id,sku:'FIXTURE-KIT',name:'Fixture wiring kit',category:'kits',slug:'les-paul',base_price:1000,show_on_wiring_kits:true,builder_enabled:true,default_wiring_style:'modern',defaults:fixtureKit.defaults,builder_options:fixtureKit.builderOptions,component_resolvers:fixtureKit.componentResolvers}];
const mime={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.webp':'image/webp'};
async function serve(req,res){const url=new URL(req.url,origin),path=url.pathname,record={phase,mode,path,method:req.method,status:null,bodyBytes:0};report.serverRequests.push(record);
 const send=(status,body,type='application/json',cache='no-store',compress=false)=>{let b=Buffer.isBuffer(body)?body:Buffer.from(body);const headers={'content-type':type,'cache-control':cache};if(compress){b=gzipSync(b);headers['content-encoding']='gzip';}record.status=status;record.bodyBytes=b.length;res.writeHead(status,{...headers,'content-length':String(b.length)});res.end(b);};
 const json=value=>send(200,JSON.stringify(value),'application/json','no-store',true);
 const {current,m}=state();
 if(path==='/backend/public-config.mjs')return send(200,'export const publicBackendConfig=Object.freeze('+JSON.stringify({url:origin,publishableKey:'sb_publishable_synthetic_fixture'})+');','text/javascript');
 if(path==='/backend/image-delivery-config.mjs')return send(200,'export const imageDeliveryConfig=Object.freeze('+JSON.stringify({enabled:true,assetOrigin:origin,manifestPath:mode==='rollback'?'/assets/catalogue-images/manifest.'+oldManifest.revision+'.json':'/assets/catalogue-images/manifest.json'})+');','text/javascript');
 if(path.startsWith('/rest/v1/')){
  const table=path.slice('/rest/v1/'.length);
  if(table==='catalogue_delivery_v2'){assert(!url.searchParams.get('select').split(',').includes('image'));const id=url.searchParams.get('id')?.replace(/^eq\./,'');return json(id?current.filter(r=>r.id===id):current);}
  if(table==='catalogue_components'){assert(!url.searchParams.get('select').split(',').includes('image'),'Embedded-image read prohibited');return json(current.map(({image_identity,image_reference,...r})=>r));}
  if(table==='catalogue_wiring_kits')return json(kits);
  if(table==='kit_permitted_components')return json(rows.map(r=>({assembly_id:lesPaulKitAssembly.id,component_id:r.id})));
  if(table==='catalogue_options'||table==='rpc/public_commercial_destinations'||table==='rpc/public_news')return json([]);
  if(table==='rpc/get_site_operations')return json({server_time:new Date().toISOString(),store:{state:'OPEN',desired_state:'OPEN',customer_message:'Synthetic fixture only'}});
  report.unexpected.push({path,method:req.method});return send(400,JSON.stringify({error:'Unrecognised fixture API'}));
 }
 if(path==='/operations/snapshot.json')return json({store:{state:'OPEN',desired_state:'OPEN',customer_message:'Synthetic fixture only'},news:[]});
 if(path.startsWith('/assets/catalogue-images/')){
  if(path.endsWith('.json')){if(mode==='missing-manifest'||mode==='manifest-outage')return send(mode==='missing-manifest'?404:503,'{}');const pin=path.match(/manifest\.([a-f0-9]{64})\.json$/)?.[1];return json(pin?manifests.get(pin)||{}:m);}
  let bytes=assets.get(path);if(mode==='invalid-hash'&&path.endsWith('a'.repeat(64)+'.png'))bytes=assets.get(oldEntry.path);
  if(!bytes||mode==='missing-image'&&path===oldEntry.path)return send(404,'missing','text/plain');
  if(['corrupt','equal-length-corrupt'].includes(mode)&&path===oldEntry.path){bytes=Buffer.from(bytes);bytes[bytes.length-1]^=1;}
  if(mode==='interrupted'&&path===oldEntry.path){record.status=200;record.interrupted=true;res.writeHead(200,{'content-type':'image/png','content-length':String(bytes.length)});res.write(bytes.subarray(0,10));res.destroy();return;}
  return send(200,bytes,mode==='wrong-mime'&&path===oldEntry.path?'image/jpeg':'image/png','public,max-age=31536000,immutable');
 }
 let relative=path.slice(1);if(path.endsWith('/'))relative+='index.html';if(/^products\/[^/]+\/index\.html$/.test(relative))relative='products/index.html';
 const file=resolve(root,relative);if(!file.startsWith(root+'/'))return send(400,'invalid path','text/plain');
 // Product photographs must only come from the synthetic content-addressed map.
 if(/^products\/.*\.(png|jpg|webp)$/.test(relative))return send(404,'No production photograph fixtures','text/plain');
 try{const b=await readFile(file);return send(200,b,mime[extname(file)]||'application/octet-stream');}catch(error){if(error.code!=='ENOENT')throw error;return send(404,'Missing fixture resource','text/plain');}
}
async function trackedContext(){const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000}});
 context.on('request',r=>{if(new URL(r.url()).origin!==origin)report.unexpected.push({url:r.url(),phase});});
 context.on('page',page=>{page.on('console',m=>{if(m.type()==='error')report.console.push({phase,text:m.text()});});page.on('pageerror',e=>report.pageErrors.push({phase,error:String(e)}));});
 const page=await context.newPage(),cdp=await context.newCDPSession(page),requests=new Map(),cache=new Set();await cdp.send('Network.enable');
 cdp.on('Network.requestWillBeSent',e=>{const r={id:e.requestId,phase,url:e.request.url,type:e.type,method:e.request.method};requests.set(e.requestId,r);report.browserNetwork.push(r);});
 cdp.on('Network.requestServedFromCache',e=>{cache.add(e.requestId);if(requests.has(e.requestId))requests.get(e.requestId).servedFromCache=true;});
 cdp.on('Network.responseReceived',e=>Object.assign(requests.get(e.requestId)||{},{status:e.response.status,fromDiskCache:e.response.fromDiskCache,fromPrefetchCache:e.response.fromPrefetchCache,mime:e.response.mimeType,servedFromCache:cache.has(e.requestId)}));
 cdp.on('Network.loadingFinished',e=>Object.assign(requests.get(e.requestId)||{},{encodedDataLength:e.encodedDataLength}));
 cdp.on('Network.loadingFailed',e=>Object.assign(requests.get(e.requestId)||{},{error:e.errorText,cancelled:e.canceled}));
 return {context,page};
}
const waitCards=async page=>{await page.waitForFunction(()=>document.querySelectorAll('.component-card[data-product]').length===14&&document.querySelector('.component-card h3')?.textContent.startsWith('Fixture'),null,{timeout:20000});};
async function photo(page,id=target.id,expected=oldEntry){const img=page.locator('#'+id+' img.component-image');await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());assert((await img.getAttribute('src')).endsWith(expected.path));const d=await img.evaluate(i=>({w:i.naturalWidth,h:i.naturalHeight,alt:i.alt,loading:i.loading,box:{width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height},fit:getComputedStyle(i).objectFit}));assert.equal(d.w,64);assert.equal(d.h,48);assert(d.alt.startsWith('Fixture'));assert.equal(d.loading,'lazy');assert(d.box.width>0&&d.box.height>0);return d;}
async function placeholder(page){await page.waitForFunction(id=>{const c=document.getElementById(id);return c?.querySelector('.component-mark')&&!c.querySelector('img.component-image');},target.id,{timeout:20000});}
async function test(name,fn){phase=name;try{await fn();report.cases.push({name,status:'PASS'});}catch(error){report.failures.push({name,error:String(error),stack:error.stack});}}
try{
 await mkdir(join(output,'SCREENSHOTS'),{recursive:true});const cert=join(process.env.HOME,'fixture-cert.pem'),key=join(process.env.HOME,'fixture-key.pem');
 await exec('/usr/bin/openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost','-addext','subjectAltName=IP:127.0.0.1,DNS:localhost','-keyout',key,'-out',cert]);
 const pem=await readFile(cert),spki=createHash('sha256').update(new X509Certificate(pem).publicKey.export({type:'spki',format:'der'})).digest('base64');
 server=createServer({key:await readFile(key),cert:pem},(req,res)=>serve(req,res).catch(e=>{report.unexpected.push({serverError:String(e),path:req.url});res.destroy();}));await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='https://127.0.0.1:'+server.address().port;
 const {chromium}=await import(pathToFileURL(controller));browser=await chromium.launch({executablePath,headless:true,chromiumSandbox:true,args:['--disable-extensions','--disable-background-networking','--disable-component-update','--disable-sync','--no-proxy-server','--ignore-certificate-errors-spki-list='+spki]});
 report.browser=browser.version();report.fixtureOrigin=origin;report.tls='Disposable loopback-only certificate, exact SPKI pinned; no broad ignoreHTTPSErrors or global trust changes';report.manifests={original:oldManifest.revision,replacement:newerManifest.revision};report.imageHashes={original:oldEntry.assetHash,replacement:newEntry.assetHash};
 const main=await trackedContext(),{page,context}=main;
 await test('cold catalogue actual pages and native image decoding',async()=>{await page.goto(origin+'/components/');await waitCards(page);const d=await photo(page);assert.equal(await page.locator('.component-card').count(),14);assert((await page.locator('#'+target.id).textContent()).includes('£5.00'));report.snapshots.push({phase,...d});});
 await test('repeat visit and native HTTP cache observation',async()=>{await page.reload();await waitCards(page);await photo(page);});
 await test('native category and manufacturer filtering',async()=>{await page.locator('[data-category-filter="capacitors"]').click();assert(await page.locator('#potentiometers').isHidden());await page.locator('[data-category-filter="all"]').click();await page.locator('#filter-brand').selectOption('Fixture A');assert(await page.locator('#'+rows[1].id).isHidden());await page.locator('#filter-brand').selectOption('all');});
 await test('detail navigation, correct photograph and return',async()=>{await page.locator('#'+target.id+' .component-detail-link').click();await page.waitForSelector('#product-detail img');const img=page.locator('#product-detail img');await img.evaluate(i=>i.decode());assert((await img.getAttribute('src')).endsWith(oldEntry.path));assert((await page.locator('#product-detail').textContent()).includes('Fixture 00'));await page.goBack();await waitCards(page);await photo(page);});
 await test('switch product and revisit prior detail',async()=>{await page.goto(origin+'/products/'+rows[2].id.toLowerCase()+'/');await page.waitForSelector('#product-detail img');assert((await page.locator('#product-detail img').getAttribute('src')).endsWith(secondEntry.path));await page.goto(origin+'/products/'+target.id.toLowerCase()+'/');await page.waitForSelector('#product-detail img');assert((await page.locator('#product-detail img').getAttribute('src')).endsWith(oldEntry.path));});
 await test('synthetic basket via actual purchase button and basket renderer',async()=>{const add=page.getByRole('button',{name:'Add to basket',exact:true});await add.waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('#product-detail button').disabled);await add.click();await page.goto(origin+'/basket/');await page.waitForSelector('.basket-item');assert((await page.locator('.basket-item').textContent()).includes('Fixture 00'));assert.equal(await page.locator('.basket-item img').count(),0);});
 await test('concurrent repository consumers and shared immutable image',async()=>{await page.goto(origin+'/components/');await waitCards(page);const result=await page.evaluate(async()=>{const {invalidatePublicReads}=await import('/backend/public-read.mjs');const {createPublicComponentRepository}=await import('/backend/component-data.mjs');invalidatePublicReads();const repo=createPublicComponentRepository();return (await Promise.all([repo.list(),repo.list(),repo.list()])).map(rows=>rows.map(r=>({id:r.id,url:r.image?.url})));});assert.equal(result.length,3);assert.equal(result[0][0].url,result[0][1].url);assert.deepEqual(result[0],result[2]);});
 for(const width of [390,768,1440])await test('visual '+width+' cards details basket',async()=>{
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/components/');await waitCards(page);await photo(page);await page.screenshot({path:join(output,'SCREENSHOTS','catalogue-'+width+'.png')});
  const overflow=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));report.snapshots.push({phase,width,overflow});
  await page.goto(origin+'/products/'+target.id.toLowerCase()+'/');await page.waitForSelector('#product-detail img');await page.locator('#product-detail img').evaluate(i=>i.decode());await page.screenshot({path:join(output,'SCREENSHOTS','detail-'+width+'.png')});
  await page.goto(origin+'/basket/');await page.waitForSelector('.basket-item');await page.screenshot({path:join(output,'SCREENSHOTS','basket-'+width+'.png')});
 });
 await test('basic keyboard focus remains usable',async()=>{await page.goto(origin+'/components/');await waitCards(page);await page.keyboard.press('Tab');report.focus=await page.evaluate(()=>({tag:document.activeElement.tagName,text:document.activeElement.textContent.trim(),outline:getComputedStyle(document.activeElement).outlineStyle}));assert.equal(report.focus.tag,'A');});
 await context.close();
 for(const fault of ['missing-manifest','manifest-outage','missing-image','corrupt','equal-length-corrupt','invalid-hash','stale','wrong-mime','wrong-size','wrong-mapping','invalid-origin','unapproved-reference','interrupted','removed'])await test('fail closed '+fault,async()=>{mode=fault;const {context,page}=await trackedContext();try{await page.goto(origin+'/components/');await waitCards(page);await placeholder(page);assert.equal(await page.locator('#'+target.id+' img').count(),0);}finally{await context.close();}});
 await test('replacement uses new immutable URL and native decoded pixels',async()=>{mode='replacement';const {context,page}=await trackedContext();try{await page.goto(origin+'/components/');await waitCards(page);await photo(page,target.id,newEntry);const colour=await page.locator('#'+target.id+' img').evaluate(i=>{const c=document.createElement('canvas');c.width=1;c.height=1;const x=c.getContext('2d');x.drawImage(i,0,0,1,1);return [...x.getImageData(0,0,1,1).data];});assert.deepEqual(colour,[25,185,190,255]);}finally{await context.close();}});
 await test('pinned history retains old image with current price and stock',async()=>{mode='rollback';const {context,page}=await trackedContext();try{await page.goto(origin+'/components/');await waitCards(page);await photo(page);assert((await page.locator('#'+target.id).textContent()).includes('£7.77'));const stock=await page.evaluate(async id=>(await import('/components/catalogue.mjs')).catalogue.find(r=>r.id===id).stock,target.id);assert.equal(stock,2);}finally{await context.close();}});
 mode='normal';
 report.resourceTiming=report.browserNetwork.filter(r=>r.url.includes('/assets/catalogue-images/')||r.url.includes('/catalogue_delivery_v2'));
 assert.equal(report.unexpected.length,0,'Unexpected API/resource destinations');assert.equal(report.pageErrors.length,0,'Uncaught browser errors');
 report.status=report.failures.length?'FAIL':'PASS';
}catch(error){report.failures.push({name:phase,error:String(error),stack:error.stack});}
finally{
 if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));
 report.failed=report.failures.length;report.passed=report.cases.length;
 await writeFile(join(output,'NETWORK_CACHE_RESULTS.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,browser:report.browser,passed:report.passed,failed:report.failed,unexpected:report.unexpected.length,failures:report.failures}));
 if(report.status!=='PASS')process.exitCode=1;
}
