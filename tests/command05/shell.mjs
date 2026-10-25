import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {adminRoutes,workspaceFor} from '../../dist/admin/application.mjs';
import {bootAdminGate} from '../../dist/admin/admin-gate.mjs';
import {mountAdminWorkspace} from '../../dist/admin/command/entry.mjs';
const settings={disableCSSFileLoading:true,disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true};
for(const status of ['signed-out','denied','authorized']){
 const w=new Window({url:'http://127.0.0.1/admin/command/',settings}),d=w.document;
 d.write(readFileSync('dist/admin/command/index.html','utf8'));
 let loads=0,logouts=0;
 await bootAdminGate({document:d,auth:{restore:async()=>({status}),signOut:async()=>{logouts++;}},load:async()=>{loads++;return{mountAdminWorkspace};}});
 assert.equal(loads,status==='authorized'?1:0);
 assert.equal(d.body.classList.contains('admin-authorized'),status==='authorized');
 if(status==='authorized'){
  assert.equal(workspaceFor(d.location),'command');
  for(const route of adminRoutes)assert(d.querySelector('[data-workspace="'+route.id+'"]'),route.id);
  assert.match(d.getElementById('command-status').textContent,/not activated/);
  d.querySelector('.admin-lock').click();await new Promise(r=>setTimeout(r,0));
  assert.equal(logouts,1);assert(!d.body.classList.contains('admin-authorized'));
 }
 await w.happyDOM.close();
}
console.log('COMMAND05 shell: anonymous/denied lock, authorised mount, all existing navigation and sign-out PASS.');
