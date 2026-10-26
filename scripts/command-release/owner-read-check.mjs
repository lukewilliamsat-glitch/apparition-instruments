// Inert until called by the owner after the separately bounded live-read approval.
// Existing session tokens stay in the owner's browser and go only to their own
// verified project. No credentials, product rows, IDs or private values are output.
import {publicBackendConfig} from '../../dist/backend/public-config.mjs';
import {createAdminAuth} from '../../dist/admin/admin-auth.mjs';
import {createProductionReadAdapter} from '../../dist/admin/command/production-read.mjs';
import {createReadBoundary} from '../../dist/admin/command/read-boundary.mjs';
let attempted=false;
export async function ownerReadCheck({approvalRef,metadataSHA256,origin,inventoryRead=false,sourceCommit}={},runtime=globalThis){
 let boundary,timer,gets=0,refreshes=0;
 const report={status:'HOLD',approvalRef:null,sourceCommit:sourceCommit||null,projectRef:publicBackendConfig.url.split('//')[1].split('.')[0],checkedAt:new Date().toISOString(),ownerOperated:true,independentlyObservedByAssistant:false,productionWrites:false,requests:0,authRefreshes:0};
 try{
  if(typeof approvalRef!=='string'||!/^[A-Za-z0-9_:-]{1,120}$/.test(approvalRef)||!/^[a-f0-9]{64}$/.test(metadataSHA256||'')||!/^[a-f0-9]{40}$/.test(sourceCommit||''))throw Object.assign(Error(),{code:'APPROVAL_REQUIRED'});
  report.approvalRef=approvalRef;
  if(typeof origin!=='string'||!/^https:\/\/[^/]+$/.test(origin)||runtime.location?.origin!==origin)throw Object.assign(Error(),{code:'ORIGIN_MISMATCH'});
  if(attempted)throw Object.assign(Error(),{code:'ALREADY_ATTEMPTED_NO_RETRY'});attempted=true;report.origin=origin;
  const target=new URL(publicBackendConfig.url),request=async(url,options={})=>{
   const u=new URL(url),method=options.method||'GET';
   if(u.origin!==target.origin)throw Object.assign(Error(),{code:'REQUEST_SCOPE'});
   if(method==='POST'){
    if(u.pathname!=='/auth/v1/token'||u.searchParams.get('grant_type')!=='refresh_token'||refreshes>=1)throw Object.assign(Error(),{code:'REQUEST_SCOPE'});
    refreshes++;
   }else if(method!=='GET'||!['/auth/v1/user','/rest/v1/admin_members','/rest/v1/components','/rest/v1/inventory'].includes(u.pathname)||gets>=8)throw Object.assign(Error(),{code:'REQUEST_SCOPE'});
   else gets++;
   report.requests=gets+refreshes;report.authRefreshes=refreshes;
   return runtime.fetch(url,{...options,credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer'});
  };
  const auth=createAdminAuth({request,storage:runtime.localStorage}),adapter=createProductionReadAdapter({auth,request,events:runtime,activation:{enabled:true,inventoryRead:inventoryRead===true}});
  boundary=createReadBoundary({auth,adapter});timer=setTimeout(()=>boundary.lock('expired'),25000);
  const rows=await boundary.catalogueTransport.list();
  if(rows.length===0)throw Object.assign(Error(),{code:'EMPTY_NO_DETAIL_EVIDENCE'});
  const detail=await boundary.readProduct(rows[0].id);if(detail.id!==rows[0].id)throw Object.assign(Error(),{code:'IDENTITY'});
  const metrics=adapter.metrics();if(metrics.decodedBytes>768*1024)throw Object.assign(Error(),{code:'BOUNDS'});
  return {...report,status:'PASS_READ_COMPATIBILITY_OWNER_OPERATED',catalogueRows:rows.length,detailVerified:true,serverIdentityAndMembershipVerified:true,inventoryRead:inventoryRead===true,decodedJSONBytes:metrics.decodedBytes,responseBytes:metrics.responseBytes,scope:'One bounded catalogue and one product detail; no record values exported.',metadataSHA256};
 }catch(error){return {...report,code:typeof error?.code==='string'?error.code:'READ_UNVERIFIED'};}
 finally{clearTimeout(timer);boundary?.destroy();}
}
