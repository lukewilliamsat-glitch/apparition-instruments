import {createAdminAuth} from '../admin-auth.mjs?build=84079ed8ddb6abc6ed134bc4bc3a163da155cde4';
import {createAuthenticatedRepositoryTransport} from '../../backend/providers.mjs?v=p10g&build=84079ed8ddb6abc6ed134bc4bc3a163da155cde4';
import {boundedJSON} from '../command/bounded-json.mjs?build=84079ed8ddb6abc6ed134bc4bc3a163da155cde4';

// Existing ordinary Admin transport and actual private table. No catalogue/image reads,
// supplier details, privileged key, polling, write resource or automatic retry.
export function createCostReferenceReader({auth,request=globalThis.fetch,config}={}){
 let controller=null,used=false,disposed=false;
 return {
  async read(ids){
   if(used||disposed)throw Error('This reference lookup has already been attempted. No automatic retry is available.');
   if(!Array.isArray(ids)||!ids.length||ids.length>100||new Set(ids).size!==ids.length||!ids.every(id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(id)))throw Error('Use 1–100 supported existing component identities. Enter an evidenced cost manually for other legacy identities.');
   used=true;controller=new AbortController();const signal=controller.signal,timer=setTimeout(()=>controller.abort(),5000);let bytes=0;
   try{
    const boundedRequest=(url,options)=>request(url,{...options,signal,cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'}),currentAuth=auth||createAdminAuth({...config?{config}:{},request:boundedRequest});
    const transport=createAuthenticatedRepositoryTransport({accessToken:()=>currentAuth.accessToken({signal,bounded:true,onBytes:n=>{bytes+=n;}})},{...config?{config}:{},request:boundedRequest});
    const query='?select=component_id,internal_unit_cost,updated_at&component_id=in.('+ids.map(encodeURIComponent).join(',')+')&limit=101';
    const rows=await boundedJSON(await transport.send('component_internal',{query}),32768,{signal,onBytes:n=>{bytes+=n;}});
    if(disposed||signal.aborted)throw Error('Reference lookup cancelled.');
    if(!Array.isArray(rows)||rows.length>ids.length)throw Error('Unexpected cost reference projection.');
    const seen=new Set(),costs={};for(const row of rows){if(!ids.includes(row.component_id)||seen.has(row.component_id)||Object.keys(row).some(k=>!['component_id','internal_unit_cost','updated_at'].includes(k))||row.internal_unit_cost!==null&&(!Number.isSafeInteger(row.internal_unit_cost)||row.internal_unit_cost<0||row.internal_unit_cost>1000000000))throw Error('Invalid private cost reference.');seen.add(row.component_id);costs[row.component_id]=row.internal_unit_cost===null?null:row.internal_unit_cost*10000;}
    return {costs,requests:1,bytes,state:'estimated',basis:'Current recorded unit-cost reference; not historical acquisition or sale COGS.'};
   }finally{clearTimeout(timer);controller=null;}
  },
  dispose(){disposed=true;controller?.abort();}
 };
}
