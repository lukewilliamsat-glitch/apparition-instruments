import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {Window} from 'happy-dom';
import {adminRoutes,mountAdminShell,workspaceFor} from '../../dist/admin/application.mjs';
const base='2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f';
const files=execFileSync('git',['ls-tree','-r','--name-only',base],{encoding:'utf8'}).trim().split('\n');
// Authorisation54 adds only the reviewed, separately regression-tested read proof
// to existing Auth; all other inherited blobs still compare exactly with main.
const allowed=new Set(['dist/admin/application.mjs','dist/admin/admin-gate.mjs','dist/admin/admin-auth.mjs']);let unchanged=0;
for(const p of files){if(allowed.has(p))continue;assert.deepEqual(readFileSync(p),execFileSync('git',['show',base+':'+p],{maxBuffer:20*1024*1024}),p);unchanged++;}
const paths=new Set(adminRoutes.map(r=>new URL(r.href,'http://local').pathname));
for(const path of paths){
 const local='dist'+path+'index.html';const html=readFileSync(local,'utf8');
 const w=new Window({url:'http://127.0.0.1'+path,settings:{disableCSSFileLoading:true,disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true}}),d=w.document;d.write(html);
 const forms=[...d.querySelectorAll('form')],controls=[...d.querySelectorAll('main button[id],main input,main select,main textarea')];
 if(path.startsWith('/admin/')){mountAdminShell(d,d.createElement('button'));for(const n of [...forms,...controls])assert(n.isConnected,path+' removed '+n.id);if(path!=='/admin/conjure/')for(const route of adminRoutes)assert(d.querySelector('[data-workspace="'+route.id+'"]'),route.id);}
 await w.happyDOM.close();
}
assert.equal(workspaceFor(new URL('http://local/admin/orders/?view=aftercare')),'aftercare');
for(const p of ['dist/admin/orders/build-sheet/index.html','dist/admin/orders/invoice/index.html','dist/admin/orders/index.html','dist/admin/email-templates/index.html'])assert.match(readFileSync(p,'utf8'),/admin-gate\.mjs/);
assert.match(readFileSync('dist/circuit-forge/projects/index.html','utf8'),/account|projects/);
console.log(JSON.stringify({suite:'preservation',unchangedInheritedBlobs:unchanged,allowedChangedInheritedPaths:[...allowed],routePaths:paths.size,status:'PASS',limitation:'Source/DOM reachability and unchanged implementations; no claim of live specialist backend compatibility.'}));
