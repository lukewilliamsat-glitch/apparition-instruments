import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {bootAdminGate} from '../../dist/admin/admin-gate.mjs';
import {mountAdminWorkspace} from '../../dist/admin/command/entry.mjs';
import {createFixtureServices} from './fixture-services.mjs';
const tick=()=>new Promise(r=>setTimeout(r,0));
for(const mode of ['escape-close','cancel-button','disabled','disconnected','concealed','submission']){
 const w=new Window({url:'http://127.0.0.1/admin/command/',settings:{disableCSSFileLoading:true,disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true}}),d=w.document,f=createFixtureServices({role:mode==='submission'?'editor':'stock'});let app;
 if(mode==='submission')f.syntheticWriteTesting=true;
 d.write(readFileSync('dist/admin/command/index.html','utf8'));
 await bootAdminGate({document:d,auth:f.auth,workspaceServices:f,load:async()=>({mountAdminWorkspace:async options=>(app=await mountAdminWorkspace(options))})});
 await app.workbench.refresh();await app.editor.open('fx-pot-01');app.editor.set('description','Local focus proposal');
 const target=d.getElementById('review-changes'),dialog=d.getElementById('change-review'),cancel=d.getElementById('cancel-review');
 target.click();for(let i=0;i<10&&!dialog.open;i++)await tick();assert(dialog.open);
 if(mode==='submission'){
  d.getElementById('save-fixture').click();await tick();assert.equal(d.activeElement.id,'editor-heading');
 }else{
  cancel.focus();const event=new w.Event('cancel',{cancelable:true});dialog.dispatchEvent(event);assert(!event.defaultPrevented);assert.equal(d.activeElement,cancel,'cancel must not focus outside the open modal');
  if(mode==='disabled')target.disabled=true;
  if(mode==='disconnected')target.remove();
  if(mode==='concealed')app.boundary.lock('expired');
  if(mode==='cancel-button')cancel.click();else dialog.removeAttribute('open');
  // Model the native close notification explicitly; this is DOM acceptance only.
  dialog.dispatchEvent(new w.Event('close'));await tick();
  if(['escape-close','cancel-button'].includes(mode)){
   assert.equal(d.activeElement,target);
   // Focus movement must not make a dialog-originated Escape close the editor.
   cancel.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
   assert(!d.getElementById('discard-confirm').open);assert.equal(app.editor.snapshot().phase,'review');
  }else assert(d.activeElement!==target,'inappropriate target must not receive restoration');
 }
 app.destroy();await w.happyDOM.close();console.log('PASS dialog lifecycle: '+mode);
}
