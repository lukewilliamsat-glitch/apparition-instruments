import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {bootAdminGate} from '../../dist/admin/admin-gate.mjs';
import {mountAdminWorkspace} from '../../dist/admin/command/entry.mjs';
import {adminRoutes} from '../../dist/admin/application.mjs';
import {createProductionFixture} from './production-fixture.mjs';
const settings={disableCSSFileLoading:true,disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true};
for(const outcome of ['ready','revoked','expired','signed-out']){
 const window=new Window({url:'http://127.0.0.1/admin/command/',settings}),document=window.document;
 document.write(readFileSync('dist/admin/command/index.html','utf8'));const realNow=Date.now;let clock=realNow(),app,writes=0;Date.now=()=>clock;
 const f=createProductionFixture({storage:window.localStorage,now:()=>clock,events:window});
 await bootAdminGate({document,auth:f.auth,workspaceServices:{commandReadAdapter:f.adapter,syntheticWriteTesting:true,syntheticEditorPersistence:{syntheticOnly:true,save:()=>{writes++;}}},load:async()=>({mountAdminWorkspace:async options=>{app=await mountAdminWorkspace(options);return app;}})});
 await app.workbench.refresh();assert.equal(app.workbench.snapshot().status,'ready');
 assert(document.body.classList.contains('admin-authorized'));for(const route of adminRoutes)assert(document.querySelector('[data-workspace="'+route.id+'"]'),route.id);
 await app.workbench.select('fx-pot-01');assert.equal(app.workbench.snapshot().detailStatus,'ready');assert(document.querySelector('[data-enter-editor]').disabled);
 assert.equal(await app.editor.save(),false);assert.equal(writes,0);assert.equal(document.getElementById('save-fixture').textContent,'Production save disabled');
 if(outcome==='revoked'){f.setMember(false);await app.workbench.select('fx-cap-01');assert.equal(app.boundary.snapshot().status,'denied');}
 if(outcome==='expired'){clock+=3601000;await assert.rejects(app.boundary.readProduct('fx-pot-01'),{code:'EXPIRED'});assert.equal(document.activeElement.id,'command-status');}
 if(outcome==='signed-out'){document.querySelector('.admin-lock').click();for(let i=0;i<50&&document.body.classList.contains('admin-authorized');i++)await new Promise(r=>setTimeout(r,0));assert(!document.body.classList.contains('admin-authorized'));assert.equal(document.querySelectorAll('#rows tr').length,0);}
 if(outcome!=='ready')assert(document.getElementById('command-content').hidden);
 app.destroy();await window.happyDOM.close();Date.now=realNow;console.log('PASS production-shaped DOM integration: '+outcome);
}
