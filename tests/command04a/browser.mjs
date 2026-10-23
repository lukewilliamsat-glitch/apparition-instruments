import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const [output,executablePath,controller,commit]=process.argv.slice(2);
const stage=JSON.parse(await readFile(join(output,'STAGE_A_RESULTS.json'),'utf8'));
const source=JSON.parse(await readFile(join(output,'NOCTURNE_SOURCE.json'),'utf8'));
assert.equal(stage.status,'PASS');assert.equal(stage.sourceCommit,commit);assert.equal(source.executionCommit,commit);assert.equal(source.inheritedBlobsVerified,993);
const candidate=await access('prototypes/command04a/index.html').then(()=>true,()=>false);
const allowed=new Set(['dist/admin/application.css','dist/admin/application.mjs','dist/admin/interaction.mjs','dist/admin/catalogue-presentation.mjs','dist/admin/sales-content-presentation.mjs',
 ...['index.html','model.mjs','controller.mjs','view.mjs','fixtures.mjs','workbench.css'].map(p=>'prototypes/command01/'+p),
 ...['schema.mjs','session.mjs','persistence.mjs','editor-view.mjs','editor.css'].map(p=>'prototypes/command02/'+p),
 ...['contracts.mjs','identity.mjs','bridge.mjs','fixture-wire.mjs','bridge.css','fixture-exit.html'].map(p=>'prototypes/command03/'+p),
 ...['index.html','entry.mjs','contract.mjs','server.mjs','wire.mjs'].map(p=>'prototypes/command04/'+p),
 ...['index.html','entry.mjs','compose.mjs','nocturne.css','fixture-exit.html'].map(p=>'prototypes/command04a/'+p)]);
