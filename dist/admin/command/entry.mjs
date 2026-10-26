import {mountWorkbench} from './command01/view.mjs?build=df78c5bf5144b012a7d96c628186180fa6432df3';
import {createReadBoundary} from './read-boundary.mjs?build=df78c5bf5144b012a7d96c628186180fa6432df3';
import {createEditorView} from './command02/editor-view.mjs?build=df78c5bf5144b012a7d96c628186180fa6432df3';
import {createPreviewPort} from './editor-port.mjs?build=df78c5bf5144b012a7d96c628186180fa6432df3';
import {mountPresentation} from './presentation.mjs?build=df78c5bf5144b012a7d96c628186180fa6432df3';
import {createProductionReadAdapter} from './production-read.mjs?build=df78c5bf5144b012a7d96c628186180fa6432df3';
export async function mountAdminWorkspace({document,auth,services}={}){
 const $=id=>document.getElementById(id),boundary=createReadBoundary({auth,adapter:services?.commandReadAdapter??createProductionReadAdapter({auth,events:document.defaultView})});
 let app=null,editor=null,presentation=null,closed=false;
 for(const link of document.querySelectorAll('link[rel=stylesheet]'))if(new URL(link.href,document.baseURI).pathname.includes('/admin/command/'))document.head.append(link);
 const resize=()=>{const h=document.querySelector('[data-admin-topbar]')?.getBoundingClientRect().height;if(h)document.body.style.setProperty('--command-topbar-height',h+'px');};
 const resizeObserver=typeof document.defaultView.ResizeObserver==='function'?new document.defaultView.ResizeObserver(resize):null;
 if(document.querySelector('[data-admin-topbar]'))resizeObserver?.observe(document.querySelector('[data-admin-topbar]'));resize();
 const previewPort=createPreviewPort(boundary);
 const synthetic=services?.syntheticWriteTesting===true&&services?.commandReadAdapter?.environment==='synthetic'&&services?.syntheticEditorPersistence?.syntheticOnly===true?services.syntheticEditorPersistence:null;
 const canSave=()=>Boolean(synthetic&&services.syntheticWriteTesting===true&&boundary.snapshot().status==='ready');
 const port=synthetic||previewPort;
 const paint=s=>{
  if(closed)return;const owner=port.owner?.(),ready=s.status==='ready'&&s.catalogueReady&&(!owner||owner===s.subject);$('command-content').hidden=!ready;$('command-content').inert=!ready;
  if(!ready){for(const dialog of document.querySelectorAll('dialog[open]')){if(dialog.id==='discard-confirm')$('keep-editing').click();else dialog.close();}}
  const messages={inactive:'Read-only COMMAND. The authenticated catalogue adapter is not activated. No product data has been requested.',checking:'Checking catalogue access. Product records remain concealed.',ready:'Read-only catalogue. Shared product, image, cost and stock changes are disabled.',expired:'Session expired. Restore authentication to continue. Local proposals have not been saved.',denied:'Access denied. This account has no catalogue-read authority.',error:'Catalogue unavailable. Retry safely; no partial or fallback data was accepted.','sign-out':'Session ended. Product data has been cleared.',closed:'Workspace closed.'};
  $('command-status').textContent=s.status==='ready'&&!s.catalogueReady?'Access confirmed. Loading catalogue…':messages[s.status]||'Access unavailable. Recheck this session.';
  if(owner&&s.subject&&owner!==s.subject)$('command-status').textContent='Restore the original identity to access its retained unsaved proposal. Product details remain concealed.';
  $('command-status').setAttribute('role',['denied','expired','error'].includes(s.status)?'alert':'status');
  if(['denied','expired','error','sign-out'].includes(s.status))$('command-status').focus({preventScroll:true});
  $('command-reconnect').hidden=ready;
  $('data-source').textContent=s.source==='synthetic'?(synthetic?'SYNTHETIC WRITE TESTING · In-memory fixture only. No production data or saves.':'SYNTHETIC ACCEPTANCE DATA · Fictional products, prices, inventory and identities. No live backend.'):s.status==='ready'?'Authenticated catalogue · Read only. Original images and private costs are not requested.':'Production read connection awaiting verification. No catalogue data requested.';
  $('data-freshness').textContent=s.observedAt?'Last verified read: '+s.observedAt+' · display identity is not a write revision.':'No catalogue read completed.';
  $('filter-stock').disabled=!s.capabilities.inventoryRead;
  $('save-fixture').disabled=!canSave()||editor?.session.snapshot().phase!=='review';
 };
 const off=boundary.subscribe(paint);
 editor=createEditorView(document,{persistence:port,canSave,getSelectedId:()=>app?.controller.snapshot().selectedId,
  onSaved:()=>void app?.controller.refresh({supersede:true}),onState:s=>{
   presentation?.render();
   if(s.phase==='closed')port.release?.();
   if(s.phase==='conflict'){$('conflict-panel').tabIndex=-1;$('conflict-panel').focus({preventScroll:true});}
  }});
 presentation=mountPresentation(document,editor);
 $('save-fixture').textContent=synthetic?'Confirm synthetic test save':'Production save disabled';
 if(synthetic)$('data-source').textContent='SYNTHETIC WRITE TESTING · No production data or writes.';
 app=mountWorkbench(document,{transport:boundary.catalogueTransport,extension:{beforeAction:action=>editor.beforeAction(action),onState:s=>{
  editor.workbenchState(s);const button=$('inspector').querySelector('[data-enter-editor]');if(button)button.disabled=!boundary.snapshot().capabilities.draftPreview;
 }}});
 const navigation=async event=>{
  const link=event.target.closest('a[href]');if(!link||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||link.target==='_blank')return;
  const url=new URL(link.href,document.baseURI);if(url.pathname===document.location.pathname||!editor.session.snapshot().needsProtection)return;
  event.preventDefault();event.stopImmediatePropagation();if(await editor.beforeAction({type:'close'}))document.defaultView.location.assign(url.href);
 };
 document.addEventListener('click',navigation,true);
 const reconnect=()=>void app.controller.refresh({supersede:true});$('command-reconnect').addEventListener('click',reconnect);
 paint(boundary.snapshot());
 return Object.freeze({boundary,workbench:app.controller,editor:editor.session,editorView:editor,previewPort,lock(reason){boundary.lock(reason);if(reason==='sign-out'){editor.session.close();app.controller.close();$('rows').replaceChildren();$('inspector').replaceChildren();}},destroy(){if(closed)return;closed=true;off();resizeObserver?.disconnect();presentation.destroy();document.removeEventListener('click',navigation,true);$('command-reconnect').removeEventListener('click',reconnect);editor.destroy();app.destroy();boundary.destroy();}});
}
