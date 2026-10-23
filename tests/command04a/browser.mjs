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
 ...['index.html','entry.mjs','nocturne.css'].map(p=>'prototypes/command04a/'+p)]);
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
const open=async p=>{await login(p);await select(p);await p.locator('[data-enter-editor]').click();await p.waitForFunction(()=>window.command04.editor.snapshot().phase==='editing');await p.locator('#editor-workspace').scrollIntoViewIfNeeded();};
const review=async p=>{await p.locator('#review-changes').click();await p.locator('#change-review').waitFor({state:'visible'});};
const save=async p=>{await review(p);await p.locator('#save-fixture').click();await p.waitForFunction(()=>!['saving','review','reviewing'].includes(window.command04.editor.snapshot().phase));};
async function shot(p,mode,name){
 const filename=mode+'-'+name+'.png',bytes=await p.screenshot({path:join(output,'SCREENSHOTS',filename),fullPage:false,animations:'disabled'});
 captures.push({file:filename,scenario:name,mode,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),executionCommit:commit,application:mode==='before'?source.base:commit,browser:browser.version(),node:process.version,scroll:await p.evaluate(()=>({x:scrollX,y:scrollY})),originalPNG:true});
}
async function test(mode,name,fn,width=1440){let p;try{p=await context.newPage();await p.setViewportSize({width,height:1100});await p.goto(origin+'/prototypes/'+(mode==='before'?'command04':'command04a')+'/index.html');await p.waitForFunction(()=>window.command04);if(mode==='after')await p.waitForFunction(()=>window.nocturne);await fn(p);results.push({mode,name,width,status:'PASS'});}catch(error){results.push({mode,name,width,status:'FAIL',error:String(error),stack:error.stack});}finally{if(p)await p.close();}}
try{
 for(const mode of candidate?['before','after']:['before']){
  await test(mode,'01-catalogue',async p=>{await login(p);assert.equal(await p.locator('#rows tr').count(),14);await p.evaluate(()=>scrollTo(0,0));await shot(p,mode,'01-catalogue');});
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
 assert(requests.every(r=>new URL(r.url).origin===origin));assert(responses.every(r=>[200,204].includes(r.status)));assert.equal(requests.filter(r=>['fetch','xhr','image','websocket','font'].includes(r.type)).length,0);assert.deepEqual(errors,[]);
 const expected=(candidate?2:1)*14;assert.equal(captures.length,expected,'Every required original PNG must exist');
 const report={status:results.every(r=>r.status==='PASS')?'PASS':'FAIL',executionCommit:commit,sourceTree:source.tree,baseline:source.base,node:process.version,browser:browser.version(),total:results.length,passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,results,observations,benchmarks,captures,requests,responses,errors,productionRequests:0,ownerDesignApproved:false};
 await writeFile(join(output,'BROWSER_RESULTS.json'),JSON.stringify(report,null,2)+'\n');
 await writeFile(join(output,'SCREENSHOT_CAPTURE_MANIFEST.json'),JSON.stringify({executionCommit:commit,sourceTree:source.tree,baseline:source.base,browser:browser.version(),captures,retention:'30-day Actions artifact only; upload/readback verification pending'},null,2)+'\n');
 console.log(JSON.stringify({status:report.status,total:report.total,passed:report.passed,failures:results.filter(r=>r.status==='FAIL')}));if(report.failed)process.exitCode=1;
}finally{await context.close();await browser.close();await new Promise(r=>server.close(r));}
