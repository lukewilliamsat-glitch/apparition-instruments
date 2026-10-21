// Stage A only. Official Playwright controller + preinstalled Chrome in a new
// loopback-only network namespace. No Apparition application fixture is opened.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,readlink} from 'node:fs/promises';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const [output,executablePath,controller,hostNamespace]=process.argv.slice(2),exec=promisify(execFile);
const record={stage:'A',applicationFixturesOpened:0,productionRequests:0,status:'BLOCKED',sourceCommit:process.argv[6],negativeControls:[],requests:[],responses:[],failures:[]};
let browser,server;
try{
 assert(process.versions.node.startsWith('22.'));
 record.node=process.version;record.namespace=await readlink('/proc/self/ns/net');assert.notEqual(record.namespace,hostNamespace);
 const addresses=JSON.parse(await readFile(join(output,'namespace-addresses.json')));assert.equal(addresses.length,1);assert.equal(addresses[0].ifname,'lo');
 const routes=JSON.parse(await readFile(join(output,'namespace-routes.json')));assert(routes.every(r=>r.dev==='lo'));
 const status=await readFile('/proc/self/status','utf8');assert.match(status,/CapEff:\s+0000000000000000/);
 const probe=await exec('/usr/bin/python3',['-c',`import socket,json,subprocess,sys,os
r=[]
for af,host in [(socket.AF_INET,'192.0.2.1'),(socket.AF_INET6,'2001:db8::1')]:
 s=socket.socket(af,socket.SOCK_STREAM);s.settimeout(1)
 try:
  s.connect((host,80));raise AssertionError('External connection succeeded')
 except OSError as e:r.append({'family':af,'destination':host,'errno':e.errno,'blocked':True})
 finally:s.close()
child=subprocess.check_output([sys.executable,'-c',"import os;print(os.readlink('/proc/self/ns/net'))"],text=True).strip()
assert child==os.readlink('/proc/self/ns/net')
print(json.dumps({'connections':r,'childNamespace':child}))`]);
 record.processProof=JSON.parse(probe.stdout);
 const script=`const proof={};window.proof=proof;
const reject=(name,p)=>Promise.race([p.then(()=>proof[name]='UNEXPECTED_SUCCESS',()=>proof[name]='blocked'),new Promise(r=>setTimeout(()=>{if(!proof[name])proof[name]='TIMEOUT';r();},5000))]);
reject('fetchIPv4',fetch('http://192.0.2.1/probe'));
reject('fetchIPv6',fetch('http://[2001:db8::1]/probe'));
reject('dns',fetch('http://spectre35-negative.invalid/probe'));
reject('redirect',fetch('/redirect'));
const image=new Image();image.onload=()=>proof.image='UNEXPECTED_SUCCESS';image.onerror=()=>proof.image='blocked';image.src='http://192.0.2.2/probe.png';document.body.append(image);
const script=document.createElement('script');script.onload=()=>proof.script='UNEXPECTED_SUCCESS';script.onerror=()=>proof.script='blocked';script.src='http://192.0.2.3/probe.js';document.body.append(script);
const frame=document.createElement('iframe');frame.src='http://198.51.100.1/probe-frame';document.body.append(frame);
const worker=new Worker('/worker.js');worker.onmessage=e=>proof.worker=e.data;worker.onerror=()=>proof.worker='worker-error';
const ws=new WebSocket('ws://198.51.100.2/probe');ws.onopen=()=>proof.websocket='UNEXPECTED_SUCCESS';ws.onerror=()=>proof.websocket='blocked';`;
 server=createServer((req,res)=>{
  if(req.url==='/redirect'){res.writeHead(302,{location:'http://198.51.100.3/probe'});res.end();return;}
  if(req.url==='/worker.js'){res.writeHead(200,{'content-type':'text/javascript'});res.end("fetch('http://203.0.113.1/worker-probe').then(()=>postMessage('UNEXPECTED_SUCCESS'),()=>postMessage('blocked'))");return;}
  res.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});res.end('<!doctype html><title>Isolation probes only</title><body><p>Local probe reachable</p><script>'+script+'</script>');
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const {chromium}=await import(pathToFileURL(controller));
 browser=await chromium.launch({executablePath,headless:true,chromiumSandbox:true,args:['--disable-extensions','--disable-background-networking','--disable-component-update','--disable-sync','--no-proxy-server']});
 record.browser=browser.version();record.chromiumSandbox=true;record.disposableBrowser=true;
 const context=await browser.newContext({serviceWorkers:'block'});
 context.on('request',r=>record.requests.push({url:r.url(),resource:r.resourceType()}));
 context.on('response',r=>record.responses.push({url:r.url(),status:r.status()}));
 context.on('requestfailed',r=>record.failures.push({url:r.url(),resource:r.resourceType(),error:r.failure()?.errorText}));
 const page=await context.newPage();await page.goto(origin,{waitUntil:'load',timeout:15000});
 await page.waitForFunction(()=>['fetchIPv4','fetchIPv6','dns','redirect','image','script','worker','websocket'].every(k=>window.proof?.[k]),null,{timeout:15000});
 record.browserProof=await page.evaluate(()=>window.proof);
 for(const [name,result] of Object.entries(record.browserProof)){assert.equal(result,'blocked',name);record.negativeControls.push({name,result});}
 assert(record.failures.some(r=>r.resource==='document'&&r.url==='http://198.51.100.1/probe-frame'),'Frame connection must fail');
 record.negativeControls.push({name:'frame',result:'blocked'});
 const nav=await context.newPage();let denied=false;try{await nav.goto('http://203.0.113.2/navigation-probe',{timeout:10000});}catch{denied=true;}assert(denied);record.negativeControls.push({name:'navigation',result:'blocked'});
 assert(record.responses.every(r=>new URL(r.url).origin===origin),'Any external response is unsafe');
 assert.equal(await page.locator('p').textContent(),'Local probe reachable');record.localOriginReachable=true;
 record.status='PASS';record.nextStageAuthorised=true;
}catch(error){record.error=String(error);record.stack=error.stack;process.exitCode=1;}
finally{
 if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));
 await writeFile(join(output,'STAGE_A_RESULTS.json'),JSON.stringify(record,null,2)+'\n');
 console.log(JSON.stringify({status:record.status,browser:record.browser,negativeControls:record.negativeControls.length,applicationFixturesOpened:0,error:record.error}));
}
