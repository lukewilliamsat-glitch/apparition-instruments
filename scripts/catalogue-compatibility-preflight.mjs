// No CLI, default fetch, secrets or schedule. Production execution needs a newly
// approved exact plan hash; the current CI invokes only injected fixture transports.
import {createHash} from 'node:crypto';
import {technicalColumns,optionColumns} from '../dist/backend/public-read.mjs';
const target='https://acdxpxvksvdwfajntzfx.supabase.co';
export const preflightPlanHash=plan=>createHash('sha256').update(JSON.stringify(plan)).digest('hex');
export function cataloguePreflightPlan(origin=target){
 const u=new URL(origin);if(u.protocol!=='https:'||u.origin!==origin||u.username||u.password)throw Error('Invalid preflight origin');
 const metadata=technicalColumns,identities='id,image_identity,image_reference';
 return {version:1,origin,role:'anon/public publishable key',maxRequests:3,maxResponseBytes:65536,maxTotalBytes:131072,timeoutMs:8000,
  redirects:false,retries:0,contentEncoding:'identity',requests:[
   {name:'metadata',rows:20,url:origin+'/rest/v1/catalogue_delivery_v2?select='+metadata+'&order=id.asc&limit=20',columns:metadata.split(',')},
   {name:'identities',rows:20,url:origin+'/rest/v1/catalogue_delivery_v2?select='+identities+'&order=id.asc&limit=20',columns:identities.split(',')},
   {name:'options',rows:100,url:origin+'/rest/v1/catalogue_options?select='+optionColumns+'&active=eq.true&order=option_set.asc,option_key.asc&limit=100',columns:optionColumns.split(',')}
  ]};
}
const object=v=>v&&typeof v==='object'&&!Array.isArray(v),id=v=>typeof v==='string'&&/^[A-Za-z0-9-]{1,80}$/.test(v);
function publicJSON(value,depth=0){
 if(depth>10)throw Error('Unexpected metadata depth');
 if(typeof value==='string'&&(/data:image\//i.test(value)||value.length>20000))throw Error('Embedded or oversized metadata rejected');
 if(value&&typeof value==='object')for(const [k,v] of Object.entries(value)){
  if(['image','internal_unit_cost','customer','email','access_token','service_role','password','__proto__','constructor','prototype'].includes(k))throw Error('Unexpected public field');publicJSON(v,depth+1);
 }
}
export function validatePreflightRows(name,rows,columns,maxRows){
 if(!Array.isArray(rows)||rows.length>=maxRows)throw Error('Invalid, limited or truncated response');
 const ids=new Set();
 for(const row of rows){
  if(!object(row)||Object.keys(row).some(k=>!columns.includes(k))||columns.some(k=>!Object.hasOwn(row,k)))throw Error('Projection schema mismatch');publicJSON(row);
  if(name!=='options'){
   if(!id(row.id)||ids.has(row.id))throw Error('Invalid product identity');ids.add(row.id);
   if(name==='identities'){if(row.image_reference!==null||row.image_identity!==null&&!/^[a-f0-9]{64}$/.test(row.image_identity))throw Error('Unsupported source identity');}
   else{
    for(const k of ['sku','name','category','manufacturer','description'])if(typeof row[k]!=='string')throw Error('Invalid metadata text type');
    if(!object(row.specs)||!object(row.product_content)||typeof row.individually!=='boolean'||typeof row.in_kits!=='boolean'||!Number.isSafeInteger(row.stock)||row.stock<0)throw Error('Invalid public catalogue type');
    for(const k of ['sale_price','kit_price','kit_price_quantity'])if(row[k]!==null&&(!Number.isSafeInteger(row[k])||row[k]<0))throw Error('Invalid public price/quantity');
   }
  }else{
   const key=row.option_set+' '+row.option_key;
   if(!id(row.option_set.replaceAll('_','-'))||!id(row.option_key?.replaceAll?.('_','-'))||typeof row.label!=='string'||!Array.isArray(row.aliases)||row.aliases.some(a=>typeof a!=='string')||row.active!==true||!Number.isSafeInteger(row.sort_order)||ids.has(key))throw Error('Invalid public option');ids.add(key);
  }
 }
 return rows;
}
function publicKey(key){
 if(typeof key!=='string')return false;
 if(/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))return true;
 try{return key.split('.').length===3&&JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='anon';}catch{return false;}
}
export async function runCataloguePreflight({plan=cataloguePreflightPlan(),request,publicKey:key,approval}={}){
 if(typeof request!=='function'||!publicKey(key))throw Error('Injected transport and public-only key required');
 if(JSON.stringify(plan)!==JSON.stringify(cataloguePreflightPlan(plan.origin)))throw Error('Unreviewed preflight plan');
 const fixture=new URL(plan.origin).hostname.endsWith('.invalid');
 if(!fixture&&(plan.origin!==target||approval?.scope!=='BLACKBOX34_READ_ONLY_PREFLIGHT'||approval.planSHA256!==preflightPlanHash(plan)))throw Error('Separate production approval required');
 let total=0;const result=[],records={};
 for(const step of plan.requests){
  const started=performance.now(),controller=new AbortController();let timer;
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Preflight timeout'));},plan.timeoutMs);});
  try{
   const operation=(async()=>{
    const response=await request(step.url,{method:'GET',redirect:'error',credentials:'omit',cache:'no-store',signal:controller.signal,headers:{apikey:key,Accept:'application/json','Accept-Encoding':'identity'}});
    if(response.status!==200||response.redirected)throw Error('Preflight HTTP '+response.status);
    if(response.headers.get('content-type')?.split(';')[0]!=='application/json'||!['', 'identity'].includes(response.headers.get('content-encoding')||''))throw Error('Unsupported response encoding/type');
    const declared=response.headers.get('content-length');if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>plan.maxResponseBytes))throw Error('Encoded byte budget exceeded');
    const range=response.headers.get('content-range');if(range&&/\/\d+$/.test(range)&&Number(range.split('/')[1])>=step.rows)throw Error('Response row limit reached');
    if(!response.body)throw Error('Missing response body');const reader=response.body.getReader(),chunks=[];let size=0;
    const cancel=()=>{void reader.cancel().catch(()=>{});};controller.signal.addEventListener('abort',cancel,{once:true});
    try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;total+=value.length;if(size>plan.maxResponseBytes||total>plan.maxTotalBytes)throw Error('Response byte budget exceeded');chunks.push(value);}}
    finally{controller.signal.removeEventListener('abort',cancel);await reader.cancel().catch(()=>{});reader.releaseLock();}
    if(declared!==null&&Number(declared)!==size)throw Error('Truncated response');
    const bytes=Buffer.concat(chunks);const rows=validatePreflightRows(step.name,JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),step.columns,step.rows);
    records[step.name]=rows;return {name:step.name,rows:rows.length,bodyBytes:size,elapsedMs:performance.now()-started};
   })();
   result.push(await Promise.race([operation,deadline]));
  }finally{clearTimeout(timer);controller.abort();}
 }
 const ids=records.metadata.map(r=>r.id).sort();if(JSON.stringify(ids)!==JSON.stringify(records.identities.map(r=>r.id).sort()))throw Error('Catalogue changed between bounded requests');
 const manufacturers=new Set(records.options.filter(r=>r.option_set==='manufacturer').map(r=>r.option_key));
 for(const row of records.metadata)if(row.product_content.manufacturerKey&&!manufacturers.has(row.product_content.manufacturerKey))throw Error('Missing public manufacturer option relationship');
 return {status:'PASS',planSHA256:preflightPlanHash(plan),requests:result,totalBodyBytes:total,production:!fixture,
  limitations:['Response checks cannot establish live grants, RLS, security_invoker or database execution cost.','Identity request elapsed time is round-trip observation, not a database query plan or billing attribution.']};
}
