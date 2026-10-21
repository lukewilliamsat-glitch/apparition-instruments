// Actual repository UI + native HTTP cache, realistic synthetic PNG bodies.
import assert from 'node:assert/strict';import {createServer} from 'node:https';import {readFile,writeFile,readlink,mkdir} from 'node:fs/promises';import {resolve,join,extname} from 'node:path';import {pathToFileURL} from 'node:url';import {execFileSync} from 'node:child_process';import {createHash,X509Certificate} from 'node:crypto';import {gzipSync} from 'node:zlib';
import {workload,sha} from './fixtures.mjs';
import {browserWorkload,fixtureKitRows,fixtureKitPermissions} from './browser-fixture.mjs';
const [output,executablePath,controller,candidateCommit]=process.argv.slice(2),root=resolve('dist');
const proof=JSON.parse(await readFile(join(output,'STAGE_A_RESULTS.json')));assert.equal(proof.status,'PASS');assert.equal(proof.namespace,await readlink('/proc/self/ns/net'));
let server,assetsServer,browser,appOrigin,assetOrigin,current,currentPage,mode='eager',neutral=false,phase,stats;
const report={sourceCommit:candidateCommit,kind:'real Chrome synthetic image-scale acceptance',status:'FAIL',cases:[],measurements:[],unexpected:[],pageErrors:[],screenshots:[],productionRequests:0};
const mime={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
function send(res,status,body,type='application/json',cache='no-store',gzip=false,cors=false){let b=Buffer.isBuffer(body)?body:Buffer.from(body);if(gzip)b=gzipSync(b);res.writeHead(status,{'content-type':type,'content-length':b.length,'cache-control':cache,...gzip?{'content-encoding':'gzip'}:{},...cors?{'access-control-allow-origin':appOrigin}:{}});res.end(b);return b.length;}
function imageResponse(path,res){const prefix=neutral?'/shop/v2':'';if(!path.startsWith(prefix+'/assets/catalogue-images/'))return send(res,404,'missing','text/plain');const logical=path.slice(prefix.length);
 if(logical.endsWith('.json')){stats.manifestGETs++;return send(res,200,JSON.stringify(current.manifest),'application/json','no-store',true,true);}
 const asset=current.assets.get(logical);if(!asset)return send(res,404,'missing','text/plain');stats.imageGETs++;stats.imageBodyBytes+=asset.bytes.length;return send(res,200,asset.bytes,'image/png','public,max-age=31536000,immutable',false,true);
}
async function serve(req,res){const u=new URL(req.url,appOrigin),p=u.pathname;
 if(p.startsWith('/assets/catalogue-images/'))return imageResponse(p,res);
 if(p==='/backend/public-config.mjs')return send(res,200,'export const publicBackendConfig='+JSON.stringify({url:appOrigin,publishableKey:'sb_publishable_fixture'})+';','text/javascript');
 if(p==='/backend/image-delivery-config.mjs')return send(res,200,'export const imageDeliveryConfig='+JSON.stringify({enabled:true,verificationMode:mode,assetOrigin:neutral?assetOrigin:appOrigin,assetBasePath:neutral?'/shop/v2':'',manifestPath:'/assets/catalogue-images/manifest.json'})+';','text/javascript');
 if(p.startsWith('/rest/v1/')){
  if(p==='/rest/v1/catalogue_delivery_v2'){assert(!u.searchParams.get('select').split(',').includes('image'));stats.metadataGETs++;return send(res,200,JSON.stringify(current.rows),'application/json','no-store',true);}
  if(p==='/rest/v1/catalogue_components'){assert(!u.searchParams.get('select').split(',').includes('image'));stats.technicalGETs++;return send(res,200,JSON.stringify(current.rows.map(({image_identity,image_reference,...r})=>r)),'application/json','no-store',true);}
  if(p==='/rest/v1/catalogue_wiring_kits')return send(res,200,JSON.stringify(fixtureKitRows()));
  if(p==='/rest/v1/kit_permitted_components')return send(res,200,JSON.stringify(fixtureKitPermissions(current)));
  if(['/rest/v1/catalogue_options','/rest/v1/rpc/public_commercial_destinations','/rest/v1/rpc/public_news'].includes(p))return send(res,200,'[]');
  if(p==='/rest/v1/rpc/get_site_operations')return send(res,200,JSON.stringify({server_time:new Date().toISOString(),store:{state:'OPEN',desired_state:'OPEN',customer_message:'Synthetic only'}}));
  report.unexpected.push({path:p,phase});return send(res,400,'{}');
 }
 if(p==='/operations/snapshot.json')return send(res,200,JSON.stringify({store:{state:'OPEN',desired_state:'OPEN'},news:[]}));
 let relative=p.slice(1);if(p.endsWith('/'))relative+='index.html';if(/^products\/[^/]+\/index.html$/.test(relative))relative='products/index.html';
 const file=resolve(root,relative);if(!file.startsWith(root+'/')||/^products\/.*\.(png|jpg|webp)$/.test(relative))return send(res,404,'missing','text/plain');
 try{let b=await readFile(file);if(relative==='style.css')b=Buffer.from(b.toString().replace(/@import\s+url\(['"]https:\/\/fonts\.googleapis\.com\/[^'"]+['"]\);/g,'/* Isolated fixture: shipped fallback fonts. */'));return send(res,200,b,mime[extname(file)]||'application/octet-stream');}catch(e){if(e.code!=='ENOENT')throw e;return send(res,404,'missing','text/plain');}
}
const emptyStats=()=>({imageGETs:0,imageBodyBytes:0,metadataGETs:0,technicalGETs:0,manifestGETs:0,encodedTrackedBytes:0,cacheFlags:0});
try{
 const key=join(process.env.HOME,'scale-key.pem'),cert=join(process.env.HOME,'scale-cert.pem');execFileSync('/usr/bin/openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost','-addext','subjectAltName=IP:127.0.0.1','-keyout',key,'-out',cert],{stdio:'ignore'});
 const pem=await readFile(cert),options={key:await readFile(key),cert:pem},spki=createHash('sha256').update(new X509Certificate(pem).publicKey.export({type:'spki',format:'der'})).digest('base64');
 server=createServer(options,(req,res)=>serve(req,res).catch(e=>{report.unexpected.push({error:String(e),phase});res.destroy();}));await new Promise(r=>server.listen(0,'127.0.0.1',r));appOrigin='https://127.0.0.1:'+server.address().port;
 assetsServer=createServer(options,(req,res)=>imageResponse(new URL(req.url,assetOrigin).pathname,res));await new Promise(r=>assetsServer.listen(0,'127.0.0.1',r));assetOrigin='https://127.0.0.1:'+assetsServer.address().port;
 const {chromium}=await import(pathToFileURL(controller));browser=await chromium.launch({executablePath,headless:true,chromiumSandbox:true,args:['--disable-extensions','--disable-background-networking','--disable-component-update','--no-proxy-server','--ignore-certificate-errors-spki-list='+spki]});report.browser=browser.version();report.node=process.version;
 await mkdir(join(output,'SCALE_SCREENSHOTS'),{recursive:true});
 for(const [count,size,unique] of [[14,102400,10],[100,512000,25],[500,512000,50]]){
  current=browserWorkload(count,size,unique);
  for(mode of ['eager','demand']){
   neutral=false;phase=count+' '+mode;stats=emptyStats();
   const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:900}}),page=await context.newPage(),cdp=await context.newCDPSession(page),tracked=new Set();currentPage=page;await cdp.send('Network.enable');
   page.on('pageerror',e=>report.pageErrors.push({phase,error:String(e)}));context.on('request',r=>{if(![appOrigin,assetOrigin].includes(new URL(r.url()).origin))report.unexpected.push({phase,url:r.url()});});
   cdp.on('Network.requestWillBeSent',e=>{if(e.request.url.includes('/assets/catalogue-images/')||e.request.url.includes('/catalogue_delivery_v2?'))tracked.add(e.requestId);});
   cdp.on('Network.loadingFinished',e=>{if(tracked.has(e.requestId))stats.encodedTrackedBytes+=e.encodedDataLength;});cdp.on('Network.requestServedFromCache',e=>{if(tracked.has(e.requestId))stats.cacheFlags++;});
   const start=performance.now();await page.goto(appOrigin+'/components/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(n=>document.querySelectorAll('.component-card[data-product]').length===n&&document.querySelector('.component-card h3')?.textContent.startsWith('Fixture'),count,{timeout:60000});const usableMs=performance.now()-start;
   const id=current.rows[0].id;await page.locator('#'+id).scrollIntoViewIfNeeded();await page.waitForSelector('#'+id+' img',{timeout:60000});await page.locator('#'+id+' img').evaluate(img=>img.decode());
   const firstImageMs=performance.now()-start;await page.waitForTimeout(150);const cold={...stats},heap=await page.evaluate(()=>performance.memory?.usedJSHeapSize??null);
   if(mode==='eager')assert.equal(cold.imageGETs,unique);else assert(cold.imageGETs<unique,'Demand must not fetch entire catalogue');
   if(count===100&&mode==='demand'){const p='scale-100-desktop.png';await page.screenshot({path:join(output,'SCALE_SCREENSHOTS',p)});report.screenshots.push(p);}
   const warmStart=performance.now();await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(n=>document.querySelectorAll('.component-card[data-product]').length===n,count,{timeout:60000});await page.locator('#'+id).scrollIntoViewIfNeeded();await page.waitForSelector('#'+id+' img');await page.locator('#'+id+' img').evaluate(img=>img.decode());await page.waitForTimeout(100);assert.equal(stats.imageBodyBytes,cold.imageBodyBytes,'Warm native HTTP cache must avoid image bodies');
   report.measurements.push({count,size,unique,mode,metadataUsableMs:usableMs,firstVerifiedImageVisibleMs:firstImageMs,cold,warmAdditionalImageGETs:stats.imageGETs-cold.imageGETs,warmAdditionalImageBytes:stats.imageBodyBytes-cold.imageBodyBytes,warmMs:performance.now()-warmStart,observedJSHeapBytes:heap});
   report.cases.push({name:phase,status:'PASS'});await context.close();
  }
 }
 // Exact same synthetic identities/manifest/bytes, different controlled origin + base.
 current=browserWorkload(14,102400,10);const before=JSON.stringify(current.rows);neutral=true;mode='demand';phase='neutral host /shop/v2';stats=emptyStats();const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();context.on('request',r=>{if(![appOrigin,assetOrigin].includes(new URL(r.url()).origin))report.unexpected.push({phase,url:r.url()});});
 await page.goto(appOrigin+'/components/');await page.waitForFunction(()=>document.querySelectorAll('.component-card[data-product]').length===14);const id=current.rows[0].id;await page.locator('#'+id).scrollIntoViewIfNeeded();await page.waitForSelector('#'+id+' img');await page.locator('#'+id+' img').evaluate(i=>i.decode());assert((await page.locator('#'+id+' img').getAttribute('data-verified-source')).startsWith(assetOrigin+'/shop/v2/assets/'));assert.equal(JSON.stringify(current.rows),before);report.cases.push({name:phase,status:'PASS'});await context.close();
 assert.equal(report.unexpected.length,0);assert.equal(report.pageErrors.length,0);report.status='PASS';
 report.method='Actual loopback HTTPS, native cache, no interception. Repository static resources are no-store; tracked counts isolate synthetic product imagery. Heap values are Chrome estimates, not decoded-image or total process memory. Fallback fonts only; no production/CDN/billing claims.';
}catch(e){report.failure={error:String(e),stack:e.stack};if(currentPage&&!currentPage.isClosed())report.fixtureDOM=await currentPage.evaluate(()=>({title:document.title,cards:document.querySelectorAll('.component-card[data-product]').length,status:document.getElementById('component-status')?.textContent})).catch(()=>null);process.exitCode=1;}
finally{await browser?.close();if(server)await new Promise(r=>server.close(r));if(assetsServer)await new Promise(r=>assetsServer.close(r));await writeFile(join(output,'BROWSER_SCALE_RESULTS.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,passed:report.cases.length,failure:report.failure}));}
