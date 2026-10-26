// Isolated fixture only. This module is never included in the production payload.
import {bootAdminGate} from '/admin/admin-gate.mjs';
import {setComponentRepository} from '/admin/component-repository.mjs';
import {setAssemblyRepository} from '/admin/assembly-repository.mjs';
import {setAdminOrderRepository} from '/backend/order-data.mjs?v=external-v1';
const params=new URLSearchParams(location.search),state=params.get('fixture-auth')||'authorized';
const writes=[];let deniedReads=0;const diagnostic={componentLists:0,orderLists:0,loaded:[]};const blocked=async()=>{writes.push('blocked');throw Error('Business writes forbidden in acceptance');};
const component={id:'fixture-cap',name:'Fictional Workshop Capacitor',sku:'FX-CAP-001',category:'capacitors',manufacturer:'Fixture Works',specs:{Value:'0.022 µF',Voltage:'200V'},description:'Fictional component for interface acceptance.',stock:24,stockUnit:'item',active:true,individually:true,inKits:true,salePrice:749,kitPrice:500,kitPriceQuantity:1,internalUnitCost:100,image:null};
const order={id:'fixture-order',reference:'FX-000001',createdAt:'2026-10-26T12:00:00Z',paymentStatus:'paid',fulfilmentStatus:'paid',channel:'EBAY',customer:{name:'Fictional customer',email:'fictional@example.test'},delivery:{},items:[],pricing:{subtotal:749,delivery:0,total:749},statusHistory:[],emailDeliveries:[]};
setComponentRepository({list:async()=>{diagnostic.componentLists++;return params.has('fixture-empty')?[]:[structuredClone(component)];},save:blocked,changeStock:blocked,remove:blocked});setAssemblyRepository({list:async()=>[],get:async()=>null,save:blocked});setAdminOrderRepository({list:async()=>{diagnostic.orderLists++;return [structuredClone(order)];},aftercare:async()=>[],advanceFulfilment:blocked,recordDispatchDetails:blocked});
globalThis.fetch=async(url,options={})=>{const path=new URL(url,location.href).pathname;if((options.method||'GET')==='GET'&&['/rest/v1/catalogue_options','/rest/v1/catalogue_components','/rest/v1/catalogue_wiring_kits'].includes(path))return new Response('[]',{headers:{'Content-Type':'application/json'}});deniedReads++;throw Error('No backend or service requests in isolated shell acceptance');};
const auth={restore:async()=>({status:state==='authorized'?'authorized':state==='denied'?'denied':'signed-out'}),signOut:async()=>({status:'signed-out'})};
const path=location.pathname;let loaded=[];
await bootAdminGate({document,auth,load:async specifier=>{
 loaded.push(new URL(specifier).pathname);diagnostic.loaded.push(specifier);
 if(path==='/admin/'||path==='/admin/index.html'||path==='/admin/orders/'){try{return await import(specifier);}catch(e){diagnostic.importError=String(e);diagnostic.importStack=e.stack;throw e;}}
 // Unchanged specialist business code is covered by accepted source evidence.
 // Native checks here cover the actual retained forms, iframe and new shell geometry.
 if(path==='/admin/conjure/'){const page=document.querySelector('[data-page]');const o=document.createElement('option');o.textContent='Fictional website preview';page.append(o);document.querySelector('[data-status]').textContent='Fictional preview · no website content edited.';document.querySelector('iframe').srcdoc='<!doctype html><style>body{margin:0;background:#f5f2e9;color:#292721;font:18px system-ui;padding:40px}</style><h1>Fictional website preview</h1><p>Isolated editor surface</p>';document.querySelector('[data-advanced]').addEventListener('click',e=>{const panel=document.querySelector('[data-inspector]');panel.hidden=!panel.hidden;e.currentTarget.setAttribute('aria-expanded',String(!panel.hidden));});}
 return {};
}});
if(document.body.classList.contains('admin-authorized')){const note=document.createElement('p');note.className='rebirth-fixture-note';note.textContent='ISOLATED ACCEPTANCE · FICTIONAL RECORDS · NO BUSINESS WRITES';note.style.cssText='font:10px system-ui;color:#d1bc8b;letter-spacing:.08em';document.querySelector('main').append(note);}
window.rebirthFixture={state,loaded,writes,diagnostic,get deniedReads(){return deniedReads;},structuralSpecialist:!['/admin/','/admin/index.html','/admin/orders/'].includes(path)};
