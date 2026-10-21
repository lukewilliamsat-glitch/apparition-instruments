import {fixtureRecords} from '../command01/fixtures.mjs';
import {summary} from '../command01/model.mjs';
import {validatePatch,applyValues,fingerprint} from './schema.mjs';
export class FixtureError extends Error{
 constructor(code,message,outcome='not-applied',current=null){super(message);this.code=code;this.outcome=outcome;this.current=current;}
}
const clone=v=>structuredClone(v),wait=ms=>new Promise(r=>setTimeout(r,ms));
const project=r=>{const{privateCost,imageData,...publicRecord}=r;return clone(publicRecord);};
export function recordsFor(count=14){
 if(!Number.isInteger(count)||count<0||count>500)throw Error('Fixture size must be 0–500.');
 return Array.from({length:count},(_,index)=>{
  const base=clone(fixtureRecords[index%fixtureRecords.length]),suffix=index<14?'':'-'+Math.floor(index/14);
  return {...base,id:base.id+suffix,sku:base.sku+suffix,revision:'sim-1',stockUnit:base.stockUnit==='metre'?'m':base.stockUnit??'item',
   specs:{Series:'Fixture series',Reference:'DEMO-'+index},privateCost:123,imageData:'preserved-synthetic-original'};
 });
}
export function createPersistenceFixture({count=14,delay=80}={}){
 let records=new Map(recordsFor(count).map(r=>[r.id,r])),permissions={read:true,write:true};
 const operations=new Map(),queue={list:[],detail:[],read:[],save:[],status:[]},calls=[];
 const check=mode=>{if(!permissions[mode])throw new FixtureError('PERMISSION','Synthetic permission denied.');};
 const lookup=id=>{const value=records.get(id);if(!value)throw new FixtureError('MISSING','Product no longer exists.');return value;};
 const read=async(kind,id,signal)=>{
  calls.push({kind,id:id??null});const handler=queue[kind].shift();
  if(handler){const result=await handler({id,signal,records:[...records.values()].map(project)});check('read');if(signal?.aborted)throw new DOMException('Request cancelled.','AbortError');return result;}
  await wait(delay);if(signal?.aborted)throw new DOMException('Request cancelled.','AbortError');check('read');
  if(kind==='list')return [...records.values()].map(summary);
  const item=project(lookup(id));
  if(kind==='detail')return {...item,specs:Object.entries(item.specs).map(([k,v])=>k+': '+v).join(' · ')};
  return item;
 };
 function save(request){
  calls.push({kind:'save',id:request.id,operationId:request.operationId});
  if(typeof request.operationId!=='string'||!request.operationId) return Promise.reject(new FixtureError('INVALID','Operation identity required.'));
  const signature=fingerprint({id:request.id,revision:request.expectedRevision,patch:request.patch});
  const prior=operations.get(request.operationId);
  if(prior){if(prior.signature!==signature)return Promise.reject(new FixtureError('INVALID','Operation ID cannot be reused for different changes.'));return prior.promise;}
  const operation={signature,status:'pending',result:null};operations.set(request.operationId,operation);
  const plan=queue.save.shift();
  operation.promise=(async()=>{
   try{
    if(typeof plan==='function')await plan({request:clone(request)});
    else await wait(delay);
    if(request.signal?.aborted)throw new FixtureError('CANCELLED','Save was cancelled before commit.');
    check('write');
    if(plan==='permission')throw new FixtureError('PERMISSION','Synthetic permission denied.');
    if(plan==='validation')throw new FixtureError('VALIDATION','Fixture authority rejected the proposed content.');
    if(plan==='disconnect-before')throw new FixtureError('CONNECTION','Connection interrupted before commit.');
    if(plan==='timeout-before')throw new FixtureError('TIMEOUT','Save outcome is unknown. Check before retrying.','unknown');
    const current=lookup(request.id);
    if(current.revision!==request.expectedRevision)throw new FixtureError('CONFLICT','Another fixture actor changed this product.','not-applied',project(current));
    let values;try{values=validatePatch(request.patch,current,[...records.values()]);}catch(error){throw new FixtureError('VALIDATION',error.message);}
    const next=applyValues(current,values);next.revision='sim-'+(Number(current.revision.slice(4))+1);
    // One synchronous authority replacement: no partially updated product is visible.
    records.set(request.id,next);
    const result={operationId:request.operationId,applied:true,record:project(next)};
    operation.status='committed';operation.result=clone(result);
    if(plan==='disconnect-after')throw new FixtureError('CONNECTION','Connection lost after submission. Check the outcome.','unknown');
    if(plan==='unexpected-after')return {unexpected:true};
    return result;
   }catch(error){
    if(operation.status!=='committed'){operation.status='not-applied';operation.result={code:error.code??'INVALID',message:error.message};}
    throw error;
   }
  })();
  return operation.promise;
 }
 const persistence={kind:'command02-synthetic',read:(id,{signal}={})=>read('read',id,signal),save,
  async status(operationId){calls.push({kind:'status',operationId});await wait(delay);check('read');const custom=queue.status.shift();if(custom)return custom();const op=operations.get(operationId);return op?{status:op.status,...op.status==='committed'?{result:clone(op.result)}:{}}:{status:'unknown'};}
 };
 const catalogueTransport={kind:'command01-synthetic',list:({signal}={})=>read('list',null,signal),detail:(id,{signal}={})=>read('detail',id,signal)};
 return{persistence,catalogueTransport,calls,
  enqueue:(kind,handler)=>{if(!queue[kind])throw Error('Unknown fixture operation.');queue[kind].push(handler);},
  actorModify(id,patch){const old=lookup(id),values=validatePatch(patch,old,[...records.values()]);const next=applyValues(old,values);next.revision='sim-'+(Number(old.revision.slice(4))+1);records.set(id,next);return project(next);},
  inspect:id=>clone(lookup(id)),setPermissions:next=>{permissions={...permissions,...next};},
  replaceCatalogue(nextCount){records=new Map(recordsFor(nextCount).map(r=>[r.id,r]));},
  removeFixture:id=>records.delete(id)
 };
}
