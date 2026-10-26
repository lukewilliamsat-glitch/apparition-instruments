import {fields,editable,validateDraft,changes,patchFor,fingerprint,readRecord} from './schema.mjs?build=df78c5bf5144b012a7d96c628186180fa6432df3';
let sequence=0;
export function createEditorSession({persistence,onChange=()=>{},timeoutMs=8000}={}){
 if(!['command02-synthetic','command02-read-preview'].includes(persistence?.kind)||['read','save','status'].some(m=>typeof persistence[m]!=='function'))throw Error('Explicit preview or synthetic persistence is required. Live writes are disabled.');
 if(!Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>60000)throw Error('Invalid operation deadline.');
 const bounded=(operation,label)=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Object.assign(Error(label+' timed out. Verify the outcome before retrying a save.'),{outcome:'unknown'})),timeoutMs);
  Promise.resolve(operation).then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});
 });
 let alive=true,epoch=0,readAbort,pendingSave=null;
 const state={phase:'closed',id:null,baseline:null,draft:null,server:null,error:'',notice:'',conflict:false,operation:null,review:null};
 const snapshot=()=>{
  const validation=state.draft?validateDraft(state.draft):{valid:false,errors:{},values:{}};
  const diff=state.baseline?changes(state.baseline,state.draft):[];
  return {...structuredClone(state),validation,changes:diff,dirty:diff.length>0,
   canReview:Boolean(diff.length&&validation.valid&&!state.conflict&&!['loading','saving','reviewing','unknown','checking','reloading'].includes(state.phase)),
   needsProtection:Boolean(diff.length||['saving','unknown','checking'].includes(state.phase))};
 };
 const emit=()=>{if(alive)onChange(snapshot());};
 const fresh=()=>{readAbort?.abort();readAbort=new AbortController();return ++epoch;};
 function set(key,value){if(!alive||!state.draft)return;if(!Object.hasOwn(fields,key))throw Error('Unsupported editor field.');state.draft[key]=value;state.review=null;if(!['unknown','checking','conflict','saving'].includes(state.phase))state.error='';state.notice='';if(['saved','error','review'].includes(state.phase))state.phase='editing';emit();}
 async function open(id){
  if(!alive)return;const token=fresh();pendingSave=null;Object.assign(state,{phase:'loading',id,baseline:null,draft:null,server:null,error:'',notice:'',conflict:false,operation:null,review:null});emit();
  try{const result=readRecord(await bounded(persistence.read(id,{signal:readAbort.signal}),'Product read'),id);if(!alive||token!==epoch)return;Object.assign(state,{phase:'editing',baseline:result,server:result,draft:editable(result)});}
  catch(error){if(!alive||token!==epoch)return;state.phase='load-error';state.error=error.message;}
  emit();
 }
 async function reload(){
  if(!alive||!state.id||['saving','unknown','checking'].includes(state.phase))return false;
  const token=fresh(),id=state.id;state.phase='reloading';state.error='';emit();
  try{const result=readRecord(await bounded(persistence.read(id,{signal:readAbort.signal}),'Product reload'),id);if(!alive||token!==epoch)return false;Object.assign(state,{phase:'editing',baseline:result,server:result,draft:editable(result),conflict:false,review:null,notice:'Draft discarded. Latest read values loaded.'});emit();return true;}
  catch(error){if(alive&&token===epoch){state.phase=state.baseline?'error':'load-error';state.error='Reload failed. Your local values were preserved. '+error.message;emit();}return false;}
 }
 async function review(){
  if(!snapshot().canReview)return false;
  const token=epoch,id=state.id;state.phase='reviewing';state.error='';emit();
  try{
   const current=readRecord(await bounded(persistence.read(id),'Revision review'),id);
   if(!alive||token!==epoch)return false;
   state.server=current;
   if(current.revision!==state.baseline.revision){state.conflict=true;state.phase='conflict';state.error='A newer read identity is available. Review the differences and reload before saving.';emit();return false;}
   const now=snapshot();if(!now.validation.valid||!now.dirty){state.phase='editing';emit();return false;}
   state.review=fingerprint(patchFor(state.baseline,state.draft));state.phase='review';emit();return true;
  }catch(error){if(alive&&token===epoch){state.phase='error';state.error=error.message;emit();}return false;}
 }
 function accept(result,request){
  if(!result||result.applied!==true||result.operationId!==request.operationId)throw Error('Unexpected save response.');
  const record=readRecord(result.record,request.id);
  if(record.revision!=='sim-'+(Number(request.expectedRevision.slice(4))+1))throw Error('Save response did not advance the expected fixture revision.');
  const actual=validateDraft(editable(record)).values;
  for(const [key,value]of Object.entries(request.patch))if(actual[key]!==value)throw Error('Save response does not match the reviewed changes.');
  const latest={...state.draft},submitted=request.submittedDraft;
  const draft=editable(record);
  for(const key of Object.keys(fields))if(latest[key]!==submitted[key])draft[key]=latest[key];
  Object.assign(state,{baseline:record,server:record,draft,phase:'saved',conflict:false,operation:null,review:null,error:''});
  state.notice=changes(record,draft).length?'Submitted changes saved. Newer edits remain unsaved.':'Changes saved to the synthetic fixture.';
 }
 function save(){
  if(persistence.kind!=='command02-synthetic'){state.error='Production writes are disabled. Your proposal is unsaved.';emit();return Promise.resolve(false);}
  if(pendingSave)return pendingSave;
  const current=snapshot();
  if(!alive||!state.review||!current.validation.valid||state.conflict||state.phase!=='review'||state.review!==fingerprint(patchFor(state.baseline,state.draft)))return Promise.resolve(false);
  const token=epoch,request={id:state.id,expectedRevision:state.baseline.revision,patch:patchFor(state.baseline,state.draft),operationId:'command02-op-'+(++sequence),submittedDraft:{...state.draft}};
  state.operation=request;state.phase='saving';state.error='';state.notice='';emit();
  const task=(async()=>{
   try{
    const result=await bounded(persistence.save({id:request.id,expectedRevision:request.expectedRevision,patch:request.patch,operationId:request.operationId}),'Product save');
    if(!alive||token!==epoch)return false;
    try{accept(result,request);}catch(error){state.phase='unknown';state.error=error.message+' Check the outcome before retrying.';}
   }catch(error){
    if(!alive||token!==epoch)return false;
    if(error.code==='CONFLICT'){
     state.conflict=true;state.phase='conflict';state.error=error.message;state.review=null;state.operation=null;
     try{state.server=readRecord(error.current,request.id);}catch{state.server=null;}
    }else if(error.outcome==='not-applied'){
     state.phase='error';state.error=error.message+' No fixture changes were applied.';state.operation=null;state.review=null;
    }else{state.phase='unknown';state.error='Save outcome is uncertain. Check the outcome before retrying.';}
   }finally{if(alive&&token===epoch){pendingSave=null;emit();}}
   return state.phase==='saved';
  })();pendingSave=task;return task;
 }
 async function checkOutcome(){
  if(persistence.kind!=='command02-synthetic')return;
  if(!alive||state.phase!=='unknown'||!state.operation)return;
  const token=epoch,request=state.operation;state.phase='checking';state.error='';emit();
  try{
   const outcome=await bounded(persistence.status(request.operationId),'Outcome check');if(!alive||token!==epoch)return;
   if(outcome.status==='committed'){try{accept(outcome.result,request);}catch(error){state.phase='unknown';state.error=error.message;}}
   else if(outcome.status==='not-applied'){state.phase='error';state.operation=null;state.review=null;state.error='Outcome confirmed: no changes applied. It is safe to review and retry.';}
   else{state.phase='unknown';state.error='The authority cannot yet confirm the outcome. Retry remains blocked.';}
  }catch(error){if(alive&&token===epoch){state.phase='unknown';state.error='Outcome check failed. Retry remains blocked. '+error.message;}}
  emit();
 }
 function close(){if(!alive)return;fresh();Object.assign(state,{phase:'closed',id:null,baseline:null,draft:null,server:null,review:null,error:'',notice:'',conflict:false,operation:null});pendingSave=null;emit();}
 function destroy(){alive=false;fresh();pendingSave=null;}
 emit();return{snapshot,set,open,reload,review,save,checkOutcome,close,destroy};
}
