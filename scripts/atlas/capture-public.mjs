// Deliberate public STATIC retrieval only. This module is never imported by release staging.
import https from 'node:https';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {record,fail,portablePath,pathsUnique,isHash,loadJSON,sha256,stable,readRegular,safeRoot,inventory} from './core.mjs';
export const PUBLIC_ORIGIN='https://apparitioninstruments.co.uk';
export function capturePlan(p){
 record(p,['schemaVersion','kind','origin','requests','limits'],'capture plan');
 if(p.schemaVersion!==1||p.kind!=='atlas-public-static-capture'||p.origin!==PUBLIC_ORIGIN)fail('CAPTURE_ORIGIN','Only the explicit Apparition HTTPS origin is supported');
 record(p.limits,['maxRequests','maxResponseBytes','maxTotalBytes','timeoutMs'],'capture limits');
 for(const [k,max] of [['maxRequests',64],['maxResponseBytes',8*1024*1024],['maxTotalBytes',32*1024*1024],['timeoutMs',15000]])if(!Number.isSafeInteger(p.limits[k])||p.limits[k]<1||p.limits[k]>max)fail('CAPTURE_LIMIT','Invalid bounded '+k);
 if(!Array.isArray(p.requests)||!p.requests.length||p.requests.length>p.limits.maxRequests)fail('CAPTURE_LIMIT','Explicit nonempty request list exceeds budget');
 const mapped=[];
 for(const r of p.requests){
  record(r,['path','contentType','expectedSHA256'],'capture request');
  if(typeof r.path!=='string'||!r.path.startsWith('/')||r.path.startsWith('//')||/[?#%\\]/.test(r.path)||/^\/(?:api|rest|auth|functions|storage|realtime)(?:\/|$)/i.test(r.path))fail('CAPTURE_PATH','Unsafe or API path');
  const rel=r.path==='/'?'index.html':r.path.slice(1)+(r.path.endsWith('/')?'index.html':'');portablePath(rel);mapped.push(rel);
  if(!['text/html','text/css','text/javascript','application/javascript','application/json','application/xml','text/xml','text/plain','image/png','image/jpeg','image/webp','image/svg+xml','image/x-icon','font/woff2','font/woff'].includes(r.contentType))fail('CAPTURE_MIME','Unsupported explicit MIME');
  if(r.expectedSHA256!==undefined&&!isHash(r.expectedSHA256))fail('CAPTURE_HASH','Invalid expected digest');
 }
 pathsUnique(mapped,'capture output paths');return p;
}
function liveTransport(url,{timeoutMs}){
 return new Promise((resolve,reject)=>{
  const req=https.get(url,{agent:false,headers:{'Accept-Encoding':'identity','User-Agent':'Apparition-Atlas-Static-Recovery/22','Accept':'*/*'}},res=>{
   const finish=()=>{clearTimeout(timer);req.destroy();};
   resolve({status:res.statusCode,url,headers:res.headers,dispose:finish,read:limit=>new Promise((done,bad)=>{
    const chunks=[];let bytes=0,ended=false;
    res.on('data',b=>{bytes+=b.length;if(bytes>limit){ended=true;finish();bad(Object.assign(Error('Body exceeded declared byte budget'),{code:'CAPTURE_BYTES'}));}else chunks.push(b);});
    res.on('end',()=>{if(!ended){ended=true;clearTimeout(timer);done(Buffer.concat(chunks,bytes));}});
    res.on('error',e=>{if(!ended){ended=true;bad(e);}});res.on('aborted',()=>{if(!ended){ended=true;bad(Object.assign(Error('Aborted response'),{code:'CAPTURE_ABORTED'}));}});
   })});
  });
  const timer=setTimeout(()=>req.destroy(Object.assign(Error('Whole-request timeout'),{code:'CAPTURE_TIMEOUT'})),timeoutMs);
  req.on('error',e=>{clearTimeout(timer);reject(e);});
 });
}
const selectedHeaders=h=>Object.fromEntries(['content-type','content-length','content-encoding','etag','last-modified','cache-control','age','vary'].filter(k=>h[k]!==undefined).map(k=>[k,String(h[k])]));
function signature(bytes,type){
 if(type==='image/png')return bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
 if(type==='image/jpeg')return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(type==='image/webp')return bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
 if(type==='image/svg+xml')return /<svg(?:\s|>)/i.test(bytes.toString('utf8'));
 return true;
}
export async function capturePublic({plan,output,transport,allowLive=false,clock=()=>new Date().toISOString()}){
 capturePlan(plan);if(!transport&&!allowLive)fail('LIVE_CAPTURE_NOT_ENABLED','Live retrieval requires explicit --allow-live and a separately pinned plan');
 const fetch=transport||liveTransport;await safeRoot(path.dirname(path.resolve(output)));await fs.mkdir(output,{mode:0o700});await fs.mkdir(path.join(output,'records'));await fs.mkdir(path.join(output,'site'));
 const pin=sha256(stable(plan));await fs.writeFile(path.join(output,'plan.json'),stable(plan),{flag:'wx',mode:0o444});
 await fs.writeFile(path.join(output,'START.json'),stable({schemaVersion:1,planSHA256:pin,startedUTC:clock(),classification:'incomplete-partial-capture'}),{flag:'wx',mode:0o444});
 const records=[];let total=0,issued=0,previous='0'.repeat(64),failure=null;
 for(const [index,item] of plan.requests.entries()){
  const url=plan.origin+item.path,rel=item.path==='/'?'index.html':item.path.slice(1)+(item.path.endsWith('/')?'index.html':'');
  let response,entry={index,url,path:rel,UTC:clock(),requestIssued:false,previousRecordSHA256:previous};
  try{
   const remaining=plan.limits.maxTotalBytes-total;if(remaining<1)fail('CAPTURE_BYTES','Aggregate response-body budget exhausted');
   entry.requestIssued=true;issued++;response=await fetch(url,{timeoutMs:plan.limits.timeoutMs});
   if(response.status!==200||response.url!==url)fail('CAPTURE_STATUS','Unexpected status or redirect; batch stopped');
   const h=response.headers;entry.headers=selectedHeaders(h);
   if(h['content-encoding']&&h['content-encoding']!=='identity')fail('CAPTURE_ENCODING','Only identity-encoded original bytes accepted');
   const type=String(h['content-type']||'').split(';')[0].trim().toLowerCase();
   const equivalent=x=>x==='application/javascript'?'text/javascript':x==='text/xml'?'application/xml':x;
   if(equivalent(type)!==equivalent(item.contentType))fail('CAPTURE_MIME','Response MIME differs from explicit plan');
   // Require declared body length before reading; no unbounded/chunked downloads.
   const length=String(h['content-length']||'');if(!/^\d+$/.test(length)||!Number.isSafeInteger(Number(length)))fail('CAPTURE_LENGTH','Bounded content-length required');
   const limit=Math.min(plan.limits.maxResponseBytes,remaining);if(Number(length)>limit)fail('CAPTURE_BYTES','Declared response length exceeds budget');
   const bytes=Buffer.from(await response.read(limit));if(bytes.length!==Number(length)||bytes.length>limit)fail('CAPTURE_LENGTH','Actual response length mismatch');
   if(!signature(bytes,type))fail('CAPTURE_SIGNATURE','Image signature/MIME mismatch');
   const digest=sha256(bytes);if(item.expectedSHA256&&digest!==item.expectedSHA256)fail('CAPTURE_HASH','Observed bytes changed from independently expected fingerprint');
   const file=path.join(output,'site',rel);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes,{flag:'wx',mode:0o444});total+=bytes.length;
   entry={...entry,status:'captured',contentType:type,bytes:bytes.length,sha256:digest,provenance:'publicly-observed-live-bytes'};
  }catch(e){entry={...entry,status:'failed',errorCode:e.code||'CAPTURE_IO'};failure=entry.errorCode;}
  finally{response?.dispose?.();}
  const raw=stable(entry);previous=sha256(raw);await fs.writeFile(path.join(output,'records',String(index).padStart(3,'0')+'.json'),raw,{flag:'wx',mode:0o444});records.push({path:entry.path,sha256:previous,status:entry.status});if(failure)break;
 }
 const result={schemaVersion:1,status:failure?'partial-failure':'batch-complete',classification:'incomplete-partial-capture',productionComplete:false,deployable:false,planSHA256:pin,requests:issued,requestRecords:records.length,capturedFiles:records.filter(x=>x.status==='captured').length,responseBodyBytes:total,byteMeasurement:'Identity response bodies stored; excludes headers/TLS/buffering and is not billed egress',retries:0,concurrency:1,redirectsFollowed:0,finalRecordSHA256:previous,records,errorCode:failure};
 await fs.writeFile(path.join(output,'RESULT.json'),stable(result),{flag:'wx',mode:0o444});return result;
}
export async function verifyCapture(root,{expectedResultSHA256}){
 if(!isHash(expectedResultSHA256))fail('CAPTURE_PIN','Independent final ledger pin required');await safeRoot(root);
 const result=(await loadJSON(path.join(root,'RESULT.json'),expectedResultSHA256)).value;
 const plan=(await loadJSON(path.join(root,'plan.json'),result.planSHA256)).value;capturePlan(plan);
 if(!Array.isArray(result.records)||result.records.length>plan.requests.length)fail('CAPTURE_LEDGER','Invalid record count');
 let previous='0'.repeat(64),bytes=0,captured=0,issued=0;
 for(const [i,pin] of result.records.entries()){
  const entry=(await loadJSON(path.join(root,'records',String(i).padStart(3,'0')+'.json'),pin.sha256)).value;
  const item=plan.requests[i],rel=item.path==='/'?'index.html':item.path.slice(1)+(item.path.endsWith('/')?'index.html':'');
  if(entry.index!==i||entry.previousRecordSHA256!==previous||entry.url!==PUBLIC_ORIGIN+item.path||entry.path!==rel||pin.path!==rel||pin.status!==entry.status)fail('CAPTURE_LEDGER','Record order, origin or hash chain mismatch');
  if(typeof entry.requestIssued!=='boolean'||(entry.status==='captured'&&!entry.requestIssued))fail('CAPTURE_LEDGER','Invalid issued-request accounting');if(entry.requestIssued)issued++;
  if(entry.status==='captured'){await safeRoot(path.dirname(path.join(root,'site',rel)));const b=await readRegular(path.join(root,'site',rel));if(b.length!==entry.bytes||sha256(b)!==entry.sha256)fail('CAPTURE_LEDGER','Captured body changed');bytes+=b.length;captured++;}
  else if(entry.status!=='failed'||i!==result.records.length-1)fail('CAPTURE_LEDGER','Invalid partial-failure boundary');previous=pin.sha256;
 }
 if(previous!==result.finalRecordSHA256||bytes!==result.responseBodyBytes||captured!==result.capturedFiles||result.requests!==issued||result.requestRecords!==result.records.length||bytes>plan.limits.maxTotalBytes||result.classification!=='incomplete-partial-capture'||result.deployable!==false||result.productionComplete!==false)fail('CAPTURE_LEDGER','Final seal/count/classification mismatch');
 if(result.status==='batch-complete'?(captured!==plan.requests.length||!!result.errorCode):(result.status!=='partial-failure'||!result.errorCode||result.records.at(-1)?.status!=='failed'))fail('CAPTURE_LEDGER','Final completion/failure seal is inconsistent');
 const inv=await inventory(path.join(root,'site'));if(inv.files.length!==captured)fail('CAPTURE_LEDGER','Unexpected site files');
 return {valid:true,classification:'incomplete-partial-capture',deployable:false,capturedFiles:captured,responseBodyBytes:bytes};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [planFile,pin,output,live]=process.argv.slice(2);if(!planFile||!isHash(pin)||!output||live!=='--allow-live')fail('USAGE','capture-public.mjs PLAN SHA256 NEW_OUTPUT --allow-live');const p=(await loadJSON(planFile,pin)).value;const r=await capturePublic({plan:p,output,allowLive:true});process.stdout.write(stable(r));if(r.errorCode)process.exitCode=1;}
 catch(e){process.stdout.write(stable({status:'blocked',errorCode:e.code||'CAPTURE_IO',deployable:false}));process.exitCode=1;}
}
