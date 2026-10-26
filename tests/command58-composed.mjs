// New composed-payload boundaries only. Auth is fictional; no live compatibility claim.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Window} from 'happy-dom';
const root=resolve(process.argv[2]||'../command58-private/prepared/candidate');
const stamp='df78c5bf5144b012a7d96c628186180fa6432df3';
const {bootAdminGate}=await import(pathToFileURL(root+'/admin/admin-gate.mjs').href+'?build='+stamp);
let groups=0,network=0;const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>{network++;throw Error('Live network forbidden in composed test');};
const make=async(status='authorized')=>{
 const w=new Window({url:'https://apparitioninstruments.co.uk/admin/command/',settings:{disableCSSFileLoading:true,disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true}});
 w.happyDOM.setWindowSize({width:390,height:844});w.document.write(await readFile(root+'/admin/command/index.html','utf8'));
 const calls={restore:0,read:0,load:0,signOut:0};
 const auth={restore:async()=>{calls.restore++;return {status};},subscribe:()=>()=>{},authorizeRead:async()=>{calls.read++;throw Error('Inactive adapter must not authorize');},signOut:async()=>{calls.signOut++;return {status:'signed-out'};}};
 await bootAdminGate({document:w.document,auth,load:async url=>{calls.load++;const u=new URL(url);return import(pathToFileURL(root+u.pathname).href+u.search);}});
 await new Promise(r=>setTimeout(r,5));return {w,d:w.document,calls};
};
try{
 for(const status of ['signed-out','denied']){
  const {w,d,calls}=await make(status);assert.equal(calls.load,0);assert(!d.body.classList.contains('admin-authorized'));assert.equal(calls.read,0);assert.equal(d.querySelectorAll('#rows tr').length,0);
  if(status==='signed-out')assert(d.querySelector('input[autocomplete=current-password]'));else assert.match(d.querySelector('.admin-access-note').textContent,/not authorised/);
  await w.happyDOM.close();groups++;
 }
 const {w,d,calls}=await make();
 assert(d.body.classList.contains('admin-authorized'));assert.equal(calls.load,1);assert.equal(calls.read,0);assert(d.getElementById('command-content').hidden);assert.match(d.getElementById('command-status').textContent,/not activated/);assert.equal(d.querySelectorAll('#rows tr').length,0);assert(d.getElementById('save-fixture').disabled);groups++;
 const links=[...d.querySelectorAll('nav[aria-label="Admin workspaces"] a')];for(const path of ['/admin/command/','/admin/orders/','/admin/?view=inventory','/admin/conjure/','/admin/site-operations/','/admin/email-templates/','/circuit-forge/'])assert(links.some(a=>a.getAttribute('href')===path),path);assert.equal(d.querySelector('[aria-current=page]').textContent,'COMMAND Catalogue');groups++;
 const menu=d.querySelector('[data-admin-menu]');menu.click();assert.equal(menu.getAttribute('aria-expanded'),'true');d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(menu.getAttribute('aria-expanded'),'false');assert.equal(d.activeElement,menu);groups++;
 d.getElementById('command-reconnect').click();await new Promise(r=>setTimeout(r,5));assert.equal(calls.read,0);assert(d.getElementById('command-content').hidden);groups++;
 d.querySelector('[data-admin-session] button').click();await new Promise(r=>setTimeout(r,5));assert.equal(calls.signOut,1);assert(!d.body.classList.contains('admin-authorized'));assert(d.querySelector('input[autocomplete=current-password]'));assert.equal(d.querySelectorAll('#rows tr').length,0);groups++;
 await w.happyDOM.close();
 const {adminRoutes,workspaceFor}=await import(pathToFileURL(root+'/admin/application.mjs').href+'?build='+stamp);
 assert.equal(new Set(adminRoutes.map(r=>r.href)).size,adminRoutes.length);for(const [path,expected] of [['/admin/command/','command'],['/admin/orders/?view=aftercare','aftercare'],['/admin/?view=assemblies','assemblies'],['/admin/site-operations/#news','news']])assert.equal(workspaceFor(new URL('https://apparitioninstruments.co.uk'+path)),expected);groups++;
 assert.equal(network,0);console.log(JSON.stringify({passed:groups,total:8,networkRequests:network,auth:'Fictional only; real catalogue activation remains disabled',payload:root}));
}finally{globalThis.fetch=originalFetch;}
