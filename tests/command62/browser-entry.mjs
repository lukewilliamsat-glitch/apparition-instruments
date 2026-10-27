// Fictional records only. None of this module is included in release payloads.
import {bootAdminGate} from '/admin/admin-gate.mjs';
import {setComponentRepository} from '/admin/component-repository.mjs';
import {setAssemblyRepository} from '/admin/assembly-repository.mjs';
import {lesPaulKitAssembly} from '/admin/assemblies.mjs';
import {createAdminOptionRepository,setAdminOptionRepository} from '/backend/catalogue-options.mjs';
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
