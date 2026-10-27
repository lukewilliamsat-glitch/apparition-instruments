import {createAdminAuth} from '../admin-auth.mjs?build=84079ed8ddb6abc6ed134bc4bc3a163da155cde4';
import {createAuthenticatedRepositoryTransport} from '../../backend/providers.mjs?v=p10g&build=b4d7e3708e1cd0153e922122fa2400f0c46d9ce7';
import {boundedJSON} from '../command/bounded-json.mjs?build=84079ed8ddb6abc6ed134bc4bc3a163da155cde4';
import {calculateEconomicsV2,FINANCE_POLICY_V2} from './economics-v2.mjs?build=84079ed8ddb6abc6ed134bc4bc3a163da155cde4';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const fail=(message,code='CONTRACT')=>Object.assign(Error(message),{code});
// PostgreSQL jsonb may reorder object keys. Array order, types and values remain significant.
const canonicalDocument=value=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
function documentCheck(value){if(!value||value.policyVersion!==FINANCE_POLICY_V2||new TextEncoder().encode(JSON.stringify(value)).length>32768)throw fail('Unsupported financial document or size.');calculateEconomicsV2(value);return value;}
function recordCheck(value,id){if(value?.version!==1||value.orderId!==id||!hash(value.orderBasisHash)||!Number.isSafeInteger(value.revision)||value.revision<0||value.revision>1000000000||value.revision===0&&value.document!==null||value.revision>0&&!value.document)throw fail('Financial record identity or revision is invalid.');if(value.document)documentCheck(value.document);return value;}
export function createFinancialRepository({auth,request=globalThis.fetch,config}={}){
 const controllers=new Set();let disposed=false;
 async function rpc(name,body,maxBytes){
  if(disposed)throw fail('Financial session ended.','EXPIRED');
  const controller=new AbortController();controllers.add(controller);const signal=controller.signal,timer=setTimeout(()=>controller.abort(),8000);let bytes=0,dispatched=false;
  const boundedRequest=(url,options)=>request(url,{...options,signal,cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'});
  try{
   const currentAuth=auth||createAdminAuth({...config?{config}:{},request:boundedRequest});
   const transport=createAuthenticatedRepositoryTransport({accessToken:()=>currentAuth.accessToken({signal,bounded:true,onBytes:n=>{bytes+=n;}})},{...config?{config}:{},request:async(url,options)=>{dispatched=true;return boundedRequest(url,options);}});
   const response=await transport.send('rpc/command63_financial_'+name,{method:'POST',body});
   if(!response.ok&&[400,401,403,404,409,422].includes(response.status)){await response.body?.cancel?.().catch(()=>{});throw Object.assign(fail(response.status===400||response.status===409||response.status===422?'The database rejected these financial inputs. Nothing was saved. Review the fields.':response.status===404?'Financial persistence is not available in this environment.':response.status===401?'Sign in again to access financial records.':'Current Admin permission is required.',response.status===401?'EXPIRED':response.status===403?'DENIED':response.status===404?'UNAVAILABLE':'REJECTED'),{notApplied:true});}
   const result=await boundedJSON(response,maxBytes,{signal,onBytes:n=>{bytes+=n;}});
   if(disposed||signal.aborted)throw fail('Financial session changed.','EXPIRED');
   return {result,bytes,requests:1};
  }catch(error){throw Object.assign(fail(error.code==='EXPIRED'?'Sign in again to access financial records.':error.code==='DENIED'?'Current Admin permission is required.':error.notApplied?error.message:'Financial request unavailable. No automatic retry was made.',error.code||'NETWORK'),{uncertain:name==='save'&&dispatched&&!error.notApplied&&!['EXPIRED','DENIED'].includes(error.code),bytes});}
  finally{clearTimeout(timer);controllers.delete(controller);}
 }
 return Object.freeze({
  async read(orderId){if(!uuid(orderId))throw fail('Existing order identity required.');const r=await rpc('read',{p_order_id:orderId},65536);return {...r,record:recordCheck(r.result,orderId)};},
  async save({orderId,revision,orderBasisHash,requestId,document}){
   if(!uuid(orderId)||!uuid(requestId)||!Number.isSafeInteger(revision)||revision<0||!hash(orderBasisHash))throw fail('Financial mutation identity is invalid.');documentCheck(document);
   const r=await rpc('save',{p_order_id:orderId,p_expected_revision:revision,p_order_basis_hash:orderBasisHash,p_request_id:requestId,p_document:document},65536),v=r.result;
   if(v?.version!==1||v.orderId!==orderId||v.requestId!==requestId||!['committed','conflict','order-conflict'].includes(v.outcome)||!Number.isSafeInteger(v.revision)||!hash(v.orderBasisHash))throw Object.assign(fail('Financial save returned an unsupported receipt.'),{uncertain:true});if(v.outcome==='committed')documentCheck(v.document);return {...r,receipt:v};
  },
  async status(requestId){if(!uuid(requestId))throw fail('Financial receipt identity required.');const r=await rpc('status',{p_request_id:requestId},65536),v=r.result;if(v?.version!==1||v.requestId!==requestId||!['committed','conflict','order-conflict','unresolved'].includes(v.outcome))throw fail('Unsupported financial receipt.');if(v.outcome!=='unresolved'){if(!uuid(v.orderId)||!Number.isSafeInteger(v.revision)||!hash(v.orderBasisHash))throw fail('Invalid financial receipt identity.');if(v.outcome==='committed')documentCheck(v.document);}return {...r,receipt:v};},
  async batch(orderIds){if(!Array.isArray(orderIds)||orderIds.length>50||new Set(orderIds).size!==orderIds.length||!orderIds.every(uuid))throw fail('Use at most 50 distinct loaded order identities.');const r=await rpc('batch',{p_order_ids:orderIds},196608+16384),v=r.result;if(v?.version!==1||!Array.isArray(v.records)||v.records.length>orderIds.length||v.requested!==orderIds.length||v.returned!==v.records.length||typeof v.complete!=='boolean'||v.truncated!==!v.complete||new Set(v.records.map(x=>x.orderId)).size!==v.records.length)throw fail('Unsupported financial reporting projection.');for(const x of v.records){if(!orderIds.includes(x.orderId)||!Number.isSafeInteger(x.revision)||typeof x.orderBasisMatches!=='boolean')throw fail('Unexpected financial reporting identity.');documentCheck(x.document);}return {...r,records:v.records,complete:v.complete};},
  dispose(){disposed=true;for(const c of controllers)c.abort();controllers.clear();}
 });
}

// State controller has no stock, order, payment, email or catalogue mutation path.
export function createFinancialSession({orderId,initialDraft,repository,onChange=()=>{}}){
 let ended=false,generation=0,record=null,draft=structuredClone(initialDraft),status='idle',message='',pending=null,checks=0,bytes=0;
 const baseline=()=>canonicalDocument(record?.document||initialDraft),dirty=()=>canonicalDocument(draft)!==baseline();
 const snapshot=()=>({status,message,dirty:dirty(),record,draft:structuredClone(draft),pendingRequestId:pending?.requestId||null,bytes,canReconcile:status==='uncertain'&&checks<3,canSave:!!record&&record.orderBasisMatches!==false&&(dirty()||record.revision===0)&&!['loading','saving','uncertain','conflict','expired','denied','ended','unavailable'].includes(status)});
 const emit=()=>{if(!ended)onChange(snapshot());};
 const accept=v=>{if(v.orderId!==orderId)throw fail('Receipt belongs to another order.');if(v.outcome==='committed'){if(pending&&canonicalDocument(v.document)!==canonicalDocument(pending.document))throw Object.assign(fail('Save receipt does not match the submitted financial inputs.'),{uncertain:true});record={...record,revision:v.revision,orderBasisHash:v.orderBasisHash,document:structuredClone(v.document),orderBasisMatches:true,updatedAt:v.updatedAt,history:[{revision:v.revision,actor_id:v.updatedBy,recorded_at:v.updatedAt},...(record?.history||[]).filter(x=>x.revision!==v.revision)].slice(0,10)};draft=structuredClone(v.document);pending=null;status='committed';message='Financial record saved. Order, stock, payments and communications unchanged.';}else{status='conflict';message=v.outcome==='order-conflict'?'Original order financial values changed. Review the order and reload the saved record before saving.':'Another financial revision was saved. Your local inputs are retained; reload only when ready to discard them.';pending=null;}};
 return Object.freeze({
  snapshot,
  edit(value){if(ended||['loading','saving','uncertain','ended'].includes(status))return false;draft=structuredClone(value);if(['ready','dirty','committed'].includes(status)){if(dirty()){status='dirty';message='Unsaved financial changes. Choose Save financial record to persist them.';}else if(status!=='committed'){status='ready';message=record?.document?'Saved financial record loaded.':'No financial record saved. Unknown costs remain unknown.';}}emit();return true;},
  async load({discard=false}={}){if(ended||['loading','saving','uncertain'].includes(status)||dirty()&&!discard)return false;const epoch=++generation;status='loading';message='Loading the saved financial record…';emit();try{const r=await repository.read(orderId);if(ended||epoch!==generation)return false;bytes+=r.bytes;record=r.record;draft=structuredClone(record.document||initialDraft);pending=null;status=record.orderBasisMatches===false?'conflict':'ready';message=record.orderBasisMatches===false?'The original order financial values changed after this snapshot. Review its saved values before continuing.':record.document?'Saved financial record loaded.':'No financial record saved. Unknown costs remain unknown.';}catch(e){if(ended||epoch!==generation)return false;status=e.code==='EXPIRED'?'expired':e.code==='DENIED'?'denied':'unavailable';message=e.message;}emit();return true;},
  async save(){if(!snapshot().canSave)return false;try{documentCheck(draft);}catch(e){message=e.message;emit();return false;}const epoch=++generation;pending={orderId,revision:record.revision,orderBasisHash:record.orderBasisHash,requestId:crypto.randomUUID(),document:structuredClone(draft)};checks=0;status='saving';message='Saving financial revision…';emit();try{const r=await repository.save(pending);if(ended||epoch!==generation)return false;bytes+=r.bytes;accept(r.receipt);}catch(e){if(ended||epoch!==generation)return false;status=e.uncertain?'uncertain':e.code==='EXPIRED'?'expired':e.code==='DENIED'?'denied':'dirty';message=e.uncertain?'Save outcome is uncertain. Inputs are retained. Check this exact receipt before another save.':e.message;if(!e.uncertain)pending=null;}emit();return true;},
  async reconcile(){if(ended||status!=='uncertain'||!pending||checks>=3)return false;checks++;const epoch=generation;message='Checking the original save receipt…';emit();try{const r=await repository.status(pending.requestId);if(ended||epoch!==generation)return false;bytes+=r.bytes;if(r.receipt.outcome==='unresolved')message='The outcome is still unresolved. No success or failure has been assumed. Another save remains blocked.';else accept(r.receipt);}catch(e){if(ended||epoch!==generation)return false;message='Receipt unavailable. The save remains unresolved and has not been repeated.';}emit();return true;},
  dispose(){ended=true;generation++;repository.dispose();record=null;draft=null;pending=null;status='ended';}
 });
}
