import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {join,extname} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const output=process.env.FORGE_QA_DIR||'/tmp/forge-mobile-qa';mkdirSync(output,{recursive:true});
const server=createServer((req,res)=>{
 let path=decodeURIComponent(new URL(req.url,'http://local').pathname);if(path.endsWith('/'))path+='index.html';
 try{let data=readFileSync(join(process.cwd(),'dist',path));
 // Serve the existing isolated local repositories. Never contact production data.
 if(path==='/admin/component-repository.mjs')data=Buffer.from(data.toString().replace('browserRepository=createPublicComponentRepository();','browserRepository=createLocalComponentRepository(localStorage);'));
 if(path==='/admin/assembly-repository.mjs')data=Buffer.from(data.toString().replace('return browserRepository=createPublicAssemblyRepository();','return browserRepository=createLocalAssemblyRepository(localStorage);'));
 res.setHeader('Content-Type',({'.mjs':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png'})[extname(path)]||'application/octet-stream');res.end(data);}catch{res.statusCode=404;res.end('Not found');}
});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.FORGE_CHROME||undefined,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,deviceScaleFactor:1});
 await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error('Browser error:',error.message);});
 const load=async()=>{await page.goto(origin+'/circuit-forge/');await page.waitForFunction(()=>!!document.querySelector('#forge-diagram svg')&&!document.documentElement.classList.contains('forge-entering'),{},{timeout:10000}).catch(async error=>{console.error(await page.locator('#forge-status').textContent());throw error;});await page.waitForTimeout(300);};
 await page.goto(origin+'/circuit-forge/',{waitUntil:'domcontentloaded'});
 assert(await page.locator('html').evaluate(e=>e.classList.contains('forge-entering')));
 await page.waitForTimeout(250);await page.screenshot({path:output+'/390-entry.png'});
 await page.waitForFunction(()=>!!document.querySelector('#forge-diagram svg')&&!document.documentElement.classList.contains('forge-entering'));await page.waitForTimeout(300);
 assert.equal(await page.locator('.forge-layout > .forge-controls').count(),0);
 assert.equal(await page.locator('#forge-configure-sheet .forge-controls').count(),1);
 assert.equal(await page.locator('#forge-inspector-sheet .forge-inspector').count(),1);
 assert(await page.locator('#forge-explore').evaluate(e=>!e.open));
 assert(await page.locator('#forge-viewport').evaluate(e=>e.clientHeight>350));
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:output+'/390-circuit.png'});
 await page.locator('#forge-zoom-in').click();assert.equal(await page.locator('#forge-zoom-value').textContent(),'150%');
 await page.locator('[data-mobile-open="configure"]').click();
 assert(await page.locator('#forge-configure-sheet').evaluate(e=>e.open&&e.matches(':modal')));
 const neck=page.locator('select[name="neckProfile"]'),bridge=page.locator('select[name="bridgeProfile"]');
 const option=async (locator,text)=>locator.locator('option').evaluateAll((nodes,text)=>nodes.find(n=>n.textContent.includes(text)).value,text);
 await neck.selectOption(await option(neck,'Seymour Duncan'));await bridge.selectOption(await option(bridge,'DiMarzio'));
 await page.locator('input[name="position"][value="neck"]').check();
 await page.locator('.forge-options summary').click();await page.locator('select[name="bleed"]').selectOption('prs');
 await page.screenshot({path:output+'/390-configure.png'});
 await page.keyboard.press('Escape');assert(!(await page.locator('#forge-configure-sheet').evaluate(e=>e.open)));
 assert(await page.locator('[data-mobile-open="configure"]').evaluate(e=>e===document.activeElement));
 assert.equal(await page.locator('#forge-zoom-value').textContent(),'150%');
 assert.match(await page.locator('#forge-diagram').innerHTML(),/SEYMOUR DUNCAN/);assert.match(await page.locator('#forge-diagram').innerHTML(),/DIMARZIO/);
 await page.locator('#forge-explore summary').click();await page.locator('[data-role-view="signal"]').click();
 assert.equal(await page.locator('[data-role-view="signal"]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-trace="neckPickup.hot"]').click();
 assert(await page.locator('#forge-inspector-sheet').evaluate(e=>e.open&&!e.matches(':modal')));
 assert.match(await page.locator('#forge-inspection').textContent(),/conductive|segment/i);
 await page.screenshot({path:output+'/390-trace-inspector.png'});
 await page.locator('[data-mobile-close="inspector"]').click();
 await page.locator('#forge-explore summary').click();await page.locator('#forge-fit').click();
 await page.locator('#forge-diagram [data-wire="neckOutput"]').press('Enter');
 assert.match(await page.locator('#forge-inspection').textContent(),/Physical termination/);
 assert.equal(await page.locator('#forge-zoom-value').textContent(),'250%');
 await page.locator('#forge-inspector-expand').click();assert(await page.locator('#forge-inspector-sheet').evaluate(e=>e.classList.contains('is-expanded')));
 await page.locator('#forge-inspection button').filter({hasText:'Trace complete electrical net'}).click();
 assert.match(await page.locator('#forge-inspection').textContent(),/Conductive terminal path/);
 await page.keyboard.press('Escape');assert(!(await page.locator('#forge-inspector-sheet').evaluate(e=>e.open)));
 // Touch at an overview pot lug offers names when nearby targets are ambiguous.
 await page.locator('#forge-fit').click();const terminal=await page.locator('.terminal[data-terminal="neckVolume.lug2"]').boundingBox();
 await page.touchscreen.tap(terminal.x+terminal.width/2,terminal.y+terminal.height/2);
 assert(await page.locator('#forge-inspector-sheet').evaluate(e=>e.open));
 if(await page.locator('#forge-touch-choices button').count())await page.locator('#forge-touch-choices button').filter({hasText:'NECK VOLUME Lug 2'}).click();
 assert.match(await page.locator('#forge-inspection').textContent(),/Lug 2/);
 await page.keyboard.press('Escape');
 // Zoomed pan does not select or redraw a circuit; pinch updates magnification only.
 const canvas=await page.locator('#forge-viewport').boundingBox();
 await page.mouse.move(canvas.x+canvas.width/2,canvas.y+120);await page.mouse.down();await page.mouse.move(canvas.x+canvas.width/2-60,canvas.y+60,{steps:4});await page.mouse.up();
 assert(await page.locator('#forge-viewport').evaluate(e=>e.scrollLeft>0||e.scrollTop>0));
 const cdp=await context.newCDPSession(page),x=canvas.x+canvas.width/2,y=canvas.y+100;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-30,y,id:1},{x:x+30,y,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-45,y,id:1},{x:x+45,y,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.notEqual(await page.locator('#forge-zoom-value').textContent(),'250%');
 await page.locator('[data-forge-mode="signal"]').click();
 assert.equal(await page.locator('#forge-response-graph svg').getAttribute('viewBox'),'0 0 360 270');
 await page.locator('#forge-response-volume').evaluate(e=>{e.value='4.5';e.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('#forge-response-tone').evaluate(e=>{e.value='6.2';e.dispatchEvent(new Event('input',{bubbles:true}));});
 const graph=await page.locator('.response-current').getAttribute('d');
 assert(await page.locator('.response-reference').isVisible());
 await page.waitForTimeout(200);await page.screenshot({path:output+'/390-signal.png'});
 await page.locator('[data-lab-pickup="bridge"]').click();await page.locator('[data-lab-pickup="neck"]').click();
 assert.equal(await page.locator('.response-current').getAttribute('d'),graph);
 await page.locator('[data-lab-pickup="both"]').click();assert(await page.locator('#forge-response-lab').evaluate(e=>e.classList.contains('is-unsupported')));
 await page.waitForTimeout(200);await page.screenshot({path:output+'/390-unsupported.png'});
 await page.locator('[data-analyse="neck"]').click();
 await page.evaluate(()=>{window.entryReplays=0;new MutationObserver(records=>{for(const record of records)if(document.documentElement.classList.contains('forge-entering'))window.entryReplays++;}).observe(document.documentElement,{attributes:true,attributeFilter:['class']});});
 for(const [width,height,label] of [[430,932,'430'],[844,390,'landscape'],[768,1024,'tablet'],[1024,768,'narrow-desktop'],[1440,900,'desktop']]){
  await page.setViewportSize({width,height});await page.waitForTimeout(80);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+' horizontal overflow');
  assert.equal(await page.locator('#forge-controls input[name="position"]:checked').getAttribute('value'),'neck');
  assert.equal(await page.locator('#forge-response-volume').inputValue(),'4.5');
  assert.equal(await page.locator('#forge-response-tone').inputValue(),'6.2');
  await page.screenshot({path:output+'/'+label+'-signal.png'});
  await page.locator('[data-forge-mode="physical"]').click();await page.waitForTimeout(200);if(width<=850)assert(await page.locator('#forge-viewport').evaluate(e=>[...e.querySelectorAll('.component')].some(n=>{const a=n.getBoundingClientRect(),b=e.getBoundingClientRect();return a.right>b.left&&a.left<b.right&&a.bottom>b.top&&a.top<b.bottom})),label+' shows circuit after hidden-mode resize');await page.screenshot({path:output+'/'+label+'-circuit.png'});
  await page.locator('[data-forge-mode="signal"]').click();
 }
 assert.equal(await page.evaluate(()=>window.entryReplays),0);
 assert.equal(await page.locator('.forge-layout > .forge-controls').count(),1);
 assert.equal(await page.locator('.forge-layout > .forge-inspector').count(),1);
 assert.equal(await page.locator('#forge-response-graph svg').getAttribute('viewBox'),'0 0 760 300');
 assert.deepEqual(errors,[]);
 // The accepted desktop raster must be identical for an untouched default state.
 if(process.env.FORGE_BASE_REF){
  const changed=['dist/circuit-forge/index.html','dist/circuit-forge/app.mjs','dist/circuit-forge/forge.css','dist/circuit-forge/response-view.mjs'];
  const baseline=new Map(changed.map(path=>[path.slice(4),execFileSync('git',['show',process.env.FORGE_BASE_REF+':'+path])]));
  for(const size of [{width:1440,height:900},{width:1024,height:768}]){
   const old=await context.newPage();await old.setViewportSize(size);
   await old.route(origin+'/**',route=>{const path=new URL(route.request().url()).pathname.replace(/\/$/,'/index.html');const body=baseline.get(path);return body?route.fulfill({body,contentType:path.endsWith('.mjs')?'text/javascript':path.endsWith('.css')?'text/css':'text/html'}):route.continue();});
   await old.goto(origin+'/circuit-forge/');await old.waitForFunction(()=>!!document.querySelector('#forge-diagram svg')&&!document.documentElement.classList.contains('forge-entering'));await old.waitForTimeout(250);
   const before=await old.screenshot();await page.setViewportSize(size);await load();await page.waitForTimeout(250);const after=await page.screenshot();
   assert(before.equals(after),'accepted desktop pixels changed at '+size.width);await old.close();
  }
 }
 await page.setViewportSize({width:390,height:844});await page.goto(origin+'/');await page.locator('#signal-forge.has-circuit').waitFor();
 assert(await page.locator('#signal-forge').evaluate(e=>!e.classList.contains('is-animated')));
 assert.equal(await page.locator('.forge-reveal-primary').getAttribute('href'),'/circuit-forge/');
 await page.locator('.forge-reveal-primary').scrollIntoViewIfNeeded();await page.screenshot({path:output+'/390-homepage.png'});
 const reduced=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await reduced.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
 const rp=await reduced.newPage();await rp.goto(origin+'/circuit-forge/');await rp.waitForFunction(()=>!!document.querySelector('#forge-diagram svg')&&!document.documentElement.classList.contains('forge-entering'));assert(await rp.locator('.forge-workspace-modes').isVisible());
 console.log('Mobile sheets, focus/escape, shared profiles/state, touch ambiguity, zoom/pan/pinch, modes, response controls, responsive continuity, reduced motion and homepage safety PASS');
 console.log('Desktop default pixels identical at 1440 and 1024; screenshots: '+output);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
