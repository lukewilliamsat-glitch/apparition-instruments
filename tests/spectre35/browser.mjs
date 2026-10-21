// CI-only acceptance against the unchanged homepage shell and local assets.
// The surrounding namespace must have passed isolation.mjs before this starts.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {initialComponents} from '../../dist/admin/data.mjs';
import {lesPaulKitAssembly} from '../../dist/admin/assemblies.mjs';
const [output,executablePath,controller,commit]=process.argv.slice(2);
const root=resolve('dist'),screens=join(output,'SCREENSHOTS');
const stage=JSON.parse(await readFile(join(output,'STAGE_A_RESULTS.json')));assert.equal(stage.status,'PASS');assert.equal(stage.sourceCommit,commit);
await mkdir(screens,{recursive:true});
const report={commit,baseline:'2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f',mode:'acceptance',node:process.version,cases:[],checks:[],requests:[],consoleErrors:[],pageErrors:[],externalAttempts:[],serverErrors:[],fixtureOverrides:['Google Fonts CSS imports omitted; existing Arial/monospace fallback','backend/site-operations.mjs: synthetic OPEN store and no news','backend/public-config.mjs: synthetic hostname and dummy public key; exact three public catalogue paths remapped to loopback synthetic records','DejaVu Sans provided only for controlled delayed-font test, not claimed as Space Grotesk parity'],status:'FAIL'};
const components=initialComponents().map((p,i)=>({id:p.id,sku:'FIXTURE-'+i,name:'Synthetic component '+i,category:p.category,manufacturer:p.manufacturer,description:'Isolated fixture',specs:p.specs,product_content:{},individually:true,in_kits:true,sale_price:100,kit_price:100,kit_price_quantity:1,stock:20,image:null}));
const k=lesPaulKitAssembly.kitDefinition;
const fixtureRows={catalogue_components:components,catalogue_wiring_kits:[{id:lesPaulKitAssembly.id,sku:'FIXTURE-KIT',name:'Synthetic wiring kit',category:'kits',slug:'les-paul',base_price:1000,show_on_wiring_kits:true,builder_enabled:true,default_wiring_style:'modern',defaults:k.defaults,builder_options:k.builderOptions,component_resolvers:k.componentResolvers}],kit_permitted_components:components.map(p=>({assembly_id:lesPaulKitAssembly.id,component_id:p.id}))};
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.ico':'image/x-icon'};
let browser,baselineMode=false;
const baselineCSS=await readFile('tests/spectre35/baseline-customer-ui.txt');
assert.equal(createHash('sha1').update('blob '+baselineCSS.length+'\0').update(baselineCSS).digest('hex'),'5a77dc0a6ee40fab7d1335c9c9c3003f36a36891');
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1'),path=url.pathname==='/'?'/index.html':url.pathname;
  if(req.method!=='GET'){res.writeHead(405);res.end();return;}
  let body;
  if(path==='/__fixture/font.ttf'){body=await readFile('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf');await new Promise(r=>setTimeout(r,150));}
  else if(path.startsWith('/__fixture/public/')){const table=path.split('/').at(-1);assert(Object.hasOwn(fixtureRows,table));body=Buffer.from(JSON.stringify(fixtureRows[table]));}
  else if(path==='/backend/public-config.mjs')body=Buffer.from(`export const publicBackendConfig=Object.freeze({url:'https://spectre35-fixture.supabase.co',publishableKey:'sb_publishable_fixture'});`);
  else if(path==='/backend/site-operations.mjs')body=Buffer.from(`const store={state:'OPEN',desired_state:'OPEN',observed_at:new Date().toISOString()};export async function readOperationsPresentation(){return {store,news:[]};}export async function readCurrentStore(){return store;}export async function readPublicAnnouncements(){return [];}`);
  else{
   const file=resolve(root,'.'+decodeURIComponent(path));if(!file.startsWith(root+'/'))throw Error('Unsafe fixture path');
   body=baselineMode&&path==='/customer-ui.css'?baselineCSS:await readFile(file);
   if(extname(file)==='.css')body=Buffer.from(body.toString().replace(/@import\s+url\(['"]https:\/\/fonts\.googleapis\.com[^'"]+['"]\)\s*;/g,''));
  }
  res.writeHead(200,{'content-type':path.startsWith('/__fixture/public/')?'application/json':path==='/__fixture/font.ttf'?'font/ttf':mime[extname(path)]||'application/octet-stream','cache-control':'no-store','content-security-policy':"default-src 'self' data: blob:; connect-src 'self'; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; frame-src 'none'"});res.end(body);
 }catch(error){report.serverErrors.push({url:req.url,error:String(error)});res.writeHead(404);res.end('Local fixture unavailable');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
async function measure(page){return page.evaluate(()=>{
 const h=document.querySelector('#hero-title'),c=document.querySelector('.hero-content'),hero=document.querySelector('.hero'),p=document.querySelector('.hero-bottom p'),cta=document.querySelector('.hero-bottom .button');
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
 const s=getComputedStyle(h),cs=getComputedStyle(c),ps=getComputedStyle(p);const chars=[];
 const walker=document.createTreeWalker(h,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){const n=walker.currentNode;for(let i=0;i<n.length;i++){if(!n.textContent[i].trim())continue;const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+1);const b=r.getBoundingClientRect();chars.push({char:n.textContent[i],x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom});}}
 const lines=[];for(const ch of chars){let line=lines.find(l=>Math.abs(l.y-ch.y)<parseFloat(s.fontSize)*.4);if(!line){line={y:ch.y,text:'',chars:[]};lines.push(line);}line.text+=ch.char;line.chars.push(ch);}
 const hb=rect(h),cb=rect(cta);return {viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,visualScale:visualViewport.scale},hero:rect(hero),content:rect(c),heading:hb,paragraph:rect(p),cta:cb,headingFont:s.fontFamily,fontSize:s.fontSize,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing,wordBreak:s.wordBreak,overflowWrap:s.overflowWrap,whiteSpace:s.whiteSpace,contentMaxWidth:cs.maxWidth,paddingLeft:cs.paddingLeft,paddingRight:cs.paddingRight,paragraphFont:ps.fontSize,lines:lines.map(({y,text})=>({y,text})),lineCount:lines.length,headingOverflow:chars.some(ch=>ch.x<hb.x-2||ch.right>hb.right+2),documentOverflow:document.documentElement.scrollWidth>innerWidth+1,documentScrollWidth:document.documentElement.scrollWidth,overflowElements:[...document.body.querySelectorAll('*')].filter(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.position!=='absolute'&&s.position!=='fixed'&&r.width>0&&(r.right>innerWidth+1||r.left< -1);}).slice(0,30).map(e=>({tag:e.tagName,id:e.id,class:e.className?.baseVal??e.className,rect:rect(e)})),ctaInViewport:cb.y>=0&&cb.bottom<=innerHeight&&cb.x>=0&&cb.right<=innerWidth,header:rect(document.querySelector('.site-header')),background:getComputedStyle(document.querySelector('.hero-art')).backgroundImage,fontsStatus:document.fonts.status};
 });}
