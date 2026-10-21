// Actual COMMAND modules in hosted Chrome, after process-level isolation proof.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const [output,executablePath,controller,commit]=process.argv.slice(2);
const stage=JSON.parse(await readFile(join(output,'STAGE_A_RESULTS.json'),'utf8'));
assert.equal(stage.status,'PASS');assert.equal(stage.sourceCommit,commit);
const {chromium}=await import(pathToFileURL(controller));
const allowed=new Set([
'prototypes/command01/index.html','prototypes/command01/workbench.css','prototypes/command01/model.mjs','prototypes/command01/controller.mjs','prototypes/command01/view.mjs','prototypes/command01/fixtures.mjs','prototypes/command01/fixture-entry.mjs',
'dist/admin/application.css','dist/admin/application.mjs','dist/admin/interaction.mjs','dist/admin/catalogue-presentation.mjs','dist/admin/sales-content-presentation.mjs'
]);
const serverLog=[],requests=[],responses=[],consoleErrors=[],pageErrors=[],results=[],screenshots=[];
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer(async(req,res)=>{
 let path;try{path=decodeURIComponent(new URL(req.url,'http://fixture.invalid').pathname).replace(/^\//,'');}catch{res.writeHead(400);res.end();return;}
 if(path==='favicon.ico'){res.writeHead(204);res.end();return;}
 if(!allowed.has(path)){serverLog.push({path,status:404});res.writeHead(404);res.end('Fixture resource unavailable');return;}
 try{const body=await readFile(resolve(path));serverLog.push({path,status:200});res.writeHead(200,{'content-type':mime[extname(path)],'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'});res.end(body);}
 catch{res.writeHead(500);res.end('Local fixture failure');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
await mkdir(join(output,'SCREENSHOTS'),{recursive:true});
const browser=await chromium.launch({executablePath,headless:true,chromiumSandbox:true,args:['--disable-extensions','--disable-background-networking','--disable-component-update','--disable-sync','--no-proxy-server']});
const context=await browser.newContext({serviceWorkers:'block',reducedMotion:'reduce'});
context.on('request',r=>requests.push({url:r.url(),resource:r.resourceType()}));
context.on('response',r=>responses.push({url:r.url(),status:r.status()}));
context.on('page',p=>{p.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});p.on('pageerror',e=>pageErrors.push(String(e)));});
let page;
const waitReady=async p=>p.waitForFunction(()=>window.commandFixture?.controller?.snapshot().status==='ready');
const fresh=async(width=1440)=>{const p=await context.newPage();await p.setViewportSize({width,height:1000});await p.goto(origin+'/prototypes/command01/index.html');await waitReady(p);return p;};
const shot=async(name,p=page)=>{await p.screenshot({path:join(output,'SCREENSHOTS',name+'.png'),fullPage:true,animations:'disabled'});screenshots.push(name+'.png');};
const test=async(name,fn)=>{try{await fn();results.push({name,status:'PASS'});}catch(error){results.push({name,status:'FAIL',error:String(error),stack:error.stack});}};
const choose=async(id,p=page)=>{await p.locator('[data-product="'+id+'"]').click();await p.waitForFunction(id=>window.commandFixture.controller.snapshot().detail?.id===id,id);};
const reset=async()=>{await page.evaluate(async()=>{const f=window.commandFixture;f.transport.reset();f.controller.close();f.controller.clearFilters();await f.controller.refresh({supersede:true});});await waitReady(page);};
try{
 page=await fresh();
 await test('initial image-free catalogue and useful overview',async()=>{
  assert.equal(await page.locator('#rows tr').count(),14);assert.equal(await page.locator('#nav-count').textContent(),'14');
  assert.match(await page.locator('#inspector').textContent(),/Select a component/);
  assert.deepEqual(await page.evaluate(()=>window.commandFixture.transport.calls),[{kind:'list',id:null}]);
  await shot('desktop-overview');
 });
 await test('local search plus category filter; no extra requests',async()=>{
  await page.locator('#search').fill('film');await page.locator('#filter-category').selectOption('capacitors');
  assert.equal(await page.locator('#rows tr').count(),3);
  assert.equal(await page.evaluate(()=>window.commandFixture.transport.calls.length),1);
  await shot('desktop-active-filters');
  await page.locator('#filter-manufacturer').selectOption('Northline Parts');await page.locator('#filter-stock').selectOption('low');
  assert.equal(await page.locator('#rows tr').count(),1);assert.match(await page.locator('#rows').textContent(),/DEMO-CAP-022/);
  await page.locator('#clear-filters').click();assert.equal(await page.locator('#rows tr').count(),14);
 });
 await test('technical search and special characters are literal',async()=>{
  await page.locator('#search').fill('500 kΩ');assert.equal(await page.locator('#rows tr').count(),1);
  await page.locator('#search').fill('[.*]');assert.equal(await page.locator('#rows tr').count(),0);
  await page.locator('#empty-clear').click();
 });
 await test('individual and kit eligibility filters compose',async()=>{
  await page.locator('#filter-individual').selectOption('no');await page.locator('#filter-kit').selectOption('yes');
  assert.equal(await page.locator('#rows tr').count(),1);assert.match(await page.locator('#rows').textContent(),/DEMO-TB-SER/);
  await page.locator('#clear-filters').click();
 });
 await test('authoritative selected detail, correct price vocabulary and focus',async()=>{
  await choose('fx-pot-01');assert.equal(await page.locator('#detail-title').textContent(),'A500K audio taper potentiometer');
  assert.match(await page.locator('#inspector').textContent(),/£6.95/);assert.match(await page.locator('#inspector').textContent(),/No separate regular\/promotional price/);
  assert.match(await page.locator('#inspector').textContent(),/Metadata only/);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'detail-title');
  await shot('desktop-inspector');
 });
 await test('selected identity survives filtering out and clearing',async()=>{
  await page.locator('#filter-category').selectOption('capacitors');assert.match(await page.locator('#inspector').textContent(),/outside the current filters/);
  assert.equal(await page.evaluate(()=>window.commandFixture.controller.snapshot().selectedId),'fx-pot-01');
  await page.locator('#clear-filters').click();assert.equal(await page.locator('#detail-title').textContent(),'A500K audio taper potentiometer');
 });
 await test('change selection and Escape restore meaningful keyboard focus',async()=>{
  await choose('fx-cap-01');assert.match(await page.locator('#inspector').textContent(),/£3.25/);
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.commandFixture.controller.snapshot().selectedId),null);
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.product),'fx-cap-01');
 });
 await test('no-result state is distinct and clearable',async()=>{
  await page.locator('#search').fill('no-products-match-this-query');assert(await page.locator('#empty').isVisible());
  await shot('desktop-empty');await page.locator('#empty-clear').click();assert.equal(await page.locator('#rows tr').count(),14);
 });
 await test('simultaneous refresh requests are coalesced',async()=>{
  const delta=await page.evaluate(async()=>{const f=window.commandFixture,n=f.transport.calls.length;await Promise.all([f.controller.refresh(),f.controller.refresh(),f.controller.refresh()]);return f.transport.calls.length-n;});assert.equal(delta,1);
 });
 await test('catalogue error, retained last rows and successful explicit retry',async()=>{
  await page.evaluate(()=>window.commandFixture.transport.enqueue('list',()=>Promise.reject(new Error('Synthetic connection interrupted. Please retry.'))));
  await page.locator('#refresh').click();await page.locator('#error-panel').waitFor({state:'visible'});
  assert.equal(await page.locator('#rows tr').count(),14);assert.match(await page.locator('#result-note').textContent(),/last successful/);
  await shot('desktop-error-retry');await page.locator('#retry').click();await waitReady(page);assert(await page.locator('#error-panel').isHidden());
 });
 await test('reversed catalogue responses keep newer rows and ignore stale success',async()=>{
  await page.evaluate(async()=>{const f=window.commandFixture;let release;f.transport.enqueue('list',()=>new Promise(r=>release=r));const a=f.controller.refresh();f.transport.enqueue('list',({records})=>records.map(r=>({...r,stock:r.id==='fx-pot-01'?91:r.stock})));await f.controller.refresh({supersede:true});release(f.records());await a;});
  assert.match(await page.locator('#rows tr').first().textContent(),/91 items/);await reset();
 });
 await test('reversed detail responses never show the earlier product',async()=>{
  await page.evaluate(async()=>{const f=window.commandFixture;let release;f.transport.enqueue('detail',()=>new Promise(r=>release=r));const old=f.controller.select('fx-pot-01');await f.controller.select('fx-cap-01');release(f.records()[0]);await old;});
  assert.equal(await page.locator('#detail-title').textContent(),'0.022 µF film tone capacitor');
  assert.equal(await page.evaluate(()=>window.commandFixture.controller.snapshot().detail.id),'fx-cap-01');
 });
 await test('stale detail error is ignored after newer selection',async()=>{
  await page.evaluate(async()=>{const f=window.commandFixture;let reject;f.transport.enqueue('detail',()=>new Promise((r,j)=>reject=j));const old=f.controller.select('fx-pot-01');await f.controller.select('fx-bleed-01');reject(new Error('Old selection failed'));await old;});
  assert.equal(await page.locator('#detail-title').textContent(),'Parallel treble-bleed circuit');assert(!await page.locator('#inspector [role=alert]').count());
 });
 await test('detail failure and retry operate without changing identity',async()=>{
  await page.evaluate(async()=>{const f=window.commandFixture;f.transport.enqueue('detail',()=>Promise.reject(new Error('Synthetic detail unavailable')));await f.controller.select('fx-pot-01');});
  assert.match(await page.locator('#inspector [role=alert]').textContent(),/Synthetic detail unavailable/);
  await page.locator('[data-retry-detail]').click();await page.waitForFunction(()=>window.commandFixture.controller.snapshot().detailStatus==='ready');
  assert.equal(await page.evaluate(()=>window.commandFixture.controller.snapshot().detail.id),'fx-pot-01');
 });
 await test('search text focus and selection survive asynchronous refresh',async()=>{
  await page.locator('#search').fill('pot');await page.locator('#search').focus();
  await page.evaluate(()=>{const e=document.getElementById('search');e.setSelectionRange(1,2);});
  await page.evaluate(()=>window.commandFixture.controller.refresh());
  assert.equal(await page.evaluate(()=>document.activeElement.id),'search');
  assert.deepEqual(await page.evaluate(()=>{const e=document.getElementById('search');return[e.value,e.selectionStart,e.selectionEnd];}),['pot',1,2]);
  await page.locator('#clear-filters').click();
 });
 await test('empty successful catalogue has legitimate empty presentation',async()=>{
  await page.evaluate(async()=>{const f=window.commandFixture;f.transport.enqueue('list',()=>[]);await f.controller.refresh();});
  assert.equal(await page.locator('#empty-heading').textContent(),'No components in this fixture');assert(await page.locator('#error-panel').isHidden());await reset();
 });
 await test('duplicate and malformed records surface a useful error',async()=>{
  for(const invalid of ['duplicate','malformed']){
   await page.evaluate(async(kind)=>{const f=window.commandFixture;f.transport.enqueue('list',()=>kind==='duplicate'?[f.records()[0],f.records()[0]]:[{id:''}]);await f.controller.refresh();},invalid);
   assert(await page.locator('#error-panel').isVisible());assert.equal(await page.locator('#rows tr').count(),14);await page.locator('#retry').click();await waitReady(page);
  }
 });
 await test('deleted selected product clears without choosing another',async()=>{
  await choose('fx-pot-01');await page.evaluate(async()=>{const f=window.commandFixture;f.transport.replace(f.records().slice(1));await f.controller.refresh();});
  assert.equal(await page.evaluate(()=>window.commandFixture.controller.snapshot().selectedId),null);assert.match(await page.locator('#inspector').textContent(),/Select a component/);await reset();
 });
 await test('untrusted descriptions render as text and image URLs never load',async()=>{
  await page.evaluate(async()=>{const f=window.commandFixture;f.transport.enqueue('detail',({records})=>({...records[0],description:'<img src="https://untrusted.invalid/pixel" onerror="alert(1)">',image:'https://untrusted.invalid/photo'}));await f.controller.select('fx-pot-01');});
  assert.match(await page.locator('#inspector').textContent(),/<img src=/);assert.equal(await page.locator('#inspector img').count(),0);
  await page.locator('[data-close]').click();
 });
 await test('all explicit image states and optional specifications are usable',async()=>{
  for(const [id,expected]of [['fx-pot-01','Image identity available'],['fx-cap-01','Image not loaded'],['fx-cap-02','No image assigned'],['fx-bleed-01','Image unavailable'],['fx-switch-02','Explicit fixture removal']]){await choose(id);assert.match(await page.locator('#inspector').textContent(),new RegExp(expected));}
  assert.match(await page.locator('#inspector').textContent(),/No structured specifications/);await page.locator('[data-close]').click();
 });
 const viewportResults=[];
 for(const width of [390,768,1024,1440,1920])await test('responsive catalogue and inspector at '+width+'px',async()=>{
  await page.setViewportSize({width,height:1000});await reset();await choose('fx-wire-02');
  const dimensions=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth,inspector:document.getElementById('inspector').getBoundingClientRect().toJSON()}));
  assert(dimensions.scroll<=dimensions.inner+1,JSON.stringify(dimensions));
  assert(dimensions.inspector.width>=Math.min(width-32,290));assert(await page.locator('#detail-title').isVisible());
  viewportResults.push({width,...dimensions});
  if(width===390){await shot('mobile-inspector');await page.locator('[data-close]').click();await page.evaluate(()=>scrollTo(0,0));await shot('mobile-catalogue');}
  if(width===768)await shot('tablet-inspector');
 });
 await test('increased text at 200% remains readable and within document width',async()=>{
  await page.setViewportSize({width:1024,height:1000});
  await page.addStyleTag({content:'body[data-command01] * { font-size: max(1em, 16px) !important; } body[data-command01] { font-size: 28px !important; }'});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await shot('increased-text');
 });
 await page.close();page=await fresh();
 await test('keyboard-only product discovery and inspector close',async()=>{
  await page.locator('#search').focus();await page.keyboard.type('DEMO-POT-500A');assert.equal(await page.locator('#rows tr').count(),1);
  const count=await page.locator('button,select,input,a').count();let reached=false;
  for(let i=0;i<count+2;i++){await page.keyboard.press('Tab');if(await page.evaluate(()=>Boolean(document.activeElement.dataset.product))){reached=true;break;}}
  assert(reached);const outline=await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle);assert.notEqual(outline,'none');
  await page.keyboard.press('Enter');await page.waitForFunction(()=>document.activeElement.id==='detail-title');await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.product),'fx-pot-01');await page.locator('#clear-filters').click();
 });
 await test('labels, status regions and reduced motion are present',async()=>{
  for(const id of ['search','filter-category','filter-manufacturer','filter-individual','filter-kit','filter-stock'])assert(await page.locator('label').filter({has:page.locator('#'+id)}).count());
  assert.equal(await page.locator('#feedback').getAttribute('aria-live'),'polite');
  assert.equal(await page.locator('#error-panel').getAttribute('role'),'alert');
  assert(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches));
  assert.equal(await page.locator('h1').count(),1);
  assert.equal(await page.locator('button').filter({hasText:/Save|Publish|Delete|Upload|Adjust stock/}).count(),0);
 });
 await test('teardown prevents pending detail updates and remount avoids duplicate listeners',async()=>{
  const p=await fresh();
  await p.evaluate(async()=>{const f=window.commandFixture;let release;f.transport.enqueue('detail',()=>new Promise(r=>release=r));const pending=f.controller.select('fx-pot-01');f.destroy();release(f.records()[0]);await pending;});
  assert(!await p.locator('#inspector').textContent().then(t=>t.includes('£6.95')));await p.close();
  const q=await fresh();
  await q.evaluate(async()=>{const f=window.commandFixture;f.destroy();const {mountWorkbench}=await import('./view.mjs');window.remounted=mountWorkbench(document,{transport:f.transport});});
  await q.waitForFunction(()=>window.remounted.controller.snapshot().status==='ready');
  const delta=await q.evaluate(()=>window.commandFixture.transport.calls.length);
  await q.locator('#refresh').click();await q.waitForFunction(()=>window.remounted.controller.snapshot().status==='ready');
  assert.equal(await q.evaluate(()=>window.commandFixture.transport.calls.length),delta+1);await q.close();
 });
 await test('missing transport fails closed without any live fallback',async()=>{
  const p=await fresh();const before=await p.evaluate(()=>window.commandFixture.transport.calls.length);
  await p.evaluate(()=>window.commandFixture.mountWithoutTransport());assert.match(await p.locator('#error-message').textContent(),/synthetic transport required/);
  assert(await p.locator('#refresh').isDisabled());assert.equal(await p.evaluate(()=>window.commandFixture.transport.calls.length),before);await p.close();
 });
 await test('no application network requests escape the allowlisted fixture origin',async()=>{
  assert(requests.every(r=>new URL(r.url).origin===origin));assert(responses.every(r=>new URL(r.url).origin===origin));assert(serverLog.every(r=>r.status===200));assert.equal(requests.filter(r=>['xhr','fetch','image','websocket','eventsource'].includes(r.resource)).length,0);assert.equal(pageErrors.length,0);assert.equal(consoleErrors.length,0);
 });
 const report={status:results.every(r=>r.status==='PASS')?'PASS':'FAIL',sourceCommit:commit,node:process.version,browser:browser.version(),isolationStage:'STAGE_A_RESULTS.json',results,total:results.length,passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,viewportResults,screenshots,requests,responses,serverLog,pageErrors,consoleErrors,productionRequests:0,limitations:['Basic keyboard/semantic checks only; no full screen-reader or WCAG certification.','Synthetic transport only; no authenticated production integration.','No image bytes are loaded; image identities in fixtures are fictional.']};
 await writeFile(join(output,'BROWSER_RESULTS.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,total:report.total,passed:report.passed,failed:report.results.filter(r=>r.status==='FAIL')},null,2));
 if(report.failed)process.exitCode=1;
}finally{await browser.close();await new Promise(r=>server.close(r));}
