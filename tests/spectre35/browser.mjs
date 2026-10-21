// CI-only acceptance against the unchanged homepage shell and local assets.
// The surrounding namespace must have passed isolation.mjs before this starts.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const [output,executablePath,controller,commit]=process.argv.slice(2);
const root=resolve('dist'),screens=join(output,'SCREENSHOTS');
const stage=JSON.parse(await readFile(join(output,'STAGE_A_RESULTS.json')));assert.equal(stage.status,'PASS');assert.equal(stage.sourceCommit,commit);
await mkdir(screens,{recursive:true});
const report={commit,baseline:'2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f',mode:'reproduction',node:process.version,cases:[],requests:[],consoleErrors:[],pageErrors:[],externalAttempts:[],serverErrors:[],fixtureOverrides:['Google Fonts CSS imports omitted; existing Arial/monospace fallback','backend/site-operations.mjs: synthetic OPEN store and no news; all other application modules unchanged'],status:'FAIL'};
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.ico':'image/x-icon'};
let browser;
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1'),path=url.pathname==='/'?'/index.html':url.pathname;
  if(req.method!=='GET'){res.writeHead(405);res.end();return;}
  let body;
  if(path==='/backend/site-operations.mjs')body=Buffer.from(`const store={state:'OPEN',desired_state:'OPEN',observed_at:new Date().toISOString()};export async function readOperationsPresentation(){return {store,news:[]};}export async function readCurrentStore(){return store;}export async function readPublicAnnouncements(){return [];}`);
  else{
   const file=resolve(root,'.'+decodeURIComponent(path));if(!file.startsWith(root+'/'))throw Error('Unsafe fixture path');
   body=await readFile(file);
   if(extname(file)==='.css')body=Buffer.from(body.toString().replace(/@import\s+url\(['"]https:\/\/fonts\.googleapis\.com[^;]+;/g,''));
  }
  res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream','cache-control':'no-store','content-security-policy':"default-src 'self' data: blob:; connect-src 'self'; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; frame-src 'none'"});res.end(body);
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
 const hb=rect(h),cb=rect(cta);return {viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,visualScale:visualViewport.scale},hero:rect(hero),content:rect(c),heading:hb,paragraph:rect(p),cta:cb,headingFont:s.fontFamily,fontSize:s.fontSize,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing,wordBreak:s.wordBreak,overflowWrap:s.overflowWrap,whiteSpace:s.whiteSpace,contentMaxWidth:cs.maxWidth,paddingLeft:cs.paddingLeft,paddingRight:cs.paddingRight,paragraphFont:ps.fontSize,lines:lines.map(({y,text})=>({y,text})),lineCount:lines.length,headingOverflow:chars.some(ch=>ch.x<hb.x-2||ch.right>hb.right+2),documentOverflow:document.documentElement.scrollWidth>innerWidth+1,ctaInViewport:cb.y>=0&&cb.bottom<=innerHeight&&cb.x>=0&&cb.right<=innerWidth,header:rect(document.querySelector('.site-header')),background:getComputedStyle(document.querySelector('.hero-art')).backgroundImage,fontsStatus:document.fonts.status};
 });}
try{
 const {chromium}=await import(pathToFileURL(controller));browser=await chromium.launch({executablePath,headless:true,chromiumSandbox:true,args:['--disable-extensions','--disable-background-networking','--disable-component-update','--disable-sync','--no-proxy-server']});report.browser=browser.version();
 const context=await browser.newContext({serviceWorkers:'block'});
 context.on('request',r=>{report.requests.push({url:r.url(),type:r.resourceType()});if(new URL(r.url()).origin!==origin)report.externalAttempts.push(r.url());});
 const page=await context.newPage();page.on('pageerror',e=>report.pageErrors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
 for(const width of [320,390,768,1024,1280,1440,1920,2560,3440,3840]){
  const height=width<=390?900:width===768?1024:1080;await page.setViewportSize({width,height});await page.goto(origin,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  const metrics=await measure(page);report.cases.push({name:'baseline-'+width,metrics});
  if([390,768,1440,2560,3840].includes(width))await page.screenshot({path:join(screens,'before-'+width+'.png')});
 }
 assert(report.cases.find(x=>x.name==='baseline-2560').metrics.lineCount>3,'Narrow headline reproduction');
 assert(report.cases.find(x=>x.name==='baseline-3840').metrics.content.width>=2560,'Padding expands border box beyond its max-width');
 assert(report.cases.find(x=>x.name==='baseline-3840').metrics.lineCount>12,'Letter stacking reproduction');
 assert.equal(report.externalAttempts.length,0);assert.equal(report.pageErrors.length,0);assert.equal(report.consoleErrors.length,0);assert.equal(report.serverErrors.length,0);
 report.status='PASS';
}catch(error){report.error=String(error);report.stack=error.stack;process.exitCode=1;}
finally{if(browser)await browser.close();await new Promise(r=>server.close(r));await writeFile(join(output,'HERO_RESULTS.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,mode:report.mode,cases:report.cases.map(c=>({name:c.name,width:c.metrics.heading.width,lines:c.metrics.lineCount,padding:c.metrics.paddingLeft})),error:report.error}));}
