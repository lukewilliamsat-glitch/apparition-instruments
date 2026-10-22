import {BridgeError,fail,idOf,sessionGrant,rowsOf,mapRecord,inspectorRecord,editorRecord,summaryColumns,detailColumns,inventoryColumns,normaliseError} from './contracts.mjs';
import {validatePatch,fingerprint} from '../command02/schema.mjs';
const clone=v=>structuredClone(v),blocked=()=>fail('UNSUPPORTED','Production-safe versioned writes are unavailable. No request was submitted.');
// Inert by default. A real transport is deliberately not accepted by this candidate.
export function createBridge({identity,transport,mode='read-only',now=Date.now,timeoutMs=8000}={}){
 if(identity?.kind!=='command03-fixture-identity'||typeof identity.snapshot!=='function'||typeof identity.subscribe!=='function'||transport?.kind!=='command03-fixture-wire'||['authorize','send'].some(k=>typeof transport[k]!=='function'))throw Error('An explicit isolated identity and fixture transport are required.');
 if(!['read-only','fixture-versioned'].includes(mode)||!Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>60000)throw Error('Invalid bridge configuration.');
 if(mode==='fixture-versioned'&&['save','status'].some(k=>typeof transport[k]!=='function'))throw Error('Explicit synthetic version/status capabilities required.');
 let alive=true,epoch=0,authorization=null,authPending=null,pendingList=null;
 const listeners=new Set(),controllers=new Set(),cache=new Map(),operations=new Map();
 const state={status:'signed-out',subject:null,catalogueGeneration:null,capabilities:{catalogueRead:false,productRead:false,productWrite:false}};
 const snapshot=()=>clone({...state,epoch,mode,productionWritesSupported:false,versionGuarantee:mode==='fixture-versioned'?'synthetic-cas-only':'none'});
 function emit(){for(const fn of listeners)fn(snapshot());}
 function clear(status='checking'){epoch++;authorization=null;authPending=null;pendingList=null;cache.clear();for(const c of controllers)c.abort();controllers.clear();Object.assign(state,{status,subject:null,catalogueGeneration:null,capabilities:{catalogueRead:false,productRead:false,productWrite:false}});emit();}
 const unsubscribe=identity.subscribe(s=>clear(s.status==='present'?'checking':s.status));
 function current(){
  if(!alive)fail('TEARDOWN','The bridge is closed.');
  const s=identity.snapshot();if(!s.session){clear('signed-out');fail('NO_SESSION','Start a synthetic authorised session before reading catalogue data.');}
  if(s.session.expiresAt<=now()){clear('expired');fail('EXPIRED','The synthetic session expired. Local drafts are retained.');}return s;
 }
 function check(ctx){const s=current();if(ctx.epoch!==epoch||ctx.identityGeneration!==s.generation||ctx.session.token!==s.session.token)fail('SESSION_CHANGED','The session changed; the old response was rejected.');}
 async function bounded(run,{signal,write=false}={}){
  const controller=new AbortController();controllers.add(controller);let timer,abort;
  const cancellation=new Promise((_,reject)=>{controller.signal.addEventListener('abort',()=>reject(new BridgeError('CANCELLED','Request cancelled.',{outcome:write?'unknown':'not-applied'})),{once:true});abort=()=>controller.abort();if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});});
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{reject(new BridgeError('TIMEOUT',write?'Submission timed out. Check its outcome before retrying.':'Read timed out. Retry safely.',{outcome:write?'unknown':'not-applied'}));controller.abort();},timeoutMs);});
  try{return await Promise.race([Promise.resolve().then(()=>{if(controller.signal.aborted)fail('CANCELLED','Request cancelled.');return run(controller.signal);}),cancellation,deadline]);}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controllers.delete(controller);}
 }
 function securityFailure(error){if(['PERMISSION','EXPIRED','REVOKED','NO_SESSION'].includes(error.code)){cache.clear();authorization=null;Object.assign(state,{status:error.code.toLowerCase(),subject:null,catalogueGeneration:null,capabilities:{catalogueRead:false,productRead:false,productWrite:false}});emit();}}
 async function authorize(){
  const s=current(),ctx={epoch,identityGeneration:s.generation,session:s.session};
  if(authPending?.epoch===epoch)return authPending.promise;
  const promise=(async()=>{try{
   const raw=await bounded(signal=>transport.authorize(ctx.session,{signal}));check(ctx);
   const grant=sessionGrant(raw,ctx.session,now());authorization=grant;
   Object.assign(state,{status:'authorized',subject:grant.subject,capabilities:{...grant.capabilities}});emit();return {...ctx,grant};
  }catch(error){const e=normaliseError(error);securityFailure(e);throw e;}finally{if(authPending?.promise===promise)authPending=null;}})();
  authPending={epoch,promise};return promise;
 }
 async function permitted(capability){const ctx=await authorize();if(!ctx.grant.capabilities[capability])throw new BridgeError('PERMISSION','The authority did not grant '+capability+'.');return ctx;}
 async function table(ctx,resource,query,{signal}={}){
  for(let attempt=0;attempt<2;attempt++)try{
   check(ctx);if(signal?.aborted)fail('CANCELLED','Request cancelled.');
   const response=await bounded(s=>transport.send(resource,{method:'GET',query,session:ctx.session,signal:s}),{signal});check(ctx);
   if(!response||typeof response.ok!=='boolean'||!Number.isInteger(response.status)||typeof response.json!=='function')fail('MALFORMED','Invalid transport response.');
   if(!response.ok){if(response.status===401)fail('EXPIRED','The authority rejected this session.');if(response.status===403)fail('PERMISSION','The authority denied this read.');throw new BridgeError('HTTP','Catalogue read unavailable.',{retryable:[502,503,504].includes(response.status)});}
   const rows=rowsOf(await bounded(()=>response.json(),{signal}));check(ctx);
   return {rows,versions:response.fixtureVersions};
  }catch(error){const e=normaliseError(error);securityFailure(e);if(attempt===0&&e.retryable){check(ctx);continue;}throw e;}
 }
 function revision(row,stock,versions){
  if(mode==='fixture-versioned'){const value=versions?.[row.id];if(typeof value!=='string'||!/^sim-[1-9]\d*$/.test(value))fail('MALFORMED','Missing synthetic revision evidence.');return value;}
  // A display/cache identity only; explicitly NOT compare-and-set or a DB revision.
  const common=summaryColumns.split(',').filter(k=>!k.includes(':')).map(k=>row[k]);
  let h=2166136261;for(const ch of JSON.stringify([common,stock.component_id,stock.quantity,stock.stock_unit]))h=Math.imul(h^ch.charCodeAt(0),16777619);return 'read-'+(h>>>0).toString(16);
 }
 async function list(){
  const ctx=await permitted('catalogueRead');check(ctx);if(pendingList?.epoch===epoch){const value=await pendingList.promise;check(ctx);return clone(value);}
  const promise=(async()=>{
   const result=[],seen=new Set();
   for(let offset=0;offset<=500;offset+=100){
    const {rows,versions}=await table(ctx,'components','?select='+summaryColumns+'&order=id.asc&limit=100&offset='+offset);
    if(offset===500&&rows.length)fail('LIMIT','Catalogue exceeds the candidate 500-product bound; no partial list was accepted.');
    if(!rows.length)break;
    const ids=rows.map(r=>idOf(r.id));if(new Set(ids).size!==ids.length||ids.some(id=>seen.has(id)))fail('MALFORMED','Duplicate or unstable catalogue page.');
    const stocks=await table(ctx,'inventory','?select='+inventoryColumns+'&component_id=in.('+ids.join(',')+')&order=component_id.asc&limit=100');
    const index=new Map(stocks.rows.map(r=>[r.component_id,r]));if(index.size!==stocks.rows.length||index.size!==ids.length||[...index.keys()].some(id=>!ids.includes(id)))fail('MALFORMED','Inventory does not match its component page.');
    for(const row of rows){seen.add(row.id);const stock=index.get(row.id);result.push(mapRecord(row,stock,revision(row,stock,versions)));}
    if(rows.length<100)break;
   }
   check(ctx);state.catalogueGeneration=ctx.identityGeneration;emit();return result;
  })();pendingList={epoch,promise};try{const value=await promise;check(ctx);return clone(value);}finally{if(pendingList?.promise===promise)pendingList=null;}
 }
 async function product(id,{signal,force=false,context}={}){
  idOf(id);const ctx=context??await permitted('productRead');check(ctx);
  if(!ctx.grant.capabilities.productRead)fail('PERMISSION','Product detail permission required.');
  const previous=cache.get(id);if(previous&&previous.epoch===epoch&&(!force&&now()-previous.at<15000||previous.pending)){const value=await previous.promise;check(ctx);if(signal?.aborted)fail('CANCELLED','Request cancelled.');return clone(value);}
  const item={epoch,at:now(),pending:true};
  item.promise=(async()=>{
   const {rows,versions}=await table(ctx,'components','?select='+detailColumns+'&id=eq.'+encodeURIComponent(id)+'&order=id.asc&limit=1',{signal});
   if(rows.length!==1)fail(rows.length?'MALFORMED':'MISSING',rows.length?'Duplicate product identity.':'The product is unavailable or no longer readable.');
   if(rows[0].id!==id)fail('IDENTITY','The authority returned a different product.');
   const inventory=await table(ctx,'inventory','?select='+inventoryColumns+'&component_id=eq.'+encodeURIComponent(id)+'&order=component_id.asc&limit=1',{signal});
   if(inventory.rows.length!==1)fail('MALFORMED','Missing authoritative inventory.');
   check(ctx);const record=mapRecord(rows[0],inventory.rows[0],revision(rows[0],inventory.rows[0],versions),true);
   return mode==='fixture-versioned'?editorRecord(record,id):record;
  })();cache.set(id,item);
  try{return clone(await item.promise);}catch(error){if(cache.get(id)===item)cache.delete(id);throw error;}finally{item.pending=false;}
 }
 function createEditorPort(){
  let owner=null,selected=null,generation=0;const last=new Map();
  async function context(){const ctx=await permitted('productRead');if(owner&&owner!==ctx.grant.subject)fail('PERMISSION','Restore the original synthetic identity before accessing its retained draft.');return ctx;}
  return Object.freeze({kind:'command02-synthetic',
   async read(id,options={}){if(mode!=='fixture-versioned')blocked();const token=++generation,ctx=await context();check(ctx);const force=owner!==null&&selected===id;owner??=ctx.grant.subject;selected=id;
    const result=await product(id,{...options,force,context:ctx});if(token!==generation)fail('STALE','A newer editor detail request superseded this response.');last.set(id,result);return result;},
   async save(command){
    if(mode!=='fixture-versioned')blocked();idOf(command.id);const ctx=await permitted('productWrite');check(ctx);
    if(owner!==ctx.grant.subject||selected!==command.id||!ctx.grant.capabilities.productRead)fail('PERMISSION','The reviewed editor identity does not match this operation.');
    const baseline=last.get(command.id);if(!baseline||command.expectedRevision!==baseline.revision)fail('IDENTITY','Read the matching current editor revision before saving.');
    try{validatePatch(command.patch,baseline,[baseline]);}catch{fail('VALIDATION','Unsupported or invalid product changes.');}
    if(typeof command.operationId!=='string'||!/^command02-op-\d+$/.test(command.operationId))fail('VALIDATION','Invalid operation identity.');
    const signature=fingerprint(command),prior=operations.get(command.operationId);
    if(prior&&(prior.owner!==owner||prior.signature!==signature))fail('PERMISSION','Operation identity does not match its original command.');
    operations.set(command.operationId,{owner,id:command.id,signature});
    try{
     const result=await bounded(()=>transport.save(clone(command),{session:ctx.session}),{write:true});check(ctx);
     if(!result||result.applied!==true||result.operationId!==command.operationId)fail('MALFORMED','Save confirmation is invalid.',{outcome:'unknown'});
     const record=editorRecord(result.record,command.id);cache.clear();last.set(command.id,record);return {...result,record};
    }catch(error){
     if(ctx.epoch!==epoch||identity.snapshot().generation!==ctx.identityGeneration)throw new BridgeError('SESSION_CHANGED','The session changed during submission. Reconcile its outcome with the original identity.',{outcome:'unknown'});
     const e=normaliseError(error,{write:true});securityFailure(e);throw e;
    }
   },
   async status(operationId){if(mode!=='fixture-versioned')blocked();const ctx=await context(),op=operations.get(operationId);if(!op||op.owner!==ctx.grant.subject)fail('PERMISSION','This operation does not belong to the current identity.');
    const value=await bounded(()=>transport.status(operationId,{session:ctx.session}));check(ctx);
    if(!value||!['committed','not-applied','pending','unknown'].includes(value.status))fail('MALFORMED','Invalid operation status.');
    if(value.status==='committed'){const result=value.result;if(result?.operationId!==operationId||result.applied!==true)fail('MALFORMED','Invalid committed operation confirmation.');editorRecord(result.record,op.id);cache.clear();last.set(op.id,result.record);}return clone(value);},
   release(){owner=null;selected=null;last.clear();generation++;},owner:()=>owner
  });
 }
 return Object.freeze({authorize,snapshot,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  catalogueTransport:Object.freeze({kind:'command01-synthetic',list,detail:async(id,options)=>inspectorRecord(await product(id,options))}),
  readProduct:product,createEditorPort,
  mutations:Object.freeze({productionSupported:false,versionGuarantee:'none',save:blocked,changeStock:blocked,writeImage:blocked}),
  imageMetadata:async id=>{idOf(id);await permitted('productRead');return Object.freeze({kind:'unloaded',reason:'No verified least-data image metadata projection; original image is never requested.'});},
  destroy(){alive=false;unsubscribe();clear('closed');listeners.clear();}
 });
}