let scaleCSS='';const requests=[],responses=[],errors=[],results=[],captures=[],observations=[],benchmarks=[];
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://fixture.invalid').pathname.slice(1);
 if(path==='favicon.ico'){res.writeHead(204);res.end();return;}
 if(path==='text-scale.css'){res.writeHead(200,{'content-type':'text/css'});res.end(scaleCSS);return;}
 if(!allowed.has(path)){res.writeHead(404);res.end();return;}
 try{res.writeHead(200,{'content-type':({'.html':'text/html','.mjs':'text/javascript','.css':'text/css'})[extname(path)],'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'});res.end(await readFile(resolve(path)));}catch{res.writeHead(500);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(pathToFileURL(controller));
const browser=await chromium.launch({executablePath,headless:true,chromiumSandbox:true,args:['--disable-extensions','--disable-background-networking','--disable-component-update','--disable-sync','--no-proxy-server']});
const context=await browser.newContext({serviceWorkers:'block',reducedMotion:'reduce'});context.setDefaultTimeout(8000);
await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
context.on('request',r=>requests.push({url:r.url(),type:r.resourceType()}));context.on('response',r=>responses.push({url:r.url(),status:r.status()}));
context.on('page',p=>{p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});});
await mkdir(join(output,'SCREENSHOTS'),{recursive:true});
const field=(p,name)=>p.locator('[name="'+name+'"]');
const login=async p=>{await p.locator('#bridge-start').click();await p.locator('#bridge-protected').waitFor({state:'visible'});await p.waitForFunction(()=>window.command04.workbench.snapshot().status==='ready');};
const select=async(p,id='fx-pot-01')=>{await p.locator('[data-product="'+id+'"]').click();await p.waitForFunction(id=>window.command04.workbench.snapshot().detail?.id===id,id);};
const open=async p=>{await login(p);await select(p);await p.locator('[data-enter-editor]').click();await p.waitForFunction(()=>window.command04.editor.snapshot().phase==='editing');await p.locator('#editor-workspace').evaluate(e=>e.scrollIntoView({block:'start',behavior:'auto'}));};
const review=async p=>{await p.locator('#review-changes').click();await p.locator('#change-review').waitFor({state:'visible'});};
const save=async p=>{await review(p);await p.locator('#save-fixture').click();await p.waitForFunction(()=>!['saving','review','reviewing'].includes(window.command04.editor.snapshot().phase));};
async function shot(p,mode,name){
 const filename=mode+'-'+name+'.png',bytes=await p.screenshot({path:join(output,'SCREENSHOTS',filename),fullPage:false,animations:'disabled'});
 captures.push({file:filename,scenario:name,mode,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),executionCommit:commit,application:mode==='before'?source.base:commit,browser:browser.version(),node:process.version,scroll:await p.evaluate(()=>({x:scrollX,y:scrollY})),originalPNG:true});
}
async function test(mode,name,fn,width=1440,query=''){let p;try{p=await context.newPage();await p.setViewportSize({width,height:1100});await p.goto(origin+'/prototypes/'+(mode==='before'?'command04':'command04a')+'/index.html'+query);await p.waitForFunction(()=>window.command04);if(mode==='after')await p.waitForFunction(()=>window.nocturne);await fn(p);results.push({mode,name,width,status:'PASS'});}catch(error){results.push({mode,name,width,status:'FAIL',error:String(error),stack:error.stack});}finally{if(p)await p.close();}}
try{
 for(const mode of candidate?['before','after']:['before']){
  await test(mode,'01-catalogue',async p=>{await login(p);assert.equal(await p.locator('#rows tr').count(),14);await p.evaluate(()=>scrollTo(0,0));await shot(p,mode,'01-catalogue');if(mode==='after'){const nav=await p.locator('.admin-nav-item').evaluate(e=>{const aside=e.closest('aside'),style=getComputedStyle(aside);return {display:style.display,position:style.position,top:e.getBoundingClientRect().top,headerBottom:document.querySelector('.admin-app-topbar').getBoundingClientRect().bottom,bottomConstraint:style.bottom};});observations.push({kind:'navigation-clearance',...nav});assert(nav.display==='none'||nav.top>=nav.headerBottom,'Workspace navigation stays below the header: '+JSON.stringify(nav));}});
  await test(mode,'02-selected',async p=>{await login(p);await select(p);await p.locator('#inspector').scrollIntoViewIfNeeded();await shot(p,mode,'02-selected');});
  for(const [name,width]of [['03-desktop-editor',1440],['04-tablet-editor',768],['05-mobile-editor',390]])await test(mode,name,async p=>{await open(p);observations.push({mode,width,...await p.evaluate(()=>{const rect=id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,overflow:getComputedStyle(e).overflow}};return {documentWidth:document.documentElement.scrollWidth,viewport:innerWidth,editor:rect('editor-workspace'),actions:rect('review-changes'),tabFont:getComputedStyle(document.querySelector('#editor-tabs button')).fontSize,identityFont:getComputedStyle(document.getElementById('editor-identity')).fontSize};})});await shot(p,mode,name);},width);
  await test(mode,'06-dirty-draft',async p=>{await open(p);await field(p,'description').fill('A carefully prepared description, awaiting review.');await shot(p,mode,'06-dirty-draft');});
  await test(mode,'07-change-review',async p=>{await open(p);await field(p,'description').fill('A carefully prepared component description.');await p.locator('#editor-tab-pricing').click();await field(p,'salePrice').fill('7.45');await review(p);await shot(p,mode,'07-change-review');});
  await test(mode,'08-validation',async p=>{await open(p);await field(p,'name').fill('');await field(p,'name').blur();assert(await p.locator('#review-changes').isDisabled());await shot(p,mode,'08-validation');});
  await test(mode,'09-saved',async p=>{await open(p);await field(p,'description').fill('A reviewed component description.');await save(p);assert.equal(await p.evaluate(()=>window.command04.editor.snapshot().phase),'saved');await shot(p,mode,'09-saved');});
  await test(mode,'10-conflict',async p=>{await open(p);await field(p,'description').fill('My retained proposal');await p.evaluate(()=>window.command04.fixture.actorModify('fx-pot-01',{description:'A newer authoritative description'}));await p.locator('#review-changes').click();await p.locator('#conflict-panel').waitFor({state:'visible'});await p.locator('#conflict-panel').scrollIntoViewIfNeeded();await shot(p,mode,'10-conflict');});
  await test(mode,'11-permission-denied',async p=>{await open(p);await field(p,'description').fill('A retained local proposal');await p.evaluate(async()=>{const x=window.command04;x.fixture.permissions(x.identity.snapshot().session,{productWrite:false});await x.bridge.authorize();});await p.locator('#bridge-readonly').waitFor({state:'visible'});assert(await p.locator('#review-changes').isDisabled());await p.evaluate(()=>scrollTo(0,0));await shot(p,mode,'11-permission-denied');});
  await test(mode,'12-session-expired',async p=>{await open(p);await field(p,'description').fill('Retained but unsaved');await p.evaluate(async()=>{const x=window.command04;x.identity.install({...x.identity.snapshot().session,expiresAt:Date.now()-1});});await p.locator('#bridge-protected').waitFor({state:'hidden'});await p.evaluate(()=>scrollTo(0,0));await shot(p,mode,'12-session-expired');});
  await test(mode,'13-uncertain',async p=>{await open(p);await field(p,'description').fill('A submitted proposal with a lost response');await p.evaluate(()=>window.command04.fixture.enqueue('save',async({normal})=>{await normal();throw Object.assign(Error('Synthetic response loss'),{code:'CONNECTION',outcome:'unknown'});}));await save(p);assert.equal(await p.evaluate(()=>window.command04.editor.snapshot().phase),'unknown');await p.locator('#check-outcome').scrollIntoViewIfNeeded();await shot(p,mode,'13-uncertain');});
  await test(mode,'14-auth-required',async p=>{assert(await p.locator('#bridge-protected').isHidden());assert.equal(await p.evaluate(()=>window.command04.fixture.calls.filter(c=>c.kind==='send').length),0);await shot(p,mode,'14-auth-required');});
 }
 if(candidate){
  const noOverflow=async p=>assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal document scrolling');
  const choose=async(p,section)=>{if(await p.locator('#section-select').isVisible())await p.locator('#section-select').selectOption(section);else await p.locator('#editor-tab-'+section).click();};
  const hit=async(p,id)=>{await p.locator('#'+id).scrollIntoViewIfNeeded();assert(await p.locator('#'+id).evaluate(e=>{const r=e.getBoundingClientRect(),at=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return Boolean(at&&(at===e||e.contains(at)));}),id+' must be reachable and unobscured');};
  for(const width of [390,768,1024,1440,1920])await test('after','responsive fields, sections and actions '+width,async p=>{
   await open(p);await noOverflow(p);
   for(const section of ['specifications','pricing','availability','inventory','images','general']){await choose(p,section);assert(await p.locator('#editor-panel-'+section).isVisible());await noOverflow(p);}
   await field(p,'name').fill('A carefully specified workshop potentiometer');await field(p,'sku').fill('DEMO-NOCTURNE-TEST');
   await field(p,'description').fill('Detailed component description.\n'.repeat(100));
   await choose(p,'specifications');await field(p,'series').fill('Workshop');await field(p,'reference').fill('POT-500A');
   await choose(p,'pricing');await field(p,'salePrice').fill('7.45');await field(p,'kitPrice').fill('5.95');await field(p,'kitPriceQuantity').fill('2');
   await choose(p,'availability');await field(p,'inKits').uncheck();await hit(p,'review-changes');await review(p);await noOverflow(p);await hit(p,'save-fixture');await p.keyboard.press('Escape');assert(await p.locator('#change-review').isHidden());await p.waitForFunction(()=>document.activeElement.id==='review-changes');assert.equal(await p.evaluate(()=>document.activeElement.id),'review-changes');
   if(width===1024||width===1920){await choose(p,'general');await p.locator('#editor-heading').scrollIntoViewIfNeeded();await shot(p,'after',width===1024?'15-editor-1024':'16-editor-1920');}
  },width);
  for(const width of [390,1024])await test('after','200 percent text, long values and reduced motion '+width,async p=>{
   await open(p);await field(p,'name').fill('Workshop component with unusually long descriptive text '.repeat(5));await field(p,'sku').fill('LONG-COMPONENT-REFERENCE-'.repeat(3));await field(p,'description').fill('A long, unbroken technical reference: '+('ABCDEF'.repeat(600)));
   scaleCSS='html{font-size:200%!important}\n'+await p.evaluate(()=>[...document.querySelectorAll('body,body *')].map((e,i)=>{e.dataset.textScale=String(i);return '[data-text-scale="'+i+'"]{font-size:'+parseFloat(getComputedStyle(e).fontSize)*2+'px!important}';}).join('\n'));
   await p.addStyleTag({url:origin+'/text-scale.css'});await noOverflow(p);await hit(p,'review-changes');await review(p);await noOverflow(p);await hit(p,'save-fixture');
   assert(await p.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches));
   assert(await p.locator('#review-changes').evaluate(e=>getComputedStyle(e).transitionDuration.split(',').every(x=>parseFloat(x)===0)));
   await shot(p,'after',width===390?'17-text-200-390':'18-text-200-1024');
  },width);
  await test('after','phone review and conflict comparisons remain readable',async p=>{
   await open(p);await field(p,'description').fill('Local proposal with a long explanation. '.repeat(10));await review(p);await hit(p,'save-fixture');await shot(p,'after','19-mobile-review');await p.locator('#cancel-review').click();
   await p.evaluate(()=>window.command04.fixture.actorModify('fx-pot-01',{description:'Another confirmed description. '.repeat(10)}));await p.locator('#review-changes').click();await p.locator('#conflict-panel').waitFor({state:'visible'});await noOverflow(p);await p.locator('#conflict-panel').scrollIntoViewIfNeeded();await shot(p,'after','20-mobile-conflict');await hit(p,'reload-conflict');
  },390);
  await test('after','keyboard tabs, visible focus, labels, error links and discard Escape',async p=>{
   await open(p);await p.locator('#editor-tab-general').focus();await p.keyboard.press('ArrowRight');assert.equal(await p.evaluate(()=>document.activeElement.id),'editor-tab-specifications');await p.keyboard.press('Home');
   const labels=await p.locator('#product-form input,#product-form textarea').evaluateAll(es=>es.map(e=>({name:e.name,labels:e.labels.length,described:e.getAttribute('aria-describedby').split(' ').every(id=>document.getElementById(id))})));assert(labels.every(x=>x.labels>0&&x.described));
   await field(p,'name').fill('');await p.locator('#validation-summary').waitFor({state:'visible'});assert.equal(await p.locator('#validation-summary').getAttribute('aria-live'),'polite');await p.locator('#validation-links button').first().click();assert.equal(await p.evaluate(()=>document.activeElement.name),'name');
   await field(p,'name').fill('Keyboard proposed name');await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.name),'sku');assert(await field(p,'sku').evaluate(e=>getComputedStyle(e).outlineStyle!=='none'));
   await p.locator('#discard-changes').click();await p.keyboard.press('Escape');assert(await p.locator('#discard-confirm').isHidden());assert.equal(await p.evaluate(()=>document.activeElement.id),'discard-changes');assert.equal(await field(p,'name').inputValue(),'Keyboard proposed name');
  });
  await test('after','mobile catalogue shortcut preserves a dirty draft and search stays local',async p=>{
   await open(p);await field(p,'description').fill('Retain while browsing');const reads=await p.evaluate(()=>window.command04.fixture.calls.filter(c=>c.kind==='send').length);await p.locator('#catalogue-toggle').click();assert.equal(await p.evaluate(()=>document.activeElement.id),'search');await p.locator('#search').fill('500');await noOverflow(p);assert.equal(await p.evaluate(()=>window.command04.fixture.calls.filter(c=>c.kind==='send').length),reads);await p.locator('#catalogue-toggle').click();assert.equal(await field(p,'description').inputValue(),'Retain while browsing');await hit(p,'review-changes');
  },390);
  await test('after','unknown outcome stays unresolved, pending check, then same-operation commit',async p=>{
   await open(p);await field(p,'description').fill('Uncertain response');await p.evaluate(()=>window.command04.fixture.enqueue('save',async({normal})=>{await normal();throw Object.assign(Error('Lost response'),{outcome:'unknown'});}));await save(p);
   await p.evaluate(()=>window.command04.fixture.enqueue('status',()=>({status:'unknown'})));await p.locator('#check-outcome').click();await p.waitForFunction(()=>window.command04.editor.snapshot().phase==='unknown');assert(await p.locator('#review-changes').isDisabled());assert(await p.locator('#discard-changes').isDisabled());
   await p.evaluate(()=>window.command04.fixture.enqueue('status',async({normal})=>{await new Promise(r=>window.releaseCheck=r);return normal();}));await p.locator('#check-outcome').click();await p.waitForFunction(()=>window.command04.editor.snapshot().phase==='checking');assert.match(await p.locator('#outcome-guidance').textContent(),/No new save/);await p.waitForFunction(()=>typeof window.releaseCheck==='function');await p.evaluate(()=>window.releaseCheck());await p.waitForFunction(()=>window.command04.editor.snapshot().phase==='saved');assert.equal(await p.evaluate(()=>window.command04.fixture.server.receiptCount()),1);
  });
  await test('after','confirmed failure permits explicit review without false success',async p=>{
   await open(p);await field(p,'description').fill('Rejected before commit');await p.evaluate(()=>window.command04.fixture.enqueue('save',()=>{throw Object.assign(Error('Validation rejected'),{code:'VALIDATION',outcome:'not-applied'});}));await save(p);assert.equal(await p.evaluate(()=>window.command04.editor.snapshot().phase),'error');assert.match(await p.locator('#editor-message').textContent(),/No fixture changes/);assert.equal(await p.evaluate(()=>window.command04.fixture.server.audit().length),0);assert.equal(await field(p,'description').inputValue(),'Rejected before commit');await save(p);assert.equal(await p.evaluate(()=>window.command04.editor.snapshot().phase),'saved');
  });
  await test('after','session concealment and original-owner draft recovery',async p=>{
   await open(p);await field(p,'description').fill('Private retained proposal');await p.evaluate(()=>{const x=window.command04;window.owner=x.identity.snapshot().session;x.identity.install({...window.owner,expiresAt:Date.now()-1});});assert(await p.locator('#bridge-protected').isHidden());assert.match(await p.locator('#session-title').textContent(),/expired/);assert(!(await p.locator('#bridge-session').textContent()).includes('Private retained proposal'));
   await p.evaluate(()=>window.command04.restore(window.command04.fixture.issue({subject:'fixture-operator-b'})));assert(await p.locator('#bridge-protected').isHidden());await p.evaluate(()=>window.command04.restore(window.owner));await p.locator('#bridge-protected').waitFor({state:'visible'});assert.equal(await field(p,'description').inputValue(),'Private retained proposal');
  });
  await test('after','read-only fields and denied access remain explicit',async p=>{
   await p.evaluate(()=>window.command04.restore(window.command04.fixture.issue({write:false})));await p.locator('#bridge-protected').waitFor({state:'visible'});await select(p);await p.locator('[data-enter-editor]').click();await field(p,'description').fill('Unsaved read-only proposal');assert(await p.locator('#review-changes').isDisabled());assert.match(await p.locator('#session-title').textContent(),/Read-only/);await choose(p,'inventory');assert.equal(await p.locator('#editor-panel-inventory input').count(),0);await choose(p,'images');assert.equal(await p.locator('#editor-panel-images input').count(),0);assert.equal(await p.locator('[name=privateCost]').count(),0);assert.equal(await p.evaluate(()=>window.command04.fixture.server.audit().length),0);
  });
  await test('after','catalogue permission denial conceals protected records',async p=>{
   await p.evaluate(()=>window.command04.restore(window.command04.fixture.issue({read:false,detail:false,write:false})));await p.waitForFunction(()=>window.command04.bridge.snapshot().status==='authorized'&&!window.command04.bridge.snapshot().capabilities.catalogueRead);assert(await p.locator('#bridge-protected').isHidden());assert.match(await p.locator('#session-title').textContent(),/Access denied/);assert(!(await p.locator('#bridge-session').textContent()).includes('A500K'));
  });
  for(const count of [14,100,500])await test('after','fictional workload '+count,async p=>{
   await login(p);assert.equal(await p.locator('#rows tr').count(),count);await select(p);await p.locator('[data-enter-editor]').click();await p.waitForFunction(()=>window.command04.editor.snapshot().phase==='editing');
   const before=await p.evaluate(()=>{window.rowRef=document.querySelector('#rows tr');window.rowChanges=0;window.rowObserver=new MutationObserver(es=>window.rowChanges+=es.length);window.rowObserver.observe(document.getElementById('rows'),{childList:true,subtree:true});return window.command04.fixture.calls.filter(c=>c.kind==='send').length;});
   await field(p,'description').fill('Typing does not reload the catalogue');
   assert.equal(await p.evaluate(()=>window.command04.fixture.calls.filter(c=>c.kind==='send').length),before);assert.equal(await p.evaluate(()=>window.rowChanges),0);assert(await p.evaluate(()=>window.rowRef===document.querySelector('#rows tr')));
   const measured=await p.evaluate(()=>{const start=performance.now(),x=window.command04;for(const q of ['500 kΩ','','capacitor','','workshop','','DEMO-POT',''])x.workbench.setFilter('query',q);return {searchSequenceMs:performance.now()-start,selectedId:x.workbench.snapshot().selectedId,rows:document.querySelectorAll('#rows tr').length};});assert.equal(measured.selectedId,'fx-pot-01');assert.equal(measured.rows,count);assert(measured.searchSequenceMs<2000,'Synthetic search sequence budget');await hit(p,'review-changes');benchmarks.push({fictionalProducts:count,...measured,editingCatalogueReads:0,editingRowMutations:0,productionMeasurement:false});
  },1440,'?size='+count);
 }
 assert(requests.every(r=>new URL(r.url).origin===origin));assert(responses.every(r=>[200,204].includes(r.status)));assert.equal(requests.filter(r=>['fetch','xhr','image','websocket','font'].includes(r.type)).length,0);assert.deepEqual(errors,[]);
 const expected=candidate?34:14;results.push({mode:'evidence',name:'all required original PNGs retained for upload',status:captures.length===expected?'PASS':'FAIL',actual:captures.length,expected});
 const report={status:results.every(r=>r.status==='PASS')?'PASS':'FAIL',executionCommit:commit,sourceTree:source.tree,baseline:source.base,node:process.version,browser:browser.version(),total:results.length,passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,results,observations,benchmarks,captures,requests,responses,errors,productionRequests:0,ownerDesignApproved:false};
 await writeFile(join(output,'BROWSER_RESULTS.json'),JSON.stringify(report,null,2)+'\n');
 await writeFile(join(output,'SCREENSHOT_CAPTURE_MANIFEST.json'),JSON.stringify({executionCommit:commit,sourceTree:source.tree,baseline:source.base,browser:browser.version(),captures,retention:'30-day Actions artifact only; upload/readback verification pending'},null,2)+'\n');
 console.log(JSON.stringify({status:report.status,total:report.total,passed:report.passed,failures:results.filter(r=>r.status==='FAIL')}));if(report.failed)process.exitCode=1;
}finally{await context.close();await browser.close();await new Promise(r=>server.close(r));}
