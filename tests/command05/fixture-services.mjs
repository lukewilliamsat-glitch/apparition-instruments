import {fixtureRecords} from './catalogue-fixtures.mjs';
import {READ_CONTRACT} from '../../dist/admin/command/read-boundary.mjs';
const copy=v=>structuredClone(v);
const labels={resistance:'Resistance',taper:'Taper',tolerance:'Tolerance',capacitance:'Value',voltage:'Voltage',shaft:'Shaft',connection:'Topology'};
export function createFixtureServices({count=14,role='readonly',now=Date.now}={}){
 const calls=[],listeners=new Set(),queue={list:[],detail:[],authorize:[]};let generation=0,expiresAt=now()+3600000;
 let rows=Array.from({length:count},(_,i)=>{
  const x=fixtureRecords[i%14],suffix=i<14?'':'-'+i;
  return {id:x.id+suffix,sku:x.sku+suffix,name:x.name,category:x.category,manufacturer:x.manufacturer,active:x.active,individually:x.individually,in_kits:x.inKits,sale_price:x.salePrice??null,kit_price:x.kitPrice??null,kit_price_quantity:x.kitPriceQuantity??null,updated_at:'2026-10-25T00:00:00Z',description:x.description,specs:{...Object.fromEntries(Object.entries(x.technicalSpecs??{}).filter(([k])=>labels[k]).map(([k,v])=>[labels[k],v])),Series:'Fixture Series',Reference:'DEMO-REF'},_stock:x.stock??0,_unit:x.stockUnit==='metre'?'m':'item'};
 });
 const inventory=r=>({component_id:r.id,quantity:r._stock,stock_unit:r._unit});
 const project=(r,full)=>{const {_stock,_unit,...base}=r;if(full)return copy(base);const {description,specs,...summary}=base;return {...copy(summary),...Object.fromEntries(Object.entries(labels).map(([k,label])=>[k,specs[label]??null]))};};
 const caps=()=>({catalogueRead:['readonly','stock','editor'].includes(role),productRead:['readonly','stock','editor'].includes(role),inventoryRead:['stock','editor'].includes(role),draftPreview:['readonly','stock','editor'].includes(role)});
 const check=()=>{if(expiresAt<=now())throw Object.assign(Error('fixture expired'),{code:'EXPIRED'});if(!caps().catalogueRead)throw Object.assign(Error('fixture denied'),{code:'DENIED'});};
 async function planned(kind,context,normal){calls.push({kind,...context.id?{id:context.id}:{},inventory:context.inventory??false});const custom=queue[kind].shift();return custom?custom({...context,normal}):normal();}
 const adapter=Object.freeze({contract:READ_CONTRACT,environment:'synthetic',subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  authorize:()=>planned('authorize',{},()=>{check();return{subject:'fictional-admin-1',sessionId:'fixture-session-'+generation,expiresAt,capabilities:caps()};}),
  list:context=>planned('list',context,()=>{check();return {rows:rows.map(r=>project(r,false)),...context.inventory?{inventory:rows.map(inventory)}:{},complete:true,observedAt:new Date(now()).toISOString()};}),
  detail:(id,context)=>planned('detail',{id,...context},()=>{check();const r=rows.find(r=>r.id===id);if(!r)throw Error('not found');return {row:project(r,true),...context.inventory?{inventory:inventory(r)}:{},complete:true,observedAt:new Date(now()).toISOString()};})
 });
 const auth={restore:async()=>({status:role==='anonymous'?'signed-out':role==='nonadmin'?'denied':'authorized'}),signOut:async()=>{role='anonymous';generation++;listeners.forEach(f=>f());return {status:'signed-out'};},signIn:async()=>({status:'authorized'})};
 return {auth,commandReadAdapter:adapter,calls,
  setRole(value){role=value;generation++;listeners.forEach(f=>f());},
  expire(){expiresAt=now()-1;generation++;listeners.forEach(f=>f());},
  restore(){expiresAt=now()+3600000;generation++;listeners.forEach(f=>f());},
  enqueue(kind,fn){queue[kind].push(fn);},
  actorModify(id,patch){const r=rows.find(r=>r.id===id);Object.assign(r,copy(patch),{updated_at:new Date(now()+1).toISOString()});},
  empty(){rows=[];},inspect:()=>copy(rows)
 };
}
