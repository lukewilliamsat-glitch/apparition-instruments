// Trusted local harness. Invoke ONLY through browser-network-deny on Linux x64.
// CDP pipe + exact file-backed loopback origin; zero TCP fixture sockets required.
// No production bytes are fetched and no candidate bytes are rewritten.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {sha256,stable,loadJSON,inventory,sameFiles,readRegular} from '../../scripts/atlas/core.mjs';
import {browserAcceptancePlan,BROWSER_CHECKS,checkBrowserEvidence} from '../../scripts/atlas/browser-evidence.mjs';
const [root,manifestFile,manifestPin,out,executable,playwrightDirectory,provenanceFile]=process.argv.slice(2);
if(!provenanceFile)throw Error('Explicit candidate, manifest pin, output, Chrome, Playwright and provenance required');
await fs.mkdir(out,{recursive:true});
const status=await fs.readFile('/proc/self/status','utf8');
if(!/^NoNewPrivs:\s+1$/m.test(status)||!/^Seccomp:\s+2$/m.test(status))throw Error('Kernel isolation absent');
// Native child probes bypass both browser interception and JavaScript guards.
const native=spawnSync('/usr/bin/python3',['-c',`import socket,json,errno
r=[]
for family,label in [(socket.AF_INET,'IPv4 direct IP'),(socket.AF_INET6,'IPv6 direct IP'),(socket.AF_NETLINK,'netlink'),(socket.AF_PACKET,'raw packet')]:
 try: socket.socket(family,socket.SOCK_STREAM);raise RuntimeError('socket escaped')
 except OSError as e:
  assert e.errno in [errno.EPERM,errno.EACCES];r.append({'probe':label,'blocked':True,'errno':e.errno})
try:
 s=socket.socket(socket.AF_UNIX);s.connect('/tmp/atlas-nonexistent-proxy');raise RuntimeError('connect escaped')
except OSError as e:
 assert e.errno in [errno.EPERM,errno.EACCES];r.append({'probe':'AF_UNIX proxy connect','blocked':True,'errno':e.errno})
print(json.dumps(r))`],{encoding:'utf8',env:{PATH:'/usr/bin:/bin'},timeout:5000});
if(native.status!==0)throw Error('Native isolation probes failed: '+native.stderr);
const require=createRequire(import.meta.url),{chromium}=require(playwrightDirectory);
const browser=await chromium.launch({executablePath:executable,headless:true,args:['--no-sandbox','--disable-extensions','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--disable-default-apps','--disable-quic','--disable-features=MediaRouter,OptimizationHints'],env:{PATH:'/usr/bin:/bin',LANG:'C.UTF-8',TZ:'UTC',HOME:out}});
try{
 const origin='http://127.0.0.1:8765',probeContext=await browser.newContext({serviceWorkers:'block'}),probeDenied=[];
 await probeContext.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.origin!==origin){probeDenied.push(u.href);return route.abort('blockedbyclient');}
  if(u.pathname==='/escape')return route.fulfill({status:302,headers:{location:'https://atlas-redirect-probe.invalid/'}});
  return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolation probe</title><h1>Local fixture</h1>'});
 });
 const pp=await probeContext.newPage();await pp.goto(origin+'/probe');
 const browserProbes=await pp.evaluate(async()=>{
  const urls=['http://192.0.2.1:9/','http://[2001:db8::1]:9/','https://atlas-dns-probe.invalid/','http://127.0.0.1:8765/escape'];const results=[];
  for(const url of urls){let ok=false;try{await fetch(url);ok=true;}catch{}results.push({probe:url,blocked:!ok});}
  const ws=await new Promise(resolve=>{const s=new WebSocket('wss://atlas-websocket-probe.invalid/');s.onopen=()=>{s.close();resolve(false);};s.onerror=()=>resolve(true);setTimeout(()=>resolve(false),3000);});
  results.push({probe:'external WebSocket',blocked:ws});return results;
 });
 if(browserProbes.some(x=>!x.blocked)||await pp.locator('h1').innerText()!=='Local fixture')throw Error('Browser isolation/fixture probe failed');
 const processes=spawnSync('/usr/bin/python3',['-c',`import pathlib,json,os
rows=[]
for p in pathlib.Path('/proc').glob('[0-9]*'):
 try:
  cmd=(p/'cmdline').read_bytes().replace(b'\\0',b' ').decode(errors='replace')
  if '${executable}' not in cmd or 'python' in cmd:continue
  s=(p/'status').read_text();v=dict(x.split(':',1) for x in s.splitlines() if ':' in x);rows.append({'pid':int(p.name),'NoNewPrivs':v.get('NoNewPrivs','').strip(),'Seccomp':v.get('Seccomp','').strip()})
 except (FileNotFoundError,PermissionError,ProcessLookupError):pass
print(json.dumps(rows))`],{encoding:'utf8',env:{PATH:'/usr/bin:/bin'},timeout:5000});
 const descendants=JSON.parse(processes.stdout||'[]');
 if(processes.status!==0||!descendants.length||descendants.some(x=>x.NoNewPrivs!=='1'||x.Seccomp!=='2'))throw Error('Browser descendants not isolated');
 const proof={nativeChild:JSON.parse(native.stdout),browserProbes,blocked:probeDenied,descendants,localFixture:true,transport:'Playwright CDP pipe; exact loopback URL fulfilled from local files; no real TCP listener',kernel:'no Internet/raw/netlink sockets; all connect and io_uring denied; inherited non-stdio descriptors closed',browserSandbox:'Chrome --no-sandbox in disposable context; separate inherited kernel network boundary, not a claim of Chrome renderer sandboxing'};
 await fs.writeFile(path.join(out,'isolation-probes.json'),stable(proof));await probeContext.close();
 // No candidate page is opened until all native/browser negative controls pass.
 const manifest=(await loadJSON(manifestFile,manifestPin)).value;
 if(!sameFiles(await inventory(root),{files:manifest.files}))throw Error('Candidate changed');
 const plan=browserAcceptancePlan(manifest,manifestPin),planPin=sha256(stable(plan)),known=new Map(manifest.files.map(x=>[x.path,x]));
 await fs.writeFile(path.join(out,'browser-plan.json'),stable(plan));
 const provenance=JSON.parse(await fs.readFile(provenanceFile,'utf8')),results=[];
 const types={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon','.xml':'application/xml'};
 for(const routePlan of plan.routes)for(const viewport of plan.viewports){
  const allowed=[],blocked=[],errors=[],rejections=[],failedResources=[];
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},serviceWorkers:'block'});
  await context.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.origin!==origin||req.method()!=='GET'){blocked.push({url:u.href,method:req.method(),reason:'origin/method boundary'});return route.abort('blockedbyclient');}
   let p=decodeURIComponent(u.pathname).slice(1);if(!p||p.endsWith('/'))p+='index.html';
   if(!known.has(p)||p.split('/').some(x=>x==='..'||x==='')){allowed.push({url:u.href,method:'GET',status:404});return route.fulfill({status:404,contentType:'text/plain',body:'Fixture file unavailable'});}
   const b=await readRegular(path.join(root,p));if(sha256(b)!==known.get(p).sha256)throw Error('Fixture file changed');
   allowed.push({url:u.href,method:'GET',status:200});return route.fulfill({status:200,contentType:types[path.extname(p)]||'application/octet-stream',headers:{'Content-Security-Policy':"default-src 'self' data:; connect-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; frame-src 'none'; worker-src 'none'; form-action 'none'; base-uri 'self'",'Referrer-Policy':'no-referrer','Cache-Control':'no-store'},body:b});
  });
  const page=await context.newPage();page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>rejections.push(e.message));page.on('requestfailed',r=>failedResources.push({url:r.url(),error:r.failure()?.errorText}));
  let navigationError=null;try{await page.goto(origin+'/'+routePlan.path,{waitUntil:'load',timeout:20000});await page.waitForTimeout(600);}catch(e){navigationError=e.message;}
  const state=await page.evaluate(()=>({heading:!!document.querySelector('h1')?.textContent.trim(),nav:!!document.querySelector('nav a,a[href="/"]'),styles:[...document.querySelectorAll('link[rel="stylesheet"]')].every(e=>!!e.sheet),scripts:performance.getEntriesByType('resource').filter(e=>/\.(?:m?js)(?:\?|$)/.test(e.name)).length,images:[...document.images].filter(e=>!e.complete||e.naturalWidth===0).map(e=>e.currentSrc||e.src),overflow:document.documentElement.scrollWidth>innerWidth+2,forms:0}));
  const checks=BROWSER_CHECKS.map(id=>{
   const ok={'rendered-heading':state.heading,'navigation':state.nav,'styles-loaded':state.styles,'scripts-executed':state.scripts>0&&!rejections.length,'no-fatal-console-errors':!errors.length&&!rejections.length&&!navigationError,'no-broken-images':!state.images.length,'offline-content':!navigationError,'no-mutation':true,'responsive-layout':!state.overflow}[id];
   return {id,status:ok?'passed':'failed',detail:JSON.stringify(id==='no-broken-images'?state.images:id==='no-fatal-console-errors'?{errors,rejections,navigationError}:id==='responsive-layout'?{overflow:state.overflow}:id==='no-mutation'?'No clicks, form submissions, credentials or authenticated access; GET-only exact fixture origin':state)};
  });
  const name=routePlan.path.replaceAll('/','_')+'-'+viewport.id+'.png';await page.screenshot({path:path.join(out,name),fullPage:true,animations:'disabled'});
  const screenshot={path:name,sha256:sha256(await fs.readFile(path.join(out,name)))};
  const passed=checks.every(x=>x.status==='passed')&&allowed.length>0&&allowed.every(x=>x.status<400);
  results.push({path:routePlan.path,viewport:viewport.id,documentSHA256:routePlan.documentSHA256,status:passed?'passed':'failed',checks,screenshot,console:{errors,unhandledRejections:rejections},network:{allowed,blocked}});
  await fs.writeFile(path.join(out,name+'.diagnostics.json'),stable({state,navigationError,failedResources}));await context.close();console.log(routePlan.path,viewport.id,passed?'passed':'failed');
 }
 const receipt={schemaVersion:1,kind:'atlas-browser-evidence',planSHA256:planPin,baselineManifestSHA256:manifestPin,engine:{name:'Chrome',version:browser.version(),provenance:JSON.stringify(provenance)},isolation:{origin:origin+'/',disposableProfile:true,serviceWorkersDisabled:true,externalHTTPBlocked:true,externalWebSocketBlocked:true,processIsolationVerified:true,dnsBypassBlocked:true,ipv6BypassBlocked:true,redirectEscapeBlocked:true,probeEvidence:{path:'isolation-probes.json',sha256:sha256(stable(proof))}},sessionsCreated:0,formsSubmitted:0,productionRequests:0,routes:results};
 await fs.writeFile(path.join(out,'browser-receipt.json'),stable(receipt));
 await fs.writeFile(path.join(out,'browser-validation.json'),stable(await checkBrowserEvidence({report:receipt,plan,planSHA256:planPin,artifactsRoot:out})));
 if(!sameFiles(await inventory(root),{files:manifest.files}))throw Error('Candidate changed during browser execution');
}finally{await browser.close();}
