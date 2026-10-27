// Fictional records only. None of this module is included in release payloads.
import {bootAdminGate} from '/admin/admin-gate.mjs';
import {setComponentRepository} from '/admin/component-repository.mjs';
import {setAssemblyRepository} from '/admin/assembly-repository.mjs';
import {lesPaulKitAssembly} from '/admin/assemblies.mjs';
import {createAdminOptionRepository,setAdminOptionRepository} from '/backend/catalogue-options.mjs';
const phase=(await(await fetch('/tests/command62/phase.json')).json()).phase;
if(['C','C_NAV'].includes(phase)){
 const {setOperationsRepository}=await import('/backend/operations-admin.mjs');
 const {adminAuthSessionKey}=await import('/admin/admin-auth.mjs');
 const calls=[],businessWrites=[],params=new URLSearchParams(location.search),blocked=async()=>{businessWrites.push('BLOCKED');throw Error('Business writes forbidden in acceptance');};
 const parts=[{id:'fixture-cap',sku:'FX-CAP',name:'Fictional Workshop Capacitor',category:'capacitors',sale_price:199},{id:'fixture-switch',sku:'FX-SW',name:'Fictional Workshop Switch',category:'switches',sale_price:399}];
 setOperationsRepository({store:async()=>({desired_state:'OPEN',pause_from:null,resume_at:null,customer_title:'Orders open',customer_message:'Fictional storefront is open.',internal_reason:'',updated_at:'2026-10-27T00:00:00Z'}),posts:async()=>[],audit:async()=>[],destinations:async()=>[],destinationProducts:async()=>parts,saveStore:blocked,savePost:blocked,saveDestination:blocked,removeDestination:blocked});
 localStorage.setItem(adminAuthSessionKey,JSON.stringify({access_token:'fictional-ordinary-session',refresh_token:'fictional-refresh',expires_at:Math.floor(Date.now()/1000)+3600}));
 globalThis.fetch=async(url,options={})=>{const u=new URL(url,location.href);calls.push({path:u.pathname,query:u.search,method:options.method||'GET'});if(options.headers?.Authorization!=='Bearer fictional-ordinary-session')throw Error('Ordinary Auth required');if((options.method||'GET')!=='GET')return blocked();if(u.pathname==='/rest/v1/components')return params.has('fixture-denied')?Response.json({message:'Fictional permission refusal'},{status:403}):Response.json(parts);if(u.pathname==='/rest/v1/inventory')return Response.json(parts.map(p=>({component_id:p.id,quantity:p.id==='fixture-cap'?24:5})));throw Error('No backend service requests in isolated acceptance');};
 await bootAdminGate({document,auth:{restore:async()=>({status:'authorized'}),signOut:async()=>{localStorage.removeItem(adminAuthSessionKey);return {status:'signed-out'};}},load:specifier=>import(specifier)});
 window.commerceFixture={calls,businessWrites,phase};
}else{
const params=new URLSearchParams(location.search),calls=[],businessWrites=[];
let options=[{option_set:'manufacturer',option_key:'fixture_used',label:'Fictional used maker',active:false,aliases:['Old maker'],sort_order:0},{option_set:'manufacturer',option_key:'fixture_unused',label:'Fictional unused maker',active:true,aliases:[],sort_order:1}];
const component={id:'fixture-cap',name:'Fictional Workshop Capacitor',sku:'FX-CAP-001',category:'capacitors',manufacturer:'Fictional used maker',manufacturerKey:'fixture_used',specs:{Value:'0.022 µF',Voltage:'200V'},description:'Fictional component.',stock:24,stockUnit:'item',active:true,individually:true,inKits:true,salePrice:749,kitPrice:500,kitPriceQuantity:1,internalUnitCost:100,image:null};
const blocked=async()=>{businessWrites.push('BLOCKED');throw Error('Business writes forbidden in acceptance');};
setComponentRepository({list:async()=>[structuredClone(component)],save:blocked,changeStock:blocked,remove:blocked});
setAssemblyRepository({list:async()=>[structuredClone(lesPaulKitAssembly)],get:async()=>null,save:blocked});
setAdminOptionRepository(createAdminOptionRepository({send:async(path,request={})=>{
 calls.push({path,method:request.method||'GET',body:request.body});
 if(path==='catalogue_options'&&!request.method)return Response.json(options);
 if(path==='rpc/delete_unused_catalogue_option'){
  if(params.has('fixture-denied'))return Response.json({message:'Admin membership required'},{status:403});
  if(params.has('fixture-kit'))return Response.json({deleted:false,dependencies:[{kind:'Kit Definition',id:'fixture-kit'}]});
  if(request.body.p_key!=='fixture_unused')throw Error('Referenced option must never be deleted');
  options=options.filter(x=>x.option_key!==request.body.p_key);return Response.json({deleted:true,dependencies:[]});
 }
 throw Error('Unexpected catalogue mutation');
}}));
globalThis.fetch=async(url,request={})=>{const path=new URL(url,location.href).pathname;if((request.method||'GET')==='GET'&&path==='/rest/v1/catalogue_options')return Response.json(options);if((request.method||'GET')==='GET'&&['/rest/v1/catalogue_components','/rest/v1/catalogue_wiring_kits'].includes(path))return Response.json([]);throw Error('No service requests in isolated acceptance');};
await bootAdminGate({document,auth:{restore:async()=>({status:'authorized'}),signOut:async()=>({status:'signed-out'})},load:specifier=>import(specifier)});
window.commerceFixture={calls,businessWrites,phase:'B'};
}