try{
 const {chromium}=await import(pathToFileURL(controller));browser=await chromium.launch({executablePath,headless:true,chromiumSandbox:true,args:['--disable-extensions','--disable-background-networking','--disable-component-update','--disable-sync','--no-proxy-server']});report.browser=browser.version();
 const context=await browser.newContext({serviceWorkers:'block',reducedMotion:'reduce'});
 await context.addInitScript(()=>{
  const nativeFetch=window.fetch.bind(window);window.fixtureDenied=[];
  window.fetch=(input,options={})=>{
   const url=new URL(typeof input==='string'?input:input.url||String(input),location.href);
   if(url.origin==='https://spectre35-fixture.supabase.co'&&/^\/rest\/v1\/(catalogue_components|catalogue_wiring_kits|kit_permitted_components)$/.test(url.pathname)&&(options.method||'GET')==='GET')return nativeFetch('/__fixture/public/'+url.pathname.split('/').at(-1)+url.search,{cache:'no-store'});
   if(url.origin!==location.origin){window.fixtureDenied.push(url.href);return Promise.reject(Error('Fixture origin denied'));}
   return nativeFetch(input,options);
  };
 });
 context.on('request',r=>{report.requests.push({url:r.url(),type:r.resourceType()});if(new URL(r.url()).origin!==origin)report.externalAttempts.push(r.url());});
 const page=await context.newPage();page.on('pageerror',e=>report.pageErrors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
 baselineMode=true;
 for(const width of [320,390,768,1024,1280,1440,1920,2560,3440,3840]){
  await page.setViewportSize({width,height:width<=390?900:width===768?1024:1080});await page.goto(origin,{waitUntil:'networkidle'});const m=await measure(page);assert.match(m.headingFont,/Space Grotesk/);assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--serif').trim()),"'Space Grotesk',Arial,sans-serif");report.cases.push({name:'before-'+width,metrics:m});
  if([320,390,768,1440,2560,3840].includes(width))await page.screenshot({path:join(screens,'before-'+width+'.png')});
 }
 assert(report.cases.find(c=>c.name==='before-2560').metrics.lineCount>3);assert.equal(report.cases.find(c=>c.name==='before-3840').metrics.heading.width,0);assert(report.cases.find(c=>c.name==='before-3840').metrics.lineCount>12);
 baselineMode=false;
 const verify=(name,m,prior=null)=>{assert.equal(m.lineCount,3,name+' three deliberate lines');assert.deepEqual(m.lines.map(l=>l.text),['Makeyour','presence','heard.'],name+' intact words');assert.equal(m.headingOverflow,false,name+' heading fits');if(prior?.documentOverflow){assert(m.documentScrollWidth<=prior.documentScrollWidth,name+' no additional pre-existing document overflow');}else assert.equal(m.documentOverflow,false,name+' document fits');assert(m.heading.y>=m.header.bottom,name+' no header collision');assert(m.cta.right<=m.viewport.width+1&&m.cta.x>=0,name+' CTA horizontal fit');assert(m.cta.bottom<m.hero.bottom-40,name+' hero contains CTA');};
 for(const width of [320,390,768,1024,1280,1440,1920,2560,3440,3840]){
  const height=width<=390?900:width===768?1024:1080;await page.setViewportSize({width,height});await page.goto(origin,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  const metrics=await measure(page);report.cases.push({name:'after-'+width,metrics});verify('after-'+width,metrics);assert.deepEqual(await page.evaluate(()=>window.fixtureDenied),[]);
  if([320,390,768,1440,2560,3840].includes(width))await page.screenshot({path:join(screens,'after-'+width+'.png')});
  await page.locator('.hero-bottom .button').focus();assert.equal(await page.locator('.hero-bottom .button').evaluate(e=>e===document.activeElement),true);
  const focus=await page.locator('.hero-bottom .button').evaluate(e=>({style:getComputedStyle(e).outlineStyle,width:getComputedStyle(e).outlineWidth}));assert.equal(focus.style,'solid');assert.equal(focus.width,'2px');
  await page.keyboard.press('Enter');await page.waitForFunction(()=>location.hash==='#range');assert(await page.evaluate(()=>scrollY>0));report.checks.push({name:'CTA keyboard and focus '+width,status:'PASS',focus});
  if(width<=1024){await page.evaluate(()=>scrollTo(0,0));await page.locator('.menu-button').click();assert.equal(await page.locator('#mobile-nav').getAttribute('hidden'),null);await page.keyboard.press('Escape');assert.notEqual(await page.locator('#mobile-nav').getAttribute('hidden'),null);assert.equal(await page.locator('.menu-button').evaluate(e=>e===document.activeElement),true);report.checks.push({name:'Mobile navigation '+width,status:'PASS'});}
  else{assert.equal(await page.locator('.site-header>nav').isVisible(),true);await page.locator('.site-header .nav-components summary').focus();await page.keyboard.press('ArrowDown');assert.equal(await page.locator('.site-header .nav-components').getAttribute('open'),'');await page.keyboard.press('Escape');assert.equal(await page.locator('.site-header .nav-components').getAttribute('open'),null);report.checks.push({name:'Desktop disclosure '+width,status:'PASS'});}
 }
 // Resize the same live document across the formerly failing range.
 await page.goto(origin,{waitUntil:'networkidle'});
 for(const width of [3840,2560,1440,1024,768,390,320,1440]){await page.setViewportSize({width,height:1080});const m=await measure(page);verify('resize-'+width,m);report.cases.push({name:'resize-'+width,metrics:m});}
 // CDP visual zoom is measurable pinch/page scale, not desktop browser zoom.
 const session=await context.newCDPSession(page);await page.setViewportSize({width:1440,height:1080});await page.goto(origin,{waitUntil:'networkidle'});
 for(const scale of [1,1.25,1.5]){await session.send('Emulation.setPageScaleFactor',{pageScaleFactor:scale});const m=await measure(page);assert(Math.abs(m.viewport.visualScale-scale)<.01);assert.equal(m.lineCount,3);assert.equal(m.headingOverflow,false);assert.equal(m.documentOverflow,false);report.cases.push({name:'CDP-visual-zoom-'+scale,metrics:m,limitation:'Visual zoom, not browser-chrome layout zoom'});}
 await session.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});
 // 150% default text size. Assert the root size rather than assuming CDP applies.
 await session.send('Page.setFontSizes',{fontSizes:{standard:24}});
 for(const width of [320,390,768,1440,3840]){await page.setViewportSize({width,height:1440});baselineMode=true;await page.goto(origin,{waitUntil:'networkidle'});const prior=await measure(page);baselineMode=false;await page.goto(origin,{waitUntil:'networkidle'});const rootSize=await page.evaluate(()=>getComputedStyle(document.documentElement).fontSize);assert.equal(rootSize,'24px');const m=await measure(page);report.cases.push({name:'text-150-'+width,rootSize,before:prior,metrics:m,preExistingDocumentOverflow:prior.documentOverflow});verify('text-150-'+width,m,prior);if(width===320)await page.screenshot({path:join(screens,'text-150-320.png')});}
 await session.send('Page.setFontSizes',{fontSizes:{standard:16}});await page.setViewportSize({width:1440,height:1080});await page.goto(origin,{waitUntil:'networkidle'});
 const initial=await measure(page);
 await page.evaluate(async()=>{const face=new FontFace('SpectreControlled','url(/__fixture/font.ttf)');document.fonts.add(face);window.controlledFont=face;window.fontLoading=face.load();});
 const pending=await measure(page);await page.evaluate(async()=>{await window.fontLoading;document.body.style.setProperty('--serif','SpectreControlled, Arial, sans-serif');await document.fonts.ready;});
 const loaded=await measure(page);verify('controlled-font-initial',initial);verify('controlled-font-pending',pending);verify('controlled-font-loaded',loaded);report.cases.push({name:'controlled-delayed-font',initial,pending,metrics:loaded});
 await page.screenshot({path:join(screens,'after-controlled-font-1440.png')});
 for(const width of [320,390,768,2560,3840]){await page.setViewportSize({width,height:1080});const m=await measure(page);verify('controlled-font-'+width,m);report.cases.push({name:'controlled-font-'+width,metrics:m});}
 await page.setViewportSize({width:1440,height:1080});
 // Absent font URL: the available named fallback still renders a valid hero.
 const missing=await page.evaluate(async()=>{const face=new FontFace('SpectreMissing','url(data:font/woff2;base64,AA==)');try{await face.load();return false;}catch{document.body.style.setProperty('--serif','SpectreMissing, Arial, sans-serif');return true;}});assert(missing);const fallback=await measure(page);verify('missing-font',fallback);report.cases.push({name:'missing-font-fallback',metrics:fallback});
 // Existing no-JavaScript and partial stylesheet modes, without changing files.
 const noJS=await browser.newContext({serviceWorkers:'block',javaScriptEnabled:false,viewport:{width:2560,height:1080}}),plain=await noJS.newPage();await plain.goto(origin,{waitUntil:'networkidle'});const noJSMetrics=await measure(plain);verify('no-JS',noJSMetrics);report.cases.push({name:'no-JS',metrics:noJSMetrics});await noJS.close();
 await page.setViewportSize({width:320,height:1080});await page.goto(origin,{waitUntil:'networkidle'});await page.locator('.hero-bottom p').evaluate(e=>e.textContent='Long-word containment: '+('Electroacoustics'.repeat(8)));const longWord=await measure(page);verify('long-paragraph-token',longWord);assert(longWord.paragraph.width<=288);report.cases.push({name:'long-paragraph-token',metrics:longWord});
 await page.setViewportSize({width:3840,height:1080});await page.goto(origin,{waitUntil:'networkidle'});await page.locator('link[href="/customer-ui.css"]').evaluate(e=>e.disabled=true);const partial=await measure(page);assert.equal(partial.lineCount,3);assert.equal(partial.headingOverflow,false);report.cases.push({name:'customer-ui-stylesheet-unavailable-diagnostic',metrics:partial});
 // Preserve hero parallax and honour reduced-motion changes using original site.mjs.
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(origin,{waitUntil:'networkidle'});await page.evaluate(()=>scrollTo(0,200));await page.waitForTimeout(100);const moving=await page.locator('.hero-art').evaluate(e=>getComputedStyle(e).transform);assert.notEqual(moving,'none');await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);const still=await page.locator('.hero-art').evaluate(e=>getComputedStyle(e).transform);assert.equal(still,'none');report.checks.push({name:'Parallax and reduced motion',status:'PASS',moving,still});
 // Intentional font decode failure is recorded separately, not hidden.
 report.expectedFontConsoleErrors=report.consoleErrors.filter(e=>/font|OTS parsing/i.test(e));report.consoleErrors=report.consoleErrors.filter(e=>!/font|OTS parsing/i.test(e));
 assert.equal(report.externalAttempts.length,0);assert.equal(report.pageErrors.length,0);assert.equal(report.consoleErrors.length,0);assert.equal(report.serverErrors.length,0);
 report.status='PASS';
}catch(error){report.error=String(error);report.stack=error.stack;process.exitCode=1;}
finally{if(browser)await browser.close();await new Promise(r=>server.close(r));await writeFile(join(output,'HERO_RESULTS.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,mode:report.mode,cases:report.cases.map(c=>({name:c.name,width:c.metrics.heading.width,lines:c.metrics.lineCount,padding:c.metrics.paddingLeft})),error:report.error}));}
