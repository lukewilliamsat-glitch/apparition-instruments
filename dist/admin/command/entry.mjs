import {mountWorkbench} from './command01/view.mjs';
import {createReadBoundary} from './read-boundary.mjs';
export async function mountAdminWorkspace({document,auth,services}={}){
 const $=id=>document.getElementById(id),boundary=createReadBoundary({auth,adapter:services?.commandReadAdapter??null});
 let app=null,closed=false;
 const paint=s=>{
  if(closed)return;const ready=s.status==='ready'&&s.catalogueReady;$('command-content').hidden=!ready;$('command-content').inert=!ready;
  const messages={inactive:'Read-only COMMAND. The authenticated catalogue adapter is not activated. No product data has been requested.',checking:'Checking catalogue access. Product records remain concealed.',ready:'Read-only catalogue. Shared product, image, cost and stock changes are disabled.',expired:'Session expired. Restore authentication to continue. Local proposals have not been saved.',denied:'Access denied. This account has no catalogue-read authority.',error:'Catalogue unavailable. Retry safely; no partial or fallback data was accepted.','sign-out':'Session ended. Product data has been cleared.',closed:'Workspace closed.'};
  $('command-status').textContent=messages[s.status]||'Access unavailable. Recheck this session.';
  $('command-status').setAttribute('role',['denied','expired','error'].includes(s.status)?'alert':'status');
  if(!ready&&s.status!=='checking')$('command-status').focus({preventScroll:true});
  $('data-source').textContent=s.source==='synthetic'?'SYNTHETIC ACCEPTANCE DATA · Fictional products, prices, inventory and identities. No live backend.':'Authenticated read adapter is inactive.';
  $('data-freshness').textContent=s.observedAt?'Last verified read: '+s.observedAt+' · display identity is not a write revision.':'No catalogue read completed.';
  $('filter-stock').disabled=!s.capabilities.inventoryRead;
 };
 const off=boundary.subscribe(paint);
 app=mountWorkbench(document,{transport:boundary.catalogueTransport});
 const reconnect=()=>void app.controller.refresh({supersede:true});$('command-reconnect').addEventListener('click',reconnect);
 paint(boundary.snapshot());
 return Object.freeze({boundary,workbench:app.controller,lock(reason){boundary.lock(reason);app.controller.close();if(reason==='sign-out'){$('rows').replaceChildren();$('inspector').replaceChildren();}},destroy(){if(closed)return;closed=true;off();$('command-reconnect').removeEventListener('click',reconnect);app.destroy();boundary.destroy();}});
}
