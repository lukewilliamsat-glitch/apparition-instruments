// Functioning in-process transaction reference; separate PostgreSQL fixture verifies DB semantics.
// This module is deliberately synthetic, never a deployable auth/session implementation.
import {recordsFor} from '../command02/persistence.mjs';
import {applyValues} from '../command02/schema.mjs';
import {envelope,canonical,productValues,nextStock,deny} from './contract.mjs';
const clone=v=>structuredClone(v),project=r=>{const{privateCost,imageData,...record}=r;return clone(record);};
export function createIroncladServer({authority,count=14,now=Date.now,checkpoint=async()=>{}}={}){
 if(authority?.kind!=='command04-fixture-authority'||typeof authority.authorize!=='function')throw Error('An explicit synthetic server authority is required.');
 // Explicit controlled seed values, matching COMMAND03 fixture inventory semantics.
 let products=new Map(recordsFor(count).map(r=>[r.id,{...r,stock:r.stock??0,salePrice:r.salePrice??null,kitPrice:r.kitPrice??null,kitPriceQuantity:r.kitPriceQuantity??null}])),receipts=new Map(),audit=[],tail=Promise.resolve();
 const pending=new Map();
 async function permitted(session,id,write=false,command){
  const g=await authority.authorize(session);
  if(!g||typeof g.subject!=='string'||!g.subject||g.subject!==session?.subject||!Number.isFinite(g.expiresAt)||g.expiresAt<=now()||g.capabilities?.productRead!==true||g.ids&&!g.ids.includes(id)||write&&g.capabilities.productWrite!==true)deny('PERMISSION','Server authority denied this product operation.');
  if(command?.inventory&&g.capabilities.inventoryWrite!==true||command&&Object.hasOwn(command,'internalCost')&&g.capabilities.costWrite!==true)deny('PERMISSION','Separate server capability required for inventory or private cost.');
  return g;
 }
 const locked=fn=>{const work=tail.then(fn);tail=work.catch(()=>{});return work;};
 async function read(id,{session}={}){await permitted(session,id);const r=products.get(id);if(!r)deny('MISSING','Product unavailable.');return project(r);}
 async function mutate(raw,{session}={}){
  const c=envelope(raw),grant=await permitted(session,c.id,true,c),key=canonical([grant.subject,c.operationId]),signature=canonical(c);
  const running=pending.get(key);if(running){if(running.signature!==signature)deny('IDEMPOTENCY','Operation identity already binds different content.');return clone(await running.promise);}
  const promise=locked(async()=>{
   await permitted(session,c.id,true,c);
   const previous=receipts.get(key);if(previous){if(previous.signature!==signature)deny('IDEMPOTENCY','Operation identity already binds different content.');return clone(previous.result);}
   const current=products.get(c.id);if(!current)deny('MISSING','Product unavailable.');
   if(current.revision!==c.expectedRevision)deny('CONFLICT','A newer product revision exists.',{current:project(current)});
   const values=productValues(c,current,[...products.values()]),next=applyValues(current,values);
   next.stock=nextStock(c,current);if(Object.hasOwn(c,'internalCost'))next.privateCost=c.internalCost;
   next.revision='sim-'+(Number(current.revision.slice(4))+1);
   // All staging is private. Fault/revocation injection cannot expose intermediate records.
   for(const phase of ['product','inventory','private-cost','audit','receipt'])await checkpoint(phase,{command:clone(c),next:project(next)});
   await permitted(session,c.id,true,c);
   if(products.get(c.id).revision!==c.expectedRevision)deny('CONFLICT','Concurrent authority change rejected.');
   const result={operationId:c.operationId,applied:true,record:project(next)};
   const event={actor:grant.subject,operationId:c.operationId,id:c.id,before:project(current),after:project(next),privateCost:{before:current.privateCost,after:next.privateCost},at:now()};
   // Single synchronous visibility boundary; no externally visible intermediate state.
   products.set(c.id,next);audit.push(event);receipts.set(key,{signature,id:c.id,result:clone(result)});
   return result;
  });pending.set(key,{signature,promise,id:c.id});
  try{return clone(await promise);}finally{if(pending.get(key)?.promise===promise)pending.delete(key);}
 }
 async function status(operationId,{session}={}){
  const g=await authority.authorize(session);if(typeof g?.subject!=='string'||!g.subject||g.subject!==session?.subject||!Number.isFinite(g.expiresAt)||g.expiresAt<=now()||g.capabilities?.productRead!==true)deny('PERMISSION','Server authority denied operation reconciliation.');
  const key=canonical([g.subject,operationId]),r=receipts.get(key),p=pending.get(key);
  if(r||p)await permitted(session,(r??p).id);
  return r?{status:'committed',result:clone(r.result)}:p?{status:'pending'}:{status:'unknown'};
 }
 return Object.freeze({kind:'command04-fixture-server',productionSupported:false,read,mutate,status,
  // Isolated fixture administration, not an application endpoint.
  inspect:id=>clone(products.get(id)),audit:()=>clone(audit),receiptCount:()=>receipts.size,
  actorModify(id,patch){const r=products.get(id);if(!r)throw Error('Missing fixture');const c=envelope({protocol:'command04-v1',id,operationId:'ironclad-op-actor',expectedRevision:r.revision,patch});const next=applyValues(r,productValues(c,r,[...products.values()]));next.revision='sim-'+(Number(r.revision.slice(4))+1);products.set(id,next);return project(next);}
 });
}
