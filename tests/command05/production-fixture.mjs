// Fictional HTTP-shaped service for the real Auth and read adapter. Never imported by dist.
import {createAdminAuth,adminAuthSessionKey} from '../../dist/admin/admin-auth.mjs';
import {createProductionReadAdapter} from '../../dist/admin/command/production-read.mjs';
import {fixtureRecords} from './catalogue-fixtures.mjs';
export const fixtureConfig=Object.freeze({url:'https://command54-fixture-only.supabase.co',publishableKey:'sb_publishable_fictional_fixture_only'});
const member='00000000-0000-4000-8000-000000000054';
const labels={resistance:'Resistance',taper:'Taper',tolerance:'Tolerance',capacitance:'Value',voltage:'Voltage',shaft:'Shaft',connection:'Topology'};
const encode=value=>btoa(JSON.stringify(value)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const jwt=(sub,exp)=>encode({alg:'fixture-only'})+'.'+encode({sub,exp,role:'authenticated',user_metadata:{role:'admin'}})+'.fixture-signature';
export const jsonReply=(value,{status=200,range,...headers}={})=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json',...range===undefined?{}:{'content-range':range},...headers}});
export function createProductionFixture({count=14,now=Date.now,storage,events=new EventTarget(),inventory=true,requestOverride}={}){
 const map=new Map();storage??={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};
 const records=Array.from({length:count},(_,i)=>{const r=fixtureRecords[i%14],suffix=i<14?'':'-'+i;return {id:r.id+suffix,sku:r.sku+suffix,name:r.name,category:r.category,manufacturer:r.manufacturer,active:r.active,individually:r.individually,in_kits:r.inKits,sale_price:r.salePrice??null,kit_price:r.kitPrice??null,kit_price_quantity:r.kitPriceQuantity??null,updated_at:'2026-10-25T00:00:00Z',description:r.description,specs:{...Object.fromEntries(Object.entries(r.technicalSpecs||{}).map(([k,v])=>[labels[k],v])),Series:'Fixture Series',Reference:'FIXTURE-ONLY'},_quantity:r.stock??0,_unit:r.stockUnit==='metre'?'m':'item'};});
 const calls=[];let memberAllowed=true,hook=null,tokenSubject=member,expiry=Math.floor(now()/1000)+3600;
 const renew=()=>storage.setItem(adminAuthSessionKey,JSON.stringify({access_token:jwt(tokenSubject,expiry),refresh_token:'fixture-only-refresh',expires_at:Math.floor(now()/1000)+3600}));renew();
 const normal=(url,options={})=>{
  const u=new URL(url);if(u.origin!==fixtureConfig.url)throw Error('Fictional service origin mismatch.');
  const path=u.pathname;
  if(path==='/auth/v1/user')return jsonReply({id:member});
  if(path==='/auth/v1/token')return jsonReply({access_token:jwt(tokenSubject,Math.floor(now()/1000)+3600),refresh_token:'fixture-only-refresh',expires_in:3600});
  if(path==='/auth/v1/logout')return new Response(null,{status:204});
  if(path==='/rest/v1/admin_members')return jsonReply(memberAllowed?[{user_id:member}]:[]);
  if(!['/rest/v1/components','/rest/v1/inventory'].includes(path)||(options.method||'GET')!=='GET')throw Error('Unexpected fictional read resource.');
  const productId=(u.searchParams.get('id')||u.searchParams.get('component_id'))?.replace(/^eq\./,'');
  const selected=productId?records.filter(r=>r.id===productId):records;
  const detail=u.searchParams.get('select')?.split(',').includes('description');
  const projected=selected.slice(0,Number(u.searchParams.get('limit'))).map(r=>{
   if(path.endsWith('/inventory'))return {component_id:r.id,quantity:r._quantity,stock_unit:r._unit};
   const {_quantity,_unit,description,specs,...base}=r;
   return detail?{...base,description,specs}:{...base,...Object.fromEntries(Object.entries(labels).map(([key,label])=>[key,specs[label]??null]))};
  });
  return jsonReply(projected,{range:projected.length?'0-'+(projected.length-1)+'/'+selected.length:'*/'+selected.length});
 };
 const request=async(url,options={})=>{
  const u=new URL(url);calls.push({method:options.method||'GET',path:u.pathname,query:u.searchParams.toString(),signal:options.signal});
  if(hook){const response=await hook({url:u,options,normal:()=>normal(url,options)});if(response!==undefined)return response;}
  return requestOverride?requestOverride(url,options):normal(url,options);
 };
 const auth=createAdminAuth({config:fixtureConfig,request,storage,now});
 const adapter=createProductionReadAdapter({auth,config:fixtureConfig,request,activation:{enabled:true,inventoryRead:inventory},events,now});
 return {auth,adapter,calls,records,storage,events,request,normal,hook(fn){hook=fn;},setMember(value){memberAllowed=value;},setTokenSubject(value){tokenSubject=value;renew();},setExpiry(value){expiry=value;renew();},clear(){storage.removeItem(adminAuthSessionKey);const event=new Event('storage');Object.defineProperty(event,'key',{value:adminAuthSessionKey});events.dispatchEvent(event);}};
}
