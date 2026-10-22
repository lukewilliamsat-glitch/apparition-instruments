import {createPersistenceFixture,recordsFor} from '../command02/persistence.mjs';
import {BridgeError,hints,summaryColumns,detailColumns,inventoryColumns,idOf} from './contracts.mjs';
const clone=v=>structuredClone(v),wait=ms=>new Promise(r=>setTimeout(r,ms));
export function createFixtureWire({count=14,delay=5,now=Date.now}={}){
 const store=createPersistenceFixture({count,delay:0}),sessions=new Map(),owners=new Map(),plans={authorize:[],send:[],save:[],status:[]},calls=[];let serial=0;
 const denial=()=>new BridgeError('PERMISSION','Fixture authority denied this operation.');
 function grant(session,capability){
  const g=sessions.get(session?.token);
  if(!g||g.revoked)throw new BridgeError('REVOKED','The synthetic session was revoked.');
  if(g.subject!==session.subject)throw denial();
  if(g.expiresAt<=now())throw new BridgeError('EXPIRED','The synthetic session expired.');
  if(capability&&!g.capabilities[capability])throw denial();return g;
 }
 const fixtureRow=r=>({id:r.id,sku:r.sku,name:r.name,category:r.category,manufacturer:r.manufacturer??'',active:r.active,individually:r.individually,in_kits:r.inKits,sale_price:r.salePrice??null,kit_price:r.kitPrice??null,kit_price_quantity:r.kitPriceQuantity??null,updated_at:'2026-01-01T00:00:00Z',description:r.description,specs:{...Object.fromEntries(Object.entries(hints).filter(([key])=>r.technicalSpecs?.[key]).map(([key,target])=>[target,r.technicalSpecs[key]])),...r.specs}});
 const response=(rows,revisions={})=>{calls.push({kind:'response',rows:rows.length,rawBytes:new TextEncoder().encode(JSON.stringify(rows)).length,imageBytes:0});return {ok:true,status:200,fixtureVersions:clone(revisions),json:async()=>clone(rows)};};
 async function planned(kind,context,normal){const plan=plans[kind].shift();if(plan)return typeof plan==='function'?plan({...context,normal}):Promise.reject(plan);await wait(delay);return normal();}
 const transport=Object.freeze({kind:'command03-fixture-wire',
  async authorize(session,{signal}={}){calls.push({kind:'authorize'});return planned('authorize',{session,signal},()=>{if(signal?.aborted)throw new DOMException('Cancelled','AbortError');return clone(grant(session));});},
  async send(resource,{method='GET',query,session,signal}={}){
   calls.push({kind:'send',resource,method,query});
   if(method!=='GET'||!['components','inventory'].includes(resource))throw denial();
   return planned('send',{resource,query,session,signal},()=>{
    if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
    const u=new URLSearchParams(query?.replace(/^\?/,''));
    const isDetail=u.has('id')||(resource==='inventory'&&(u.get('component_id')??'').startsWith('eq.'));grant(session,isDetail?'productRead':'catalogueRead');
    const limit=Number(u.get('limit')),offset=Number(u.get('offset')??0);
    if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0||offset>500||u.get('order')!==(resource==='components'?'id.asc':'component_id.asc'))throw new BridgeError('INVALID','Fixture request is not bounded.');
    const data=allRecords();
    if(resource==='components'){
     const columns=u.get('select');if(columns!==(isDetail?detailColumns:summaryColumns))throw new BridgeError('INVALID','Unexpected component projection.');
     let selected=data.sort((a,b)=>a.id.localeCompare(b.id));
     if(isDetail){const filter=u.get('id');if(!filter.startsWith('eq.'))throw denial();selected=selected.filter(r=>r.id===idOf(filter.slice(3)));}
     selected=selected.slice(offset,offset+limit);const versions=Object.fromEntries(selected.map(r=>[r.id,r.revision]));
     return response(selected.map(r=>{const row=fixtureRow(r);if(isDetail)return row;const base=Object.fromEntries(summaryColumns.split(',').filter(x=>!x.includes(':')).map(k=>[k,row[k]]));for(const [key,target]of Object.entries(hints))base[key]=row.specs[target]??null;return base;}),versions);
    }
    if(u.get('select')!==inventoryColumns)throw denial();
    const filter=u.get('component_id')??'';let ids;
    if(filter.startsWith('in.(')&&filter.endsWith(')'))ids=filter.slice(4,-1).split(',').map(idOf);
    else if(filter.startsWith('eq.'))ids=[idOf(filter.slice(3))];else throw denial();
    if(ids.length>100)throw denial();return response(data.filter(r=>ids.includes(r.id)).map(r=>({component_id:r.id,quantity:r.stock??0,stock_unit:r.stockUnit})).sort((a,b)=>a.component_id.localeCompare(b.component_id)).slice(0,limit));
   });
  },
  async save(command,{session}={}){
   calls.push({kind:'save',id:command.id,operationId:command.operationId});
   return planned('save',{command,session},()=>{
    grant(session,'productWrite');grant(session,'productRead');
    const owner=owners.get(command.operationId);if(owner&&owner!==session.subject)throw denial();owners.set(command.operationId,session.subject);
    // The reused store rechecks the same authority immediately before its commit.
    store.enqueue('save',()=>{grant(session,'productWrite');grant(session,'productRead');});
    return store.persistence.save(command);
   });
  },
  async status(operationId,{session}={}){calls.push({kind:'status',operationId});return planned('status',{operationId,session},()=>{grant(session,'productRead');if(owners.has(operationId)&&owners.get(operationId)!==session.subject)throw denial();return store.persistence.status(operationId);});}
 });
 let knownIds=[];function resetIds(){knownIds=recordsFor(count).map(r=>r.id);}
 function allRecords(){return knownIds.flatMap(id=>{try{return[store.inspect(id)];}catch{return[];}});}resetIds();
 return{transport,store,calls,
  issue({subject='fixture-operator-a',read=true,detail=read,write=true,ttl=3600000}={}){const session={token:'COMMAND03_FIXTURE_ONLY_'+(++serial),subject,expiresAt:now()+ttl};sessions.set(session.token,{subject,sessionId:'fixture-session-'+serial,expiresAt:session.expiresAt,revoked:false,capabilities:{catalogueRead:read,productRead:detail,productWrite:write}});return clone(session);},
  revoke(session){const g=sessions.get(session.token);if(g)g.revoked=true;},
  permissions(session,patch){const g=sessions.get(session.token);if(g)Object.assign(g.capabilities,patch);},
  enqueue(kind,plan){if(!plans[kind])throw Error('Unknown wire fault.');plans[kind].push(plan);},
  resetCatalogue(size){count=size;store.replaceCatalogue(size);resetIds();},
  inspect:id=>store.inspect(id),actorModify:(id,patch)=>store.actorModify(id,patch)
 };
}
