import {mountEclipse} from '/admin/orders/eclipse-ui.mjs';
import {mountEclipseSettings} from '/admin/orders/eclipse-settings.mjs';
import {mountFinanceWorkbench,financeDraft} from '/admin/orders/finance-ui.mjs';
import {financeSummary,withTrustedFacts} from '/admin/orders/eclipse-model.mjs';
import {exampleDocument,exampleOrders,exampleLibrary} from '/eclipse-examples.mjs';
const $=s=>document.querySelector(s), root=$('#eclipse-example'),status=$('#eclipse-state'),orders=$('#eclipse-order'),snapshot=$('#eclipse-saved');
const savedKey='apparition.eclipse.fictional-finance.v1',libraryKey='apparition.eclipse.fictional-library.v1';
const read=(key,fallback)=>JSON.parse(sessionStorage.getItem(key)||JSON.stringify(fallback));
const write=(key,state)=>sessionStorage.setItem(key,JSON.stringify(state));
const library={read:async()=>read(libraryKey,exampleLibrary),save:async(revision,items,presets)=>{
 if(revision!==(await library.read()).revision)throw Error('Library changed; reload before saving.');
 const value={revision:revision+1,items,presets};write(libraryKey,value);return value;
}};
mountEclipseSettings({root:$('#eclipse-library'),repository:library});
let view;
function render(fresh=false,example=false){
 view?.dispose();root.replaceChildren();const order=exampleOrders[Number(orders.value)];
 const record=read(savedKey,{})[order.id];
 let draft=example?exampleDocument(order):record&&!fresh?record.document:withTrustedFacts(financeDraft(order),order),valid=true;
 const renderRecord=()=>{const current=read(savedKey,{})[order.id],s=financeSummary(current?.document);snapshot.textContent=s.status+(s.contribution==null?'':' · £'+(s.contribution/100).toFixed(2)+' contribution · '+s.margin+'% margin')+(current?' · Revision '+current.revision:'');};
 status.textContent=record&&!fresh&&!example?'Saved fictional revision '+record.revision+' loaded.':'Fictional calculation. Nothing has been saved.';
 const persistence={update(value,isValid){draft=value;valid=isValid;const b=root.querySelector('[data-finance-save]');if(b)b.disabled=!valid;},
  save(){if(!valid)return;const records=read(savedKey,{}),current=records[order.id];records[order.id]={document:draft,revision:(current?.revision||0)+1};write(savedKey,records);status.textContent='Saved fictional revision '+records[order.id].revision+'. No database, payment, stock or email action.';renderRecord();}};
 const compact=(focus=false)=>{
  view?.dispose();root.replaceChildren();
  view=mountEclipse({root,order,initialDocument:draft,libraryRepository:library,persistence,advanced});
  if(focus)view.panel.querySelector('[data-eclipse-advanced]').focus();
 };
 function advanced(){
  if(!valid)return;view?.dispose();root.replaceChildren();const b=document.createElement('button');b.type='button';b.textContent='Back to Order Financials';b.addEventListener('click',()=>{if(valid)compact(true);});root.append(b);
  view=mountFinanceWorkbench({root,order,initialDocument:draft,persistence,allowWebsite:true,eclipse:true});view.panel.open=true;b.focus();
 }
 compact();renderRecord();
}
orders.addEventListener('change',()=>render());
$('#eclipse-load-sample').addEventListener('click',()=>render(false,true));
$('#eclipse-check-saved').addEventListener('click',()=>render());
$('#eclipse-reset').addEventListener('click',()=>{sessionStorage.removeItem(savedKey);sessionStorage.removeItem(libraryKey);location.reload();});
render();
