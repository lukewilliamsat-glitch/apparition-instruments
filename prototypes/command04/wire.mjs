// Reuse COMMAND03 read/session boundary and COMMAND01/02 presentation contracts.
import {createFixtureWire} from '../command03/fixture-wire.mjs';
import {hints} from '../command03/contracts.mjs';
import {createIroncladServer} from './server.mjs';
export function createIroncladWire({count=14,now=Date.now,checkpoint}={}){
 const base=createFixtureWire({count,delay:0,now}),plans={save:[],status:[]};
 const server=createIroncladServer({count,now,checkpoint,authority:{kind:'command04-fixture-authority',authorize:s=>base.transport.authorize(s)}});
 async function planned(kind,context,normal){const p=plans[kind].shift();return p?p({...context,normal}):normal();}
 const transport={kind:'command03-fixture-wire',authorize:base.transport.authorize,
  async send(resource,options){
   const response=await base.transport.send(resource,options),rows=await response.json(),mapped=[],versions={};
   for(const row of rows){const id=resource==='inventory'?row.component_id:row.id,r=await server.read(id,{session:options.session});versions[id]=r.revision;
    if(resource==='inventory')mapped.push({...row,quantity:r.stock,stock_unit:r.stockUnit});
    else{const specs={...Object.fromEntries(Object.entries(hints).filter(([k])=>r.technicalSpecs?.[k]).map(([k,v])=>[v,r.technicalSpecs[k]])),...r.specs};const full={id:r.id,sku:r.sku,name:r.name,category:r.category,manufacturer:r.manufacturer??'',active:r.active,individually:r.individually,in_kits:r.inKits,sale_price:r.salePrice??null,kit_price:r.kitPrice??null,kit_price_quantity:r.kitPriceQuantity??null,updated_at:'2026-01-01T00:00:00Z',description:r.description,specs};for(const [k,v]of Object.entries(hints))full[k]=specs[v]??null;mapped.push(Object.fromEntries(Object.keys(row).map(k=>[k,full[k]])));}
   }
   return {...response,fixtureVersions:versions,json:async()=>structuredClone(mapped)};
  },
  save:(command,{session}={})=>planned('save',{command,session},()=>server.mutate({protocol:'command04-v1',...command},{session})),
  status:(operationId,{session}={})=>planned('status',{operationId,session},()=>server.status(operationId,{session}))
 };
 return {...base,transport,server,inspect:server.inspect,actorModify:server.actorModify,
  enqueue(kind,plan){if(plans[kind])plans[kind].push(plan);else base.enqueue(kind,plan);}
 };
}
