import {fixtureRecords} from './catalogue-fixtures.mjs';
import {READ_CONTRACT} from '../../dist/admin/command/read-boundary.mjs';
import {validatePatch,applyValues,fingerprint} from '../../dist/admin/command/command02/schema.mjs';
const copy=v=>structuredClone(v);
const labels={resistance:'Resistance',taper:'Taper',tolerance:'Tolerance',capacitance:'Value',voltage:'Voltage',shaft:'Shaft',connection:'Topology'};
export function createFixtureServices({count=14,role='readonly',now=Date.now}={}){
 const calls=[],listeners=new Set(),queue={list:[],detail:[],authorize:[]};let subject='fictional-admin-1',generation=0,expiresAt=now()+3600000;
 let rows=Array.from({length:count},(_,i)=>{
  const x=fixtureRecords[i%14],suffix=i<14?'':'-'+i;
  return {id:x.id+suffix,sku:x.sku+suffix,name:x.name,category:x.category,manufacturer:x.manufacturer,active:x.active,individually:x.individually,in_kits:x.inKits,sale_price:x.salePrice??null,kit_price:x.kitPrice??null,kit_price_quantity:x.kitPriceQuantity??null,updated_at:'2026-10-25T00:00:00Z',description:x.description,specs:{...Object.fromEntries(Object.entries(x.technicalSpecs??{}).filter(([k])=>labels[k]).map(([k,v])=>[labels[k],v])),Series:'Fixture Series',Reference:'DEMO-REF'},_stock:x.stock??0,_unit:x.stockUnit==='metre'?'m':'item',_revision:1};
 });
 const inventory=r=>({component_id:r.id,quantity:r._stock,stock_unit:r._unit});
 const project=(r,full)=>{const {_stock,_unit,_revision,...base}=r;if(full)return copy(base);const {description,specs,...summary}=base;return {...copy(summary),...Object.fromEntries(Object.entries(labels).map(([k,label])=>[k,specs[label]??null]))};};
 const caps=()=>({catalogueRead:['readonly','stock','editor'].includes(role),productRead:['readonly','stock','editor'].includes(role),inventoryRead:['stock','editor'].includes(role),draftPreview:['readonly','stock','editor'].includes(role)});
 const check=()=>{if(expiresAt<=now())throw Object.assign(Error('fixture expired'),{code:'EXPIRED'});if(!caps().catalogueRead)throw Object.assign(Error('fixture denied'),{code:'DENIED'});};
 async function planned(kind,context,normal){calls.push({kind,...context.id?{id:context.id}:{},inventory:context.inventory??false});const custom=queue[kind].shift();return custom?custom({...context,normal}):normal();}
 const adapter=Object.freeze({contract:READ_CONTRACT,environment:'synthetic',subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  authorize:()=>planned('authorize',{},()=>{check();return{subject,sessionId:'fixture-session-'+generation,expiresAt,capabilities:caps()};}),
  list:context=>planned('list',context,()=>{check();return {rows:rows.map(r=>project(r,false)),...context.inventory?{inventory:rows.map(inventory)}:{},complete:true,observedAt:new Date(now()).toISOString()};}),
  detail:(id,context)=>planned('detail',{id,...context},()=>{check();const r=rows.find(r=>r.id===id);if(!r)throw Error('not found');return {row:project(r,true),...context.inventory?{inventory:inventory(r)}:{},complete:true,observedAt:new Date(now()).toISOString()};})
 });
 const auth={restore:async()=>({status:role==='anonymous'?'signed-out':role==='nonadmin'?'denied':'authorized'}),signOut:async()=>{role='anonymous';generation++;listeners.forEach(f=>f());return {status:'signed-out'};},signIn:async()=>({status:'authorized'})};
 const canonical=r=>({id:r.id,sku:r.sku,name:r.name,category:r.category,manufacturer:r.manufacturer,active:r.active,individually:r.individually,inKits:r.in_kits,salePrice:r.sale_price,kitPrice:r.kit_price,kitPriceQuantity:r.kit_price_quantity,stock:r._stock,stockUnit:r._unit,description:r.description,specs:copy(r.specs),technicalSpecs:Object.fromEntries(Object.entries(labels).filter(([k,v])=>r.specs[v]).map(([k,v])=>[k,r.specs[v]])),imageInfo:{kind:'unloaded'},revision:'sim-'+r._revision});
 const receipts=new Map();let savePlan=null,editorOwner=null;
 const syntheticEditorPersistence={kind:'command02-synthetic',syntheticOnly:true,owner:()=>editorOwner,release(){editorOwner=null;},
  async read(id){check();if(editorOwner&&editorOwner!==subject)throw Object.assign(Error('Restore original synthetic actor'),{code:'PERMISSION',outcome:'not-applied'});editorOwner??=subject;return canonical(rows.find(r=>r.id===id));},
  async save(command){check();if(role!=='editor'||editorOwner!==subject)throw Object.assign(Error('Synthetic write denied'),{code:'PERMISSION',outcome:'not-applied'});const signature=fingerprint(command),old=receipts.get(command.operationId);if(old){if(old.owner!==subject||old.signature!==signature)throw Object.assign(Error('Operation mismatch'),{outcome:'not-applied'});return copy(old.result);}
   const r=rows.find(r=>r.id===command.id),current=canonical(r);if(current.revision!==command.expectedRevision)throw Object.assign(Error('Synthetic conflict'),{code:'CONFLICT',outcome:'not-applied',current});
   const patch=validatePatch(command.patch,current,rows.map(canonical)),next=applyValues(current,patch);
   Object.assign(r,{name:next.name,sku:next.sku,description:next.description,specs:copy(next.specs),active:next.active,individually:next.individually,in_kits:next.inKits,sale_price:next.salePrice,kit_price:next.kitPrice,kit_price_quantity:next.kitPriceQuantity,_revision:r._revision+1,updated_at:new Date(now()+r._revision).toISOString()});
   const result={applied:true,operationId:command.operationId,record:canonical(r)};receipts.set(command.operationId,{signature,owner:subject,result:copy(result)});calls.push({kind:'synthetic-save',operationId:command.operationId});
   if(savePlan==='disconnect-after'){savePlan=null;throw Object.assign(Error('Synthetic response lost'),{outcome:'unknown'});}return result;
  },async status(operationId){check();const receipt=receipts.get(operationId);if(receipt&&receipt.owner!==subject)throw Object.assign(Error('Synthetic receipt belongs to another actor'),{code:'PERMISSION',outcome:'not-applied'});return receipt?{status:'committed',result:copy(receipt.result)}:{status:'unknown'};}
 };
 return {auth,commandReadAdapter:adapter,calls,syntheticEditorPersistence,
  setRole(value){role=value;generation++;listeners.forEach(f=>f());},
  setSubject(value){subject=value;generation++;listeners.forEach(f=>f());},
  expire(){expiresAt=now()-1;generation++;listeners.forEach(f=>f());},
  restore(){expiresAt=now()+3600000;generation++;listeners.forEach(f=>f());},
  enqueue(kind,fn){queue[kind].push(fn);},
  actorModify(id,patch){const r=rows.find(r=>r.id===id);Object.assign(r,copy(patch),{_revision:r._revision+1,updated_at:new Date(now()+r._revision).toISOString()});},
  setSavePlan(value){savePlan=value;},canonicalRecords:()=>rows.map(canonical),
  empty(){rows=[];},inspect:()=>copy(rows)
 };
}
