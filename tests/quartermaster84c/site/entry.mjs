import {publicBackendConfig as backend} from './backend/public-config.mjs';
import {createAdminAuth} from './admin/admin-auth.mjs';
import {boundedJSON} from './admin/command/bounded-json.mjs';
import {mountWorkshop,stageTransport} from './workshop.mjs';
import {evaluate} from './admin/omniscience/model.mjs';

const host='https://prwmowexhonguvtiywsy.supabase.co';
if(backend.url!==host) throw new Error('Staging backend seal mismatch');
const stageAuthRoutes=new Map([
 ['/auth/v1/token','POST'],['/auth/v1/user','GET'],['/auth/v1/logout','POST'],
 ['/rest/v1/rpc/quartermaster84c_orders','GET']
]);
const auth=createAdminAuth({config:backend,storage:sessionStorage,request:(url,init={})=>{
 const target=new URL(url);
 if(target.origin!==host||stageAuthRoutes.get(target.pathname)!==(init.method??'GET')) {
  throw new Error('Unsupported staging authentication call');
 }
 return fetch(target,{...init,cache:'no-store',redirect:'error',credentials:'omit',referrerPolicy:'no-referrer',
  signal:init.signal??AbortSignal.timeout(8000)});
}});
const request=stageTransport({backend,auth,boundedJSON});
const call=(type,body={})=>request(type,body,AbortSignal.timeout(10000));
const area=document.querySelector('#workspace');
const status=document.querySelector('#status');
const signIn=document.querySelector('#sign-in');
const signOut=document.querySelector('#sign-out');
const money=val=>Number.isInteger(val)?new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(val/100):'Not recorded';
const node=(tag,label)=>{const el=document.createElement(tag);if(label!==undefined)el.textContent=label;return el;};
const link=(label,path)=>Object.assign(node('a',label),{href:path});
const button=(label,fn)=>{const el=node('button',label);el.type='button';el.addEventListener('click',fn);return el;};
let activeWorkshop, screen=0;
function hide(message){
 ++screen;activeWorkshop?.lock();activeWorkshop=undefined;
 area.replaceChildren();signOut.hidden=true;signIn.hidden=false;status.textContent=message;
}
auth.subscribe(()=>hide('Sign into the staging workshop.'));
signIn.addEventListener('submit',async event=>{
 event.preventDefault();
 const submit=signIn.querySelector('button');submit.disabled=true;
 try{
  const result=await auth.signIn(signIn.email.value,signIn.password.value);
  if(result.status==='authorized') await show();
  else {try{await auth.signOut();}catch{} hide('The verified 84C staging role is required.');}
 }catch{hide('Staging sign-in could not be verified.');}
 finally{signIn.password.value=''; submit.disabled=false;}
});
signOut.addEventListener('click',async()=>{
 try{await auth.signOut();hide('Signed out of staging.');}
 catch{status.textContent='Sign-out could not be verified. Retry to end the staging session.';}
});

async function show(){
 const epoch=++screen;
 const model=await call('orders');
 if(epoch!==screen) return;
 activeWorkshop?.lock();area.replaceChildren();
 signIn.hidden=true;signOut.hidden=false;status.textContent='';
 const id=new URL(location.href).searchParams.get('order')??new URL(location.href).searchParams.get('id');
 const order=model.orders.find(x=>x.id===id);
 const route=location.pathname;
 const nav=node('nav'); nav.setAttribute('aria-label','Staging navigation');
 nav.append(link('Orders','/admin/orders/'),link('DOMINION','/admin/dominion/'));
 area.append(nav);
 const panel=node('div');area.append(panel);
 if(route==='/admin/dominion/'){
  const modes=await call('dominion');
  if(epoch!==screen)return;
  panel.append(node('h1','DOMINION'),node('p','UNITY '+modes.unity.mode),node('p','QUARTERMASTER review '+modes.quartermaster.mode));
  return;
 }
 if(!order){
  panel.append(node('h1','Orders'));
  for(const o of model.orders){const row=node('p');row.append(link(o.reference,'/admin/orders/?id='+o.id));panel.append(row);}
  return;
 }
 const context=()=>model.orders.find(x=>x.id===id);
 if(route==='/admin/quartermaster/'&&model.writer){
  const suppliers=await call('suppliers');
  if(epoch!==screen)return;
  activeWorkshop=mountWorkshop({document,root:panel,orderId:id,request,suppliers});return;
 }
 if(route==='/admin/quartermaster/'){
  const read=await call('review',{p_order:id});
  if(epoch!==screen)return;
  panel.append(node('h1','QUARTERMASTER review'),link('Back to this order','/admin/orders/?id='+id));
  for(const row of read.order?.picks??[])panel.append(node('p',row.name+' · '+row.picked+' / '+row.quantity));
  return;
 }
 if(route==='/admin/finance/'&&model.finance){
  panel.append(node('h1','ECLIPSE'),link('Back to this order','/admin/orders/?id='+id));
  const p=await call('proposal',{p_order:id});
  if(epoch!==screen)return;
  if(p.state!=='unsaved'){panel.append(node('p','Complete packing before reviewing the proposal.'));return;}
  const card=node('section');
  card.append(node('h2','Unsaved packing cost proposal'),node('p','Packaging actual '+money(p.evidence.packaging)),
   node('p','Postage estimate '+money(p.evidence.estimate)),node('p','Postage actual '+money(p.evidence.actual)),
   node('p','Current saved revision '+p.revision));
  if(p.canApprove){
   const save=button('Approve and save revision',async()=>{
    save.disabled=true;
    const req=crypto.randomUUID();
    const result=node('p','Checking finance receipt…');result.setAttribute('role','status');card.append(result);
    let receipt;
    try{receipt=await call('financeSave',{p_order:id,p_revision:p.revision,p_basis:p.orderBasisHash,p_evidence:p.evidenceHash,p_request:req});}
    catch{try{receipt=await call('financeStatus',{p_order:id,p_request:req});}catch{}}
    result.textContent=receipt?.outcome==='committed'?'Saved revision '+receipt.revision:receipt?.outcome?'Finance changed. Reload this order.':'Outcome unconfirmed. Reload before saving again.';
   });
   card.append(save);
  } else card.append(node('p','A finance approver and recorded actual postage are required to save.'));
  if(model.financeApprove) card.append(link('Open OMNISCIENCE result','/admin/omniscience/?order='+id));
  panel.append(card);return;
 }
 if(route==='/admin/omniscience/'&&model.financeApprove){
  panel.append(node('h1','OMNISCIENCE'),link('Back to this order','/admin/orders/?id='+id));
  const row=await call('omniscience',{p_order:id});
  if(epoch!==screen)return;
  if(row){
   const summary=evaluate(row);
   panel.append(node('p',summary.label));
   if(summary.calculation)panel.append(node('p','Packaging '+money(summary.calculation.fulfilmentCosts.packaging)),
    node('p','Shipping '+money(summary.calculation.fulfilmentCosts.shipping)),
    node('p','Contribution '+money(summary.calculation.contributionMinor)));
  } else panel.append(node('p','The order is outside the current reporting result.'));
  return;
 }
 panel.append(node('h1',context().reference),link('Open packing workshop','/admin/quartermaster/?order='+id));
 if(model.finance)panel.append(node('p'),link('Review ECLIPSE costs','/admin/finance/?order='+id));
}

try{const result=await auth.restore();if(result.status==='authorized')await show();else hide('Sign into the staging workshop.');}
catch{hide('Staging access could not be verified. Sign in again.');}
