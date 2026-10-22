import {mountWorkbench} from '../command01/view.mjs';
import {createEditorView} from '../command02/editor-view.mjs';
import {createFixtureIdentity} from './identity.mjs';
import {createFixtureWire} from './fixture-wire.mjs';
import {createBridge} from './bridge.mjs';
const identity=createFixtureIdentity(),fixture=createFixtureWire(),bridge=createBridge({identity,transport:fixture.transport,mode:'fixture-versioned',timeoutMs:2000});
const port=bridge.createEditorPort(),$=id=>document.getElementById(id);let app,retainedOwner=null,lastSubject=null,closed=false;
const editor=createEditorView(document,{persistence:port,timeoutMs:2500,onSaved:()=>{if(app)void app.controller.refresh({supersede:true});}});
app=mountWorkbench(document,{transport:bridge.catalogueTransport,extension:{
 beforeAction:async action=>{const allowed=await editor.beforeAction(action);if(allowed&&editor.session.snapshot().phase==='closed'){port.release();retainedOwner=null;}return allowed;},
 onState:editor.workbenchState
}});
function paint(s){
 if(closed)return;const draft=editor.session.snapshot();
 if(draft.phase==='closed'){retainedOwner=null;if(port.owner())port.release();}
 if(s.status!=='authorized'&&draft.phase!=='closed'&&!retainedOwner)retainedOwner=port.owner()??lastSubject;
 const allowed=s.status==='authorized'&&s.capabilities.catalogueRead&&(!retainedOwner||retainedOwner===s.subject);
 $('bridge-protected').hidden=!allowed;$('bridge-protected').inert=!allowed;
 if(!allowed){for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();}
 const blockedOwner=s.status==='authorized'&&retainedOwner&&retainedOwner!==s.subject;
 $('bridge-status').textContent=blockedOwner?'An earlier identity has a retained draft. Restore its synthetic session to continue.':s.status==='authorized'?(s.capabilities.productWrite?'Authorised fixture session · synthetic saves available':'Read-only fixture session · product saves denied'):s.status==='signed-out'?'No synthetic session · catalogue access locked':'Session '+s.status+' · any local draft is retained';
 $('bridge-status').setAttribute('role',allowed?'status':'alert');
 $('bridge-end').disabled=identity.snapshot().session===null;
 if(allowed)lastSubject=s.subject;
 // This guidance is not the permission boundary: the adapter/fixture authority
 // independently revalidate even if a caller bypasses these controls.
 const write=allowed&&s.capabilities.productWrite;
 if(!write){if(!$('review-changes').disabled)$('review-changes').disabled=true;if(!$('save-fixture').disabled)$('save-fixture').disabled=true;}
 $('bridge-readonly').hidden=!allowed||write;
}
const unsubscribe=bridge.subscribe(paint),observe=new MutationObserver(()=>paint(bridge.snapshot()));
observe.observe($('editor-workspace'),{childList:true,subtree:true});
observe.observe($('review-changes'),{attributes:true,attributeFilter:['disabled']});
function restore(session){identity.install(session);return bridge.authorize().then(async()=>{paint(bridge.snapshot());await app.controller.refresh({supersede:true});return true;}).catch(()=>{paint(bridge.snapshot());return false;});}
$('bridge-start').addEventListener('click',()=>void restore(fixture.issue()));
$('bridge-end').addEventListener('click',()=>{identity.clear();paint(bridge.snapshot());});
Object.defineProperty(window,'command02',{value:Object.freeze({workbench:app.controller})});
const destroy=()=>{if(closed)return;closed=true;observe.disconnect();unsubscribe();editor.destroy();app.destroy();bridge.destroy();};
window.addEventListener('pagehide',destroy,{once:true});
Object.defineProperty(window,'command03',{value:Object.freeze({identity,fixture,bridge,port,editor:editor.session,view:editor,workbench:app.controller,restore,destroy}),writable:false});
paint(bridge.snapshot());
